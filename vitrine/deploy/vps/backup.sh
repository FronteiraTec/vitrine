#!/usr/bin/env bash
# =============================================================================
# Backup do banco (e, opcionalmente, das imagens enviadas pelo painel).
#
#   backup.sh                         dump do banco, rótulo "manual"
#   backup.sh antes-de-1a2b3c4        o deploy chama assim antes de migrar
#   backup.sh diario --arquivos       o cron, toda madrugada: banco + imagens
#
# Arquivos em /opt/vitrine/backups:
#   AAAAMMDD-hhmmss-<rotulo>.dump      pg_dump formato custom (pg_restore)
#   AAAAMMDD-hhmmss-arquivos.tar.gz    o volume de imagens enviadas
#
# Retenção: 14 diários, 10 de antes de deploy, 10 manuais, 7 de imagens.
#
# ⚠ Um backup que mora no mesmo disco que o banco não protege contra a perda
# do servidor. Copie a pasta para fora da VPS periodicamente (deploy/README.md).
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"
como_vitrine "$0" "$@"

rotulo=${1:-manual}
[[ $rotulo =~ ^[a-z0-9-]+$ ]] || falha "rótulo só com letras minúsculas, números e hífen."
com_arquivos=0
[ "${2:-}" = "--arquivos" ] && com_arquivos=1

mkdir -p "$BACKUPS"
chmod 700 "$BACKUPS"
carimbo=$(date '+%Y%m%d-%H%M%S')
VITRINE_TAG=$(commit_atual)
export VITRINE_TAG

destino="$BACKUPS/$carimbo-$rotulo.dump"
dc exec -T db pg_dump -U vitrine -d vitrine -Fc > "$destino.parcial" \
  || { rm -f "$destino.parcial"; falha "pg_dump falhou."; }
mv "$destino.parcial" "$destino"
chmod 600 "$destino"
log "banco: $destino ($(du -h "$destino" | cut -f1))"

if [ "$com_arquivos" = 1 ]; then
  destino_arquivos="$BACKUPS/$carimbo-arquivos.tar.gz"
  # O `web` já monta o volume (só leitura) e tem tar: nenhuma imagem a mais.
  dc exec -T web tar czf - -C /data/arquivos . > "$destino_arquivos.parcial" \
    || { rm -f "$destino_arquivos.parcial"; falha "cópia das imagens falhou."; }
  mv "$destino_arquivos.parcial" "$destino_arquivos"
  chmod 600 "$destino_arquivos"
  log "imagens: $destino_arquivos ($(du -h "$destino_arquivos" | cut -f1))"
fi

# Retenção, por tipo: os mais novos ficam.
manter() {
  local padrao=$1 quantos=$2
  # `|| true`: sem nenhum arquivo do tipo, o ls sai com erro — e não é erro.
  { ls -1t $BACKUPS/$padrao 2>/dev/null || true; } | tail -n +$((quantos + 1)) | xargs -r rm -f
}
manter '*-diario.dump' 14
manter '*-antes-de-*.dump' 10
manter '*-manual.dump' 10
manter '*-arquivos.tar.gz' 7
