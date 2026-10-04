#!/usr/bin/env bash
# =============================================================================
# A Vitrine está bem? Um resumo para ler em dez segundos.
#
#   versão no ar · containers e saúde · API pronta? · migrations ·
#   a borda alcança o site? · últimos deploys · backups · espaço em disco
#
# Sai com código diferente de zero se algo essencial estiver errado — dá para
# usar em monitoramento.
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"
como_vitrine "$0" "$@"

problemas=0
ruim() { printf '  ✗ %s\n' "$*"; problemas=$((problemas + 1)); }
bom() { printf '  ✓ %s\n' "$*"; }

atual=$(commit_atual)
anterior=$(commit_anterior)
echo "Vitrine — $(date '+%Y-%m-%d %H:%M:%S')"
echo
echo "Versão no ar:   ${atual:+$(curto "$atual")  ($(git -C "$CLONE" log -1 --format='%s' "$atual" 2>/dev/null || echo '?'))}"
echo "Anterior:       ${anterior:+$(curto "$anterior")}${anterior:-nenhuma}"
echo

echo "Containers"
export VITRINE_TAG=${atual:-local}
dc ps --all --format '  {{.Service}}\t{{.State}}\t{{.Status}}' 2>/dev/null || ruim "docker compose não respondeu"
for servico in db api web; do
  estado=$(dc ps --format '{{.Health}}' "$servico" 2>/dev/null || true)
  [ "$estado" = "healthy" ] || ruim "$servico não está saudável (${estado:-parado})"
done
echo

echo "API"
pronta=$(dc exec -T api wget -qO- http://127.0.0.1:3000/api/health/ready 2>/dev/null || true)
if [[ $pronta == *'"ok":true'* ]]; then
  bom "pronta — banco ok, nenhuma migration pendente"
else
  ruim "não está pronta: ${pronta:-sem resposta}"
fi
if [ -n "$atual" ] && [[ $pronta != *"$atual"* ]]; then
  ruim "a API responde numa versão diferente da registrada como no ar"
fi
echo

echo "Migrations"
dc run --rm --no-deps -T migrate node server/src/migrate.js --status 2>/dev/null | tail -6 | sed 's/^/  /' \
  || ruim "não foi possível ler o estado das migrations"
echo

echo "Borda (HTTPS)"
if docker inspect "$BORDA_CONTAINER" >/dev/null 2>&1; then
  if docker exec "$BORDA_CONTAINER" wget -qO- http://vitrine-web/version.json >/dev/null 2>&1; then
    bom "$BORDA_CONTAINER alcança vitrine-web"
  else
    ruim "$BORDA_CONTAINER não alcança vitrine-web (o web está na rede $(env_var BORDA_REDE quiron-borda)?)"
  fi
  if docker exec "$BORDA_CONTAINER" grep -q '>>> VITRINE' /etc/caddy/Caddyfile 2>/dev/null; then
    bom "bloco da Vitrine presente no Caddyfile da borda"
  else
    ruim "o bloco da Vitrine sumiu do Caddyfile da borda — rode como root: $APP/deploy/vps/borda.sh"
  fi
else
  ruim "container da borda ($BORDA_CONTAINER) não encontrado"
fi
echo

echo "Últimos deploys"
tail -5 "$HISTORICO" 2>/dev/null | sed 's/^/  /' || echo "  (nenhum)"
echo

echo "Backups"
ls -1t "$BACKUPS"/*.dump 2>/dev/null | head -3 | while read -r arquivo; do
  printf '  %s  %s\n' "$(du -h "$arquivo" | cut -f1)" "$(basename "$arquivo")"
done
echo "  total: $(du -sh "$BACKUPS" 2>/dev/null | cut -f1)"
echo

echo "Disco:  $(df -h "$RAIZ" | awk 'NR==2 {print $4 " livres de " $2}')"
echo
if [ "$problemas" -gt 0 ]; then
  echo "$problemas problema(s) encontrado(s)."
  exit 1
fi
echo "Tudo certo."
