#!/usr/bin/env bash
# =============================================================================
# Volta o APLICATIVO para outra versão — por padrão, a que estava no ar antes
# do último deploy.
#
#   rollback.sh            volta para estado/anterior
#   rollback.sh <sha>      volta para um commit específico
#
# O BANCO NÃO VOLTA. As migrations são escritas para que a versão anterior do
# app funcione com o banco já migrado (regra "expandir/contrair", em
# db/README.md): a versão antiga simplesmente ignora a coluna nova. Por isso o
# rollback é seguro e rápido — e por isso uma migration que REMOVE ou RENOMEIA
# algo só vai para o servidor depois que nenhuma versão em uso depende disso.
#
# Se o problema for o próprio dado (uma migration destrutiva que deu errado),
# o caminho é o restore.sh, com o backup feito antes do deploy — e isso é uma
# decisão humana, porque perde o que foi gravado depois do backup.
# =============================================================================

source "$(dirname "$(readlink -f "$0")")/comum.sh"
como_vitrine "$0" "$@"

alvo=${1:-$(commit_anterior)}
[ -n "$alvo" ] || falha "não há versão anterior registrada em $ESTADO/anterior."
[[ $alvo =~ ^[0-9a-f]{40}$ ]] || falha "SHA inválido: $alvo"
[ "$alvo" != "$(commit_atual)" ] || falha "$(curto "$alvo") já é a versão no ar."

for servico in api web; do
  docker image inspect "$PREFIXO-$servico:$alvo" >/dev/null 2>&1 || falha \
    "a imagem $servico de $(curto "$alvo") não está mais na VPS. Use o GitHub: Actions → Vitrine → Run workflow, informando este SHA — ele baixa as imagens e implanta."
done

log "rollback do aplicativo para $(curto "$alvo") — o banco fica como está."
# No histórico (deploys.log), fica registrado como rollback.
VITRINE_OPERACAO=rollback exec "$APP/deploy/vps/deploy.sh" "$alvo" --sem-pull
