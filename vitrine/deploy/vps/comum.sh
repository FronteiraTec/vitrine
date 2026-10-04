#!/usr/bin/env bash
# Variáveis daqui são usadas pelos scripts que fazem `source` deste arquivo.
# shellcheck disable=SC2034
# =============================================================================
# Variáveis e funções comuns aos scripts da Vitrine na VPS. Não roda sozinho:
# os outros scripts fazem `source` dele.
#
# Tudo o que pertence à Vitrine no servidor:
#
#   /opt/vitrine/              pasta do sistema (usuário `vitrine`)
#   ├── app/                   clone do repositório, no commit que está no ar
#   ├── .env                   configuração e senhas de produção (chmod 600)
#   ├── bin/entrada-ssh.sh     o único comando que o GitHub Actions pode rodar
#   ├── estado/atual           commit no ar · estado/anterior: o de antes
#   ├── backups/               dumps do banco e cópias dos arquivos enviados
#   └── deploys.log            histórico de deploys
#
#   Docker: projeto `vitrine` — containers vitrine-*, volumes vitrine_*,
#   rede vitrine_default, label com.fronteiratec.sistema=vitrine.
# =============================================================================

set -Eeuo pipefail

RAIZ=${VITRINE_RAIZ:-/opt/vitrine}
CLONE="$RAIZ/app"
APP="$CLONE/vitrine"
ENV_FILE="$RAIZ/.env"
ESTADO="$RAIZ/estado"
BACKUPS="$RAIZ/backups"
HISTORICO="$RAIZ/deploys.log"

# Sempre a partir da pasta do sistema: chamado via sudo, o diretório atual
# seria o de quem chamou (/root), que o usuário vitrine nem consegue ler — e o
# docker compose falha ao validar o projeto.
cd "$RAIZ" 2>/dev/null || cd /

# Lê uma variável do .env de produção sem executar o arquivo.
env_var() {
  local nome=$1 padrao=${2:-}
  local valor
  valor=$(grep -E "^${nome}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)
  printf '%s' "${valor:-$padrao}"
}

PREFIXO=$(env_var VITRINE_IMAGE_PREFIX ghcr.io/fronteiratec/vitrine)
BORDA_CONTAINER=$(env_var BORDA_CONTAINER quiron-proxy-caddy-1)

# docker compose sempre com o projeto, o .env e a sobreposição do servidor.
dc() {
  docker compose --project-name vitrine --project-directory "$APP" --env-file "$ENV_FILE" \
    -f "$APP/docker-compose.yml" -f "$APP/deploy/compose.vps.yml" "$@"
}

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
aviso() { printf '[%s] AVISO: %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }
falha() { printf '[%s] ERRO: %s\n' "$(date '+%H:%M:%S')" "$*" >&2; exit 1; }

curto() { printf '%s' "${1:0:7}"; }
commit_atual() { cat "$ESTADO/atual" 2>/dev/null || true; }
commit_anterior() { cat "$ESTADO/anterior" 2>/dev/null || true; }

registrar() {
  # data · resultado · commit · detalhe
  printf '%s  %-10s %s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" "${3:-}" >> "$HISTORICO"
}

# Os scripts rodam como `vitrine`. Chamado como root (manutenção à mão), troca
# de usuário: o clone e os arquivos pertencem a ele, e o git recusaria um
# repositório de outro dono.
como_vitrine() {
  if [ "$(id -un)" != "vitrine" ]; then
    [ "$(id -u)" = "0" ] || falha "rode como o usuário vitrine (ou como root)."
    exec sudo -u vitrine -H -- "$@"
  fi
}
