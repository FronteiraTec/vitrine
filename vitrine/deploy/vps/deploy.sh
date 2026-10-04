#!/usr/bin/env bash
# =============================================================================
# Coloca no ar um commit da Vitrine. É o que o GitHub Actions dispara a cada
# push na main — e o que você pode rodar à mão na VPS, se precisar.
#
#   deploy.sh <sha-de-40-caracteres> [--sem-pull]
#
#   --sem-pull   as imagens já estão na VPS (rollback, ou carregadas à mão
#                com `docker load`): não baixa nada do registry
#
# Etapas — qualquer falha para o deploy, e o site anterior continua no ar:
#
#   1. trava          um deploy por vez
#   2. código         o clone vai para o commit (compose e scripts daquela versão)
#   3. imagens        baixa vitrine-api e vitrine-web com a tag = commit
#   4. migrations     há pendente? backup do banco → aplica TODAS numa transação
#                     (falhou: nada foi aplicado, o app antigo nem foi tocado)
#   5. troca          sobe api e web novos e espera ficarem saudáveis
#   6. verificação    a API responde pronta, na versão nova, e a borda alcança o site
#                     (falhou: volta sozinho para as imagens anteriores)
#   7. registro       estado/atual, estado/anterior, deploys.log; limpa imagens velhas
#
# Para baixar imagens privadas do registry, o token chega por variável
# (GHCR_TOKEN), passado pelo entrada-ssh.sh. Ele é usado só aqui, num
# diretório de credenciais temporário, e apagado no fim.
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"
como_vitrine "$0" "$@"

main() {
  local sha=${1:-} sem_pull=0
  [[ $sha =~ ^[0-9a-f]{40}$ ]] || falha "uso: deploy.sh <sha de 40 caracteres> [--sem-pull]"
  [ "${2:-}" = "--sem-pull" ] && sem_pull=1
  [ -f "$ENV_FILE" ] || falha "$ENV_FILE não existe — rode o deploy/vps/instalar.sh primeiro."

  # 1. trava -----------------------------------------------------------------
  mkdir -p "$ESTADO"
  exec 9>"$ESTADO/deploy.lock"
  flock -n 9 || falha "outro deploy está em andamento."

  local anterior
  anterior=$(commit_atual)

  # 2. código ----------------------------------------------------------------
  # O repositório é público: o clone busca sem credencial. Trocar de commit
  # e se reexecutar faz o restante deste deploy rodar com os scripts DAQUELA
  # versão — inclusive correções neles.
  if [ "$(git -C "$CLONE" rev-parse HEAD)" != "$sha" ]; then
    git -C "$CLONE" cat-file -e "$sha^{commit}" 2>/dev/null || git -C "$CLONE" fetch --quiet origin
    git -C "$CLONE" checkout --quiet --force "$sha" || falha "commit $sha não encontrado no repositório."
    exec 9>&-
    exec "$APP/deploy/vps/deploy.sh" "$@"
  fi

  log "deploy de $(curto "$sha") — no ar agora: $(curto_ou "$anterior" "nenhuma versão")"

  # 3. imagens ---------------------------------------------------------------
  local api="$PREFIXO-api:$sha" web="$PREFIXO-web:$sha"
  if [ "$sem_pull" = 0 ]; then
    baixar_imagens "$api" "$web"
  fi
  docker image inspect "$api" >/dev/null 2>&1 || falha "imagem $api não está na VPS."
  docker image inspect "$web" >/dev/null 2>&1 || falha "imagem $web não está na VPS."

  export VITRINE_TAG=$sha

  # 4. migrations ------------------------------------------------------------
  dc up -d --wait db >/dev/null

  local situacao=0
  dc run --rm --no-deps migrate node server/src/migrate.js --check || situacao=$?
  case $situacao in
    0) ;;
    10)
      log "há migrations pendentes — backup do banco antes de aplicar"
      "$APP/deploy/vps/backup.sh" "antes-de-$(curto "$sha")"
      ;;
    *)
      registrar falhou "$sha" "história das migrations quebrada"
      falha "a história das migrations está quebrada (veja acima). Nada foi alterado."
      ;;
  esac

  # Roda sempre: sem pendentes, só confere permissões e a senha do papel da API.
  if ! dc run --rm --no-deps migrate; then
    registrar falhou "$sha" "migration falhou; nada aplicado"
    falha "migration falhou e foi desfeita. O banco e o site continuam como estavam."
  fi

  # 5. troca -----------------------------------------------------------------
  log "subindo api e web $(curto "$sha")"
  local ok=1
  dc up -d --no-deps --no-build --wait --wait-timeout 120 api web || ok=0

  # 6. verificação -----------------------------------------------------------
  if [ "$ok" = 1 ] && verificar "$sha"; then
    concluir "$sha" "$anterior"
    return 0
  fi

  aviso "a versão $(curto "$sha") não ficou saudável."
  dc logs --tail 40 api web || true

  if [ -n "$anterior" ] && [ "$anterior" != "$sha" ]; then
    log "voltando para $(curto "$anterior")"
    git -C "$CLONE" checkout --quiet --force "$anterior"
    VITRINE_TAG=$anterior dc up -d --no-deps --no-build --wait --wait-timeout 120 api web \
      && registrar revertido "$sha" "voltou para $(curto "$anterior")" \
      || registrar falhou "$sha" "e a volta para $(curto "$anterior") também falhou"
    falha "deploy de $(curto "$sha") desfeito; $(curto "$anterior") segue no ar."
  fi

  registrar falhou "$sha" "primeira versão, sem anterior para voltar"
  falha "a primeira versão não subiu — veja os logs acima."
}

baixar_imagens() {
  local credenciais=""
  if [ -n "${GHCR_TOKEN:-}" ]; then
    # Credencial temporária, num diretório só deste deploy: nada fica gravado
    # em ~/.docker depois que ele termina.
    credenciais=$(mktemp -d)
    # EXIT, e não RETURN: uma falha no meio sai pelo `exit` e precisa limpar igual.
    # shellcheck disable=SC2064 # expandir agora é o objetivo
    trap "rm -rf '$credenciais'" EXIT
    printf '%s' "$GHCR_TOKEN" | DOCKER_CONFIG=$credenciais docker login ghcr.io \
      -u "${GHCR_USER:-github-actions}" --password-stdin >/dev/null \
      || falha "o registry recusou o token."
  fi
  local imagem
  for imagem in "$@"; do
    log "baixando $imagem"
    DOCKER_CONFIG=${credenciais:-${DOCKER_CONFIG:-$HOME/.docker}} docker pull --quiet "$imagem" >/dev/null \
      || falha "não foi possível baixar $imagem."
  done
}

verificar() {
  local sha=$1 resposta

  # A API: pronta (banco ok, nenhuma migration pendente) e na versão certa.
  resposta=$(dc exec -T api wget -qO- http://127.0.0.1:3000/api/health/ready 2>/dev/null || true)
  if [[ $resposta != *'"ok":true'* || $resposta != *"\"version\":\"$sha\""* ]]; then
    aviso "API não está pronta na versão nova: ${resposta:-sem resposta}"
    return 1
  fi
  log "API pronta: $(curto "$sha"), banco ok, nenhuma migration pendente"

  # O caminho que o visitante faz: a borda Caddy alcança o `web` pela rede.
  if docker inspect "$BORDA_CONTAINER" >/dev/null 2>&1; then
    resposta=$(docker exec "$BORDA_CONTAINER" wget -qO- http://vitrine-web/version.json 2>/dev/null || true)
    if [[ $resposta != *"$sha"* ]]; then
      aviso "a borda ($BORDA_CONTAINER) não alcança vitrine-web na versão nova: ${resposta:-sem resposta}"
      return 1
    fi
    log "a borda alcança o site em $(curto "$sha")"
  else
    aviso "container da borda ($BORDA_CONTAINER) não encontrado — verificação pela borda pulada."
  fi
  return 0
}

concluir() {
  local sha=$1 anterior=$2
  if [ "$anterior" != "$sha" ]; then
    [ -n "$anterior" ] && printf '%s\n' "$anterior" > "$ESTADO/anterior"
    printf '%s\n' "$sha" > "$ESTADO/atual"
  fi
  registrar "${VITRINE_OPERACAO:-ok}" "$sha" "${anterior:+anterior $(curto "$anterior")}"

  # A base de localização sobe junto quando há conta da MaxMind no .env.
  if [ -n "$(env_var GEOIP_ACCOUNT_ID)" ]; then
    dc --profile geoip up -d geoipupdate >/dev/null || aviso "geoipupdate não subiu."
  fi

  limpar_imagens "$sha" "$(commit_anterior)"
  log "deploy de $(curto "$sha") concluído."
}

# Mantém só as imagens da Vitrine do commit atual e do anterior (para rollback
# sem rede). Nunca toca em imagem de outro sistema.
limpar_imagens() {
  local manter=" $1 $2 " repo tag
  for repo in "$PREFIXO-api" "$PREFIXO-web"; do
    docker image ls "$repo" --format '{{.Tag}}' | while read -r tag; do
      [[ $manter == *" $tag "* ]] || docker image rm "$repo:$tag" >/dev/null 2>&1 || true
    done
  done
}

main "$@"
exit $?
