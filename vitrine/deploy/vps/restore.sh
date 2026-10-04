#!/usr/bin/env bash
# =============================================================================
# Restaura o banco a partir de um backup. ÚLTIMO RECURSO.
#
#   restore.sh /opt/vitrine/backups/20261003-212200-antes-de-1a2b3c4.dump
#
# Tudo o que foi gravado DEPOIS do backup se perde: notícias, edições,
# contas, audiência. Por isso pede confirmação digitada e nunca roda sozinho —
# nem o deploy nem o rollback chamam este script.
#
# Use quando uma migration destrutiva deu errado e o dado precisa voltar. Para
# um bug de código, o caminho é o rollback.sh, que não mexe no banco.
#
# Antes de restaurar, faz um backup do estado atual ("antes-de-restore"): dá
# para desfazer a restauração.
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"
como_vitrine "$0" "$@"

arquivo=${1:-}
[ -f "$arquivo" ] || falha "uso: restore.sh <arquivo .dump>  (ls $BACKUPS)"
[ -t 0 ] || falha "restore só roda num terminal interativo, com confirmação."

VITRINE_TAG=$(commit_atual)
export VITRINE_TAG

echo
echo "Restaurar o banco da Vitrine a partir de:"
echo "  $(basename "$arquivo")  ($(du -h "$arquivo" | cut -f1), $(date -r "$arquivo" '+%d/%m/%Y %H:%M'))"
echo
echo "Tudo o que foi gravado depois desse momento será PERDIDO."
read -r -p "Digite RESTAURAR para continuar: " resposta
[ "$resposta" = "RESTAURAR" ] || falha "cancelado."

"$APP/deploy/vps/backup.sh" antes-de-restore

log "parando api e web (o site fica fora do ar durante a restauração)"
dc stop api web

log "restaurando…"
dc exec -T db pg_restore -U vitrine -d vitrine --clean --if-exists --no-owner --exit-on-error < "$arquivo" \
  || aviso "pg_restore terminou com erro — confira antes de liberar o site."

# Reaplica a senha do papel da API e o que o código atual espera do banco.
dc run --rm --no-deps migrate

dc up -d --no-deps --no-build --wait api web
log "restauração concluída. Confira com: $APP/deploy/vps/status.sh"
registrar restaurado "$(commit_atual)" "$(basename "$arquivo")"
