#!/bin/sh
# Proxies confiáveis à frente deste Nginx (balanceador, proxy da instituição,
# Cloudflare). Sem isto, todo acesso parece vir do IP do proxy: a audiência
# mostraria um país só, e o limite de login bloquearia todo mundo junto.
#
#   TRUSTED_PROXIES="10.0.0.0/8,172.16.0.0/12"
#
# Vazio (o padrão) = o Nginx recebe o visitante direto, e nada é configurado.
# NUNCA ponha aqui uma faixa por onde chegam visitantes comuns: quem estiver
# nela poderia forjar o próprio IP pelo cabeçalho X-Forwarded-For.
set -eu

OUT=/etc/nginx/conf.d/00-real-ip.conf
: > "$OUT"

if [ -n "${TRUSTED_PROXIES:-}" ]; then
  for cidr in $(echo "$TRUSTED_PROXIES" | tr ',' ' '); do
    echo "set_real_ip_from $cidr;" >> "$OUT"
  done
  echo "real_ip_header ${REAL_IP_HEADER:-X-Forwarded-For};" >> "$OUT"
  echo "real_ip_recursive on;" >> "$OUT"
  echo "[real-ip] confiando em: $TRUSTED_PROXIES (cabeçalho ${REAL_IP_HEADER:-X-Forwarded-For})"
fi
