#!/usr/bin/env bash
# =============================================================================
# Preparação ÚNICA da VPS para a Vitrine. Roda como root e pode ser repetida
# sem estragar nada (o que já existe é mantido).
#
#   instalar.sh --dominio vitrine.fronteiratec.com --chave "ssh-ed25519 AAAA… github-actions"
#              [--ref <branch>]   (padrão: main; o clone depois segue os deploys)
#
# O que faz:
#   1. usuário `vitrine` (grupo docker, sem senha, sem sudo)
#   2. /opt/vitrine com o clone do repositório
#   3. /opt/vitrine/.env com senhas ALEATÓRIAS geradas aqui — nunca saem da VPS
#   4. a chave do GitHub Actions presa ao entrada-ssh.sh (comando forçado)
#   5. backup diário do banco e das imagens (cron, 03:30)
#
# O que NÃO faz: mexer em firewall, sshd, outros sistemas ou na borda. O
# bloco na borda Caddy é outro passo (borda.sh), que depende do DNS.
# =============================================================================
set -Eeuo pipefail

REPO=https://github.com/FronteiraTec/vitrine.git
RAIZ=/opt/vitrine
BORDA_REDE=quiron-borda

log() { printf '[instalar] %s\n' "$*"; }
falha() { printf '[instalar] ERRO: %s\n' "$*" >&2; exit 1; }

dominio="" chave="" ref=main
while [ $# -gt 0 ]; do
  case $1 in
    --dominio) dominio=$2; shift 2 ;;
    --chave) chave=$2; shift 2 ;;
    --ref) ref=$2; shift 2 ;;
    *) falha "opção desconhecida: $1" ;;
  esac
done

[ "$(id -u)" = "0" ] || falha "rode como root."
[[ $dominio =~ ^[a-z0-9.-]+$ ]] || falha "informe --dominio (ex.: vitrine.fronteiratec.com)."
command -v docker >/dev/null || falha "Docker não instalado."
docker compose version >/dev/null || falha "plugin docker compose não instalado."
docker network inspect "$BORDA_REDE" >/dev/null 2>&1 || falha "a rede da borda ($BORDA_REDE) não existe."

# 1. usuário ------------------------------------------------------------------
if ! id vitrine >/dev/null 2>&1; then
  useradd --system --home-dir "$RAIZ" --shell /bin/bash --comment "Vitrine (deploy)" vitrine
  log "usuário vitrine criado"
fi
usermod -aG docker vitrine
passwd -l vitrine >/dev/null 2>&1 || true

# Se o sshd restringe usuários, avisa em vez de mexer na configuração global.
if sshd -T 2>/dev/null | grep -qi '^allowusers'; then
  sshd -T | grep -qiw 'vitrine' || log "AVISO: o sshd tem AllowUsers e 'vitrine' não está na lista — o deploy por SSH vai ser recusado."
fi

# 2. pastas e clone -----------------------------------------------------------
install -d -o vitrine -g vitrine -m 750 "$RAIZ"
install -d -o vitrine -g vitrine -m 750 "$RAIZ/estado"
install -d -o vitrine -g vitrine -m 700 "$RAIZ/backups"
install -d -o root -g root -m 755 "$RAIZ/bin"
if [ ! -d "$RAIZ/app/.git" ]; then
  sudo -u vitrine -H git clone --quiet --branch "$ref" "$REPO" "$RAIZ/app"
  log "repositório clonado em $RAIZ/app ($ref)"
fi
touch "$RAIZ/deploys.log" && chown vitrine:vitrine "$RAIZ/deploys.log"

# 3. .env de produção -----------------------------------------------------------
if [ ! -f "$RAIZ/.env" ]; then
  subrede=$(docker network inspect "$BORDA_REDE" --format '{{range .IPAM.Config}}{{.Subnet}} {{end}}' | awk '{print $1}')
  cat > "$RAIZ/.env" <<EOF
# =============================================================================
# Vitrine — configuração de PRODUÇÃO desta VPS. Gerado pelo instalar.sh em
# $(date '+%Y-%m-%d %H:%M'). NUNCA vai para o git; as senhas só existem aqui.
# =============================================================================

# Senhas do banco (aleatórias). O banco foi criado com elas: trocar aqui depois
# não troca no banco.
POSTGRES_PASSWORD=$(openssl rand -hex 24)
APP_DB_PASSWORD=$(openssl rand -hex 24)

SITE_URL=https://$dominio
TZ=America/Sao_Paulo

# Imagens publicadas pelo GitHub Actions.
VITRINE_IMAGE_PREFIX=ghcr.io/fronteiratec/vitrine

# A borda Caddy compartilhada da VPS.
BORDA_REDE=$BORDA_REDE
BORDA_CONTAINER=quiron-proxy-caddy-1
BORDA_CADDYFILE=/opt/quiron/prod/proxy/Caddyfile
# A borda fala com o Nginx da Vitrine por esta rede: o IP real do visitante
# vem no X-Forwarded-For, e só esta faixa é confiável para dizê-lo.
TRUSTED_PROXIES=$subrede

# E-mail de "esqueci minha senha" (opcional).
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=

# Localização da audiência (opcional): conta gratuita na MaxMind.
GEOIP_ACCOUNT_ID=
GEOIP_LICENSE_KEY=
EOF
  log ".env criado com senhas aleatórias (TRUSTED_PROXIES=$subrede)"
fi
chown vitrine:vitrine "$RAIZ/.env"
chmod 600 "$RAIZ/.env"

# 4. chave do GitHub Actions --------------------------------------------------
install -o root -g root -m 755 "$RAIZ/app/vitrine/deploy/vps/entrada-ssh.sh" "$RAIZ/bin/entrada-ssh.sh"
sed -i 's/\r$//' "$RAIZ/bin/entrada-ssh.sh"
install -d -o vitrine -g vitrine -m 700 "$RAIZ/.ssh"
if [ -n "$chave" ]; then
  [[ $chave =~ ^ssh-(ed25519|rsa)\ [A-Za-z0-9+/=]+ ]] || falha "--chave não parece uma chave pública SSH."
  linha="command=\"$RAIZ/bin/entrada-ssh.sh\",restrict $chave"
  touch "$RAIZ/.ssh/authorized_keys"
  grep -qF "$(echo "$chave" | awk '{print $2}')" "$RAIZ/.ssh/authorized_keys" \
    || printf '%s\n' "$linha" >> "$RAIZ/.ssh/authorized_keys"
  chown vitrine:vitrine "$RAIZ/.ssh/authorized_keys"
  chmod 600 "$RAIZ/.ssh/authorized_keys"
  log "chave do GitHub Actions autorizada (só executa entrada-ssh.sh)"
fi

# 5. backup diário ----------------------------------------------------------------
cat > /etc/cron.d/vitrine-backup <<EOF
# Vitrine: backup diário do banco e das imagens enviadas (retenção no script).
30 3 * * * vitrine $RAIZ/app/vitrine/deploy/vps/backup.sh diario --arquivos >> $RAIZ/backups/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/vitrine-backup

chmod +x "$RAIZ"/app/vitrine/deploy/vps/*.sh 2>/dev/null || true

log "pronto. Próximos passos:"
log "  1. DNS: registro A de $dominio para o IP desta VPS"
log "  2. borda: $RAIZ/app/vitrine/deploy/vps/borda.sh"
log "  3. primeiro deploy: push na main (ou deploy.sh <sha> como vitrine)"
