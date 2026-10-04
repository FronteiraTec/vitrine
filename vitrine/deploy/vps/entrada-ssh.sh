#!/usr/bin/env bash
# =============================================================================
# O ÚNICO comando que a chave SSH do GitHub Actions consegue executar na VPS.
#
# No authorized_keys do usuário `vitrine` a chave vem presa a este script:
#
#   command="/opt/vitrine/bin/entrada-ssh.sh",restrict ssh-ed25519 AAAA…
#
# Seja qual for o comando que o cliente pedir, o sshd roda ESTE arquivo, com o
# pedido em $SSH_ORIGINAL_COMMAND. Sem shell, sem túnel, sem cópia de arquivo:
# se a chave vazar, o máximo que ela faz é implantar um commit do repositório.
#
# Comandos aceitos:
#
#   deploy <sha>      implanta o commit (o token do registry chega pela entrada
#                     padrão: 1ª linha o token, 2ª o usuário do GitHub)
#   rollback [sha]    volta para o commit anterior, ou para o indicado
#   status            o resumo de saúde (status.sh)
#
# A cópia usada pelo sshd fica em /opt/vitrine/bin, é do root e só muda pelo
# instalar.sh — um commit com defeito neste arquivo não tranca o deploy.
# =============================================================================

main() {
  set -Eeuo pipefail
  local clone=/opt/vitrine/app app=/opt/vitrine/app/vitrine
  local -a pedido
  read -r -a pedido <<< "${SSH_ORIGINAL_COMMAND:-}"

  case "${pedido[0]:-}" in
    deploy)
      local sha=${pedido[1]:-}
      [[ $sha =~ ^[0-9a-f]{40}$ ]] || { echo "deploy: informe o SHA completo do commit." >&2; exit 2; }

      local token="" usuario=""
      if [ ! -t 0 ]; then
        IFS= read -r -t 10 token || true
        IFS= read -r -t 2 usuario || true
      fi

      # Vai ao commit ANTES de rodar o deploy.sh: o script que roda é sempre o
      # da versão sendo implantada, e um deploy.sh com defeito se corrige com
      # o próximo commit.
      git -C "$clone" cat-file -e "$sha^{commit}" 2>/dev/null || git -C "$clone" fetch --quiet origin
      git -C "$clone" checkout --quiet --force "$sha"

      GHCR_TOKEN=$token GHCR_USER=$usuario exec "$app/deploy/vps/deploy.sh" "$sha"
      ;;
    rollback)
      local alvo=${pedido[1]:-}
      [ -z "$alvo" ] || [[ $alvo =~ ^[0-9a-f]{40}$ ]] || { echo "rollback: SHA inválido." >&2; exit 2; }
      exec "$app/deploy/vps/rollback.sh" ${alvo:+"$alvo"}
      ;;
    status)
      exec "$app/deploy/vps/status.sh"
      ;;
    *)
      echo "comando não permitido. Use: deploy <sha> | rollback [sha] | status" >&2
      exit 2
      ;;
  esac
}

main "$@"
exit $?
