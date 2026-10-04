#!/usr/bin/env bash
# =============================================================================
# A Vitrine está bem? Um resumo para ler em dez segundos.
#
#   versão no ar · containers e saúde · API pronta? · migrations ·
#   a borda alcança o site? · últimos deploys · backups · espaço em disco
#
# SÓ LEITURA: não sobe, não para e não cria nada — pode rodar a qualquer hora.
# Sai com código diferente de zero se algo essencial estiver errado, então
# serve também para monitoramento.
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"
como_vitrine "$0" "$@"

problemas=0
ruim() { printf '  ✗ %s\n' "$*"; problemas=$((problemas + 1)); }
bom() { printf '  ✓ %s\n' "$*"; }

# Um campo de um JSON simples, sem depender de jq no servidor.
campo() { sed -n "s/.*\"$1\":\(\[[^]]*\]\|\"[^\"]*\"\|[^,}]*\).*/\1/p" <<< "$2" | head -1; }

atual=$(commit_atual)
anterior=$(commit_anterior)
echo "Vitrine — $(date '+%Y-%m-%d %H:%M:%S')"
echo
if [ -n "$atual" ]; then
  echo "Versão no ar:   $(curto "$atual")  $(git -C "$CLONE" log -1 --format='%s' "$atual" 2>/dev/null || true)"
else
  echo "Versão no ar:   nenhuma — ainda não houve deploy"
fi
echo "Anterior:       $(curto_ou "$anterior" nenhuma)"
echo

echo "Containers"
export VITRINE_TAG=${atual:-nenhuma}
for servico in db api web; do
  estado=$(dc ps --all --format '{{.State}} {{.Health}}' "$servico" 2>/dev/null || true)
  if [ "$estado" = "running healthy" ]; then
    bom "$servico"
  else
    ruim "$servico: ${estado:-não existe}"
  fi
done
echo

echo "API e migrations"
pronta=$(dc exec -T api wget -qO- http://127.0.0.1:3000/api/health/ready 2>/dev/null || true)
if [ -z "$pronta" ]; then
  ruim "API sem resposta"
else
  versao=$(campo version "$pronta" | tr -d '"')
  [[ $pronta == *'"ok":true'* ]] && bom "pronta (banco ok, nenhuma migration pendente)" || ruim "não está pronta: $pronta"
  [ -z "$atual" ] || [ "$versao" = "$atual" ] || ruim "responde na versão $(curto "$versao"), não na registrada como no ar"
  echo "    aplicadas: $(campo applied "$pronta") · última: $(campo latest "$pronta" | tr -d '"')"
  echo "    pendentes: $(campo pending "$pronta") · à frente deste código: $(campo ahead "$pronta")"
fi
echo

echo "Borda (HTTPS)"
if docker inspect "$BORDA_CONTAINER" >/dev/null 2>&1; then
  if docker exec "$BORDA_CONTAINER" wget -qO- http://vitrine-web/version.json >/dev/null 2>&1; then
    bom "$BORDA_CONTAINER alcança vitrine-web"
  else
    ruim "$BORDA_CONTAINER não alcança vitrine-web"
  fi
  if docker exec "$BORDA_CONTAINER" grep -q '>>> VITRINE' /etc/caddy/Caddyfile 2>/dev/null; then
    bom "bloco da Vitrine presente no Caddyfile da borda"
  else
    ruim "o bloco da Vitrine não está no Caddyfile da borda — rode como root: $APP/deploy/vps/borda.sh"
  fi
else
  ruim "container da borda ($BORDA_CONTAINER) não encontrado"
fi
echo

echo "Últimos deploys"
if [ -s "$HISTORICO" ]; then tail -5 "$HISTORICO" | sed 's/^/  /'; else echo "  (nenhum)"; fi
echo

echo "Backups"
recentes=$(ls -1t "$BACKUPS"/*.dump 2>/dev/null | head -3 || true)
if [ -n "$recentes" ]; then
  while read -r arquivo; do
    printf '  %s  %s\n' "$(du -h "$arquivo" | cut -f1)" "$(basename "$arquivo")"
  done <<< "$recentes"
else
  echo "  (nenhum ainda)"
fi
echo "  total: $(du -sh "$BACKUPS" 2>/dev/null | cut -f1)"
echo

echo "Disco:  $(df -h "$RAIZ" | awk 'NR==2 {print $4 " livres de " $2}')"
echo
if [ "$problemas" -gt 0 ]; then
  echo "$problemas problema(s) encontrado(s)."
  exit 1
fi
echo "Tudo certo."
