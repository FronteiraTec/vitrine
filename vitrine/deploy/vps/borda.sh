#!/usr/bin/env bash
# =============================================================================
# Instala (ou atualiza) o bloco da Vitrine na borda Caddy compartilhada da VPS
# — o container que atende 80/443 e emite os certificados de todos os sistemas.
# Roda como ROOT, uma vez, e de novo só se o bloco mudar.
#
#   borda.sh             confere o DNS antes (o Let's Encrypt precisa dele)
#   borda.sh --simular   mostra o que mudaria e valida, sem tocar na borda
#   borda.sh --forcar    instala mesmo sem o DNS apontando para cá
#
# O bloco vem de deploy/caddy/vitrine.caddy, com o domínio de SITE_URL, e
# fica entre os marcadores `# >>> VITRINE` e `# <<< VITRINE`: rodar de novo
# substitui o bloco, nunca duplica.
#
# Cuidados, porque o Caddyfile é de todos:
#   • o arquivo novo é validado DENTRO da borda (mesmo Caddy, mesmas
#     variáveis de ambiente), numa cópia temporária, antes de substituir o
#     que está em uso — inválido, nada muda;
#   • cópia do arquivo em uso antes de mexer, em /opt/vitrine/backups;
#   • escrita NO MESMO arquivo (mesmo inode): o container monta o arquivo
#     sozinho, e um arquivo novo no lugar não seria visto por ele;
#   • `caddy reload` a quente: os outros sites não piscam. Recusado, o
#     arquivo original volta e a borda segue com a configuração de antes.
#
# O Caddyfile da borda mora hoje dentro do clone do Quiron
# (/opt/quiron/prod/proxy). Um deploy do Quiron que mude esse arquivo faz
# `git reset --hard` ali e apaga os blocos acrescentados à mão — o do Desafio
# e este. O status.sh avisa quando o bloco some; este script o recoloca.
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"

[ "$(id -u)" = "0" ] || falha "rode como root: sudo $0"

modo=aplicar
case ${1:-} in
  "") ;;
  --simular) modo=simular ;;
  --forcar) modo=forcar ;;
  *) falha "uso: borda.sh [--simular | --forcar]" ;;
esac

CADDYFILE=$(env_var BORDA_CADDYFILE /opt/quiron/prod/proxy/Caddyfile)
MODELO="$APP/deploy/caddy/vitrine.caddy"
DOMINIO=$(env_var SITE_URL | sed -E 's#^https?://##; s#/.*$##')

[ -f "$CADDYFILE" ] || falha "Caddyfile da borda não encontrado em $CADDYFILE (defina BORDA_CADDYFILE no .env)."
[ -n "$DOMINIO" ] || falha "SITE_URL vazio em $ENV_FILE."
docker inspect "$BORDA_CONTAINER" >/dev/null 2>&1 || falha "container da borda $BORDA_CONTAINER não está rodando."

# DNS: sem o registro apontando para cá, o Let's Encrypt não emite o
# certificado, e tentativas repetidas contam no limite dele.
ip_servidor=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
resolvido=$(getent ahostsv4 "$DOMINIO" | awk '{print $1}' | sort -u | tr '\n' ' ' || true)
if [[ " $resolvido " != *" $ip_servidor "* ]]; then
  if [ "$modo" = aplicar ]; then
    falha "$DOMINIO aponta para '${resolvido:-nada}', não para este servidor ($ip_servidor). Crie o registro A e rode de novo (ou use --forcar)."
  fi
  aviso "$DOMINIO ainda não aponta para $ip_servidor — o certificado só sai depois do DNS."
fi

novo=$(mktemp)
trap 'rm -f "$novo"' EXIT
# Tira o bloco antigo (se houver) e as linhas em branco do fim; depois anexa o novo.
awk '/^# >>> VITRINE/{fora=1} !fora{print} /^# <<< VITRINE/{fora=0}' "$CADDYFILE" \
  | awk 'NF{for(;branco>0;branco--)print "";print;next}{branco++}' > "$novo"
printf '\n' >> "$novo"
sed "s/__DOMINIO__/$DOMINIO/" "$MODELO" >> "$novo"

if cmp -s "$novo" "$CADDYFILE"; then
  log "o bloco da Vitrine já está na borda, igual ao do repositório. Nada a fazer."
  exit 0
fi

# Validação dentro da borda, sobre uma cópia em /tmp do container: o arquivo
# em uso nem é tocado.
if ! saida=$(docker exec -i "$BORDA_CONTAINER" sh -c \
  'f=/tmp/Caddyfile.vitrine-$$; cat > "$f"; caddy validate --config "$f" --adapter caddyfile; s=$?; rm -f "$f"; exit $s' \
  < "$novo" 2>&1); then
  echo "$saida" | tail -5 >&2
  falha "o Caddyfile resultante seria inválido. Nada mudou na borda."
fi

if [ "$modo" = simular ]; then
  diff -u "$CADDYFILE" "$novo" || true
  log "simulação: o Caddyfile resultante é válido para o Caddy da borda. Nada foi alterado."
  exit 0
fi

copia="$BACKUPS/Caddyfile-borda-$(date '+%Y%m%d-%H%M%S')"
cp -p "$CADDYFILE" "$copia"
cat "$novo" > "$CADDYFILE"

if ! saida=$(docker exec "$BORDA_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1); then
  cat "$copia" > "$CADDYFILE"
  echo "$saida" | tail -5 >&2
  falha "o Caddy recusou a recarga — o Caddyfile original voltou, e a borda segue com a configuração de antes."
fi
log "bloco da Vitrine aplicado na borda para https://$DOMINIO (cópia do anterior: $copia)"
