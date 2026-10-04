# Deploy — a Vitrine na VPS de validação

Como a Vitrine vai para o ar, como saber se está bem e o que fazer quando algo
dá errado. Escrito para quem mantém o sistema sozinho: cada seção começa pelo
comando e depois explica.

```
deploy/
├── README.md              este guia
├── compose.vps.yml        o que muda no docker-compose.yml no servidor
├── caddy/vitrine.caddy    o bloco da Vitrine na borda HTTPS compartilhada
└── vps/
    ├── instalar.sh        preparação única da VPS (root)
    ├── borda.sh           instala o bloco na borda Caddy (root)
    ├── deploy.sh          coloca um commit no ar
    ├── rollback.sh        volta o app para a versão anterior
    ├── status.sh          a Vitrine está bem? (só leitura)
    ├── backup.sh          dump do banco (+ imagens enviadas)
    ├── restore.sh         restaura um backup — último recurso
    ├── entrada-ssh.sh     o único comando que o GitHub Actions executa
    └── comum.sh           variáveis e funções dos outros scripts
```

---

## Sumário

1. [O fluxo](#1-o-fluxo)
2. [O que é da Vitrine na VPS](#2-o-que-é-da-vitrine-na-vps)
3. [Configuração única](#3-configuração-única)
4. [Dia a dia](#4-dia-a-dia)
5. [Migrations no deploy](#5-migrations-no-deploy)
6. [Quando algo dá errado](#6-quando-algo-dá-errado)
7. [Backups](#7-backups)
8. [Segredos](#8-segredos)
9. [Remover a Vitrine da VPS](#9-remover-a-vitrine-da-vps)

---

## 1. O fluxo

```
git push origin main
   │
   ▼  GitHub Actions — .github/workflows/vitrine.yml
   │
   ├─ verificar   migrations lineares · lint · build · smoke · css · seo
   │
   ├─ imagens     constrói vitrine-api e vitrine-web UMA vez
   │              sobe a stack inteira com elas: migrations duas vezes,
   │              teste de integração (34 fluxos), teste de segurança (78)
   │              passou → publica em ghcr.io com a tag = SHA do commit
   │
   └─ deploy      SSH na VPS com uma chave que só executa um script
                  │
                  ▼  VPS — deploy/vps/deploy.sh <sha>
                     1. trava          um deploy por vez
                     2. código         o clone vai para o commit
                     3. imagens        baixa as duas imagens daquele commit
                     4. migrations     pendentes? backup → aplica TODAS numa transação
                     5. troca          sobe api e web novos, espera ficarem saudáveis
                     6. verificação    API pronta na versão nova; a borda alcança o site
                     7. registro       estado, histórico, limpeza de imagens velhas
                  │
                  ▼  confere https://…/version.json de fora
```

Leva alguns minutos, quase todos nos testes. Um pull request roda
**verificar** e **imagens** inteiros, mas não publica nem implanta.

O que o servidor **nunca** faz: construir imagem, receber senha pela rede,
rodar SQL digitado à mão. O que vai para o ar é a mesma imagem que passou nos
testes, identificada pelo commit.

Qualquer etapa que falha para o deploy. O que acontece em cada caso está na
[seção 6](#6-quando-algo-dá-errado).

---

## 2. O que é da Vitrine na VPS

A VPS hospeda outros sistemas em validação. A Vitrine fica isolada e é fácil
de identificar:

| Recurso | Onde |
|---|---|
| Pasta | `/opt/vitrine` — clone (`app/`), `.env`, `estado/`, `backups/`, `deploys.log` |
| Usuário | `vitrine` — sem senha, sem sudo, no grupo `docker` |
| Containers | `vitrine-db-1`, `vitrine-api-1`, `vitrine-web-1` (+ `vitrine-geoipupdate-1` com MaxMind) |
| Volumes | `vitrine_db-data` (banco), `vitrine_arquivos` (imagens enviadas), `vitrine_geoip` |
| Rede própria | `vitrine_default` |
| Imagens | `ghcr.io/fronteiratec/vitrine-api` e `-web` — só a versão no ar e a anterior |
| Agendamento | `/etc/cron.d/vitrine-backup` |
| Rótulo | todo container tem `com.fronteiratec.sistema=vitrine` |

```bash
docker ps --filter label=com.fronteiratec.sistema=vitrine
```

**Portas: nenhuma.** A Vitrine não publica porta no host, então não há
conflito possível. O visitante chega pela borda HTTPS que já existia, o
container `quiron-proxy-caddy-1`, que atende 80/443 e emite os certificados de
todos os sistemas. O `vitrine-web` entra na rede dessa borda (`quiron-borda`)
com o nome `vitrine-web`, e a borda o encontra por esse nome.

**O que é compartilhado** são só duas coisas: a entrada do `vitrine-web` na
rede `quiron-borda` e um bloco no Caddyfile da borda, entre os marcadores
`# >>> VITRINE` e `# <<< VITRINE`.

Os scripts não mexem em firewall, sshd, configuração do Docker, nem em
container, imagem ou rede de outro sistema.

Limites de memória: banco 256 MB, API 256 MB, Nginx 64 MB. Os logs de cada
container giram em 5 arquivos de 10 MB.

---

## 3. Configuração única

O que foi feito uma vez, na ordem, para refazer num servidor novo.

### 3.1 Preparar a VPS (root) — feito em 03/10/2026

```bash
git clone https://github.com/FronteiraTec/vitrine.git /tmp/vitrine
/tmp/vitrine/vitrine/deploy/vps/instalar.sh \
  --dominio vitrine.fronteiratec.com \
  --chave "ssh-ed25519 AAAA… github-actions-vitrine-deploy"
```

Cria o usuário, a pasta e o clone. Gera o `.env` com senhas aleatórias, que
nunca saem da VPS. Autoriza a chave do GitHub Actions presa ao
`entrada-ssh.sh` e agenda o backup diário. Pode rodar de novo: o que já
existe é mantido.

### 3.2 DNS

Um registro **A** de `vitrine.fronteiratec.com` para o IP da VPS. Confira:

```bash
dig +short vitrine.fronteiratec.com    # precisa responder o IP da VPS
```

### 3.3 Borda HTTPS (root, depois do DNS)

```bash
/opt/vitrine/app/vitrine/deploy/vps/borda.sh
```

Acrescenta o bloco de `deploy/caddy/vitrine.caddy` ao Caddyfile da borda e
recarrega o Caddy a quente; os outros sites não piscam. O Caddy emite o
certificado do Let's Encrypt sozinho. O script:

- confere o DNS antes;
- guarda uma cópia (`Caddyfile.bak-vitrine-<data>`);
- valida o arquivo e devolve o original se for inválido.

Rodar de novo substitui o bloco, nunca o duplica.

### 3.4 GitHub

Em **Settings → Secrets and variables → Actions**, aba **Variables**:

| Variable | Valor |
|---|---|
| `SITE_URL` | `https://vitrine.fronteiratec.com` |
| `VPS_HOST` | `143.95.163.57` |
| `VPS_PORT` | `22022` |
| `VPS_USER` | `vitrine` |
| `VPS_KNOWN_HOSTS` | a linha da chave do servidor (abaixo) |

`VPS_KNOWN_HOSTS` fixa a identidade da VPS: o deploy recusa um servidor que
não seja ela. A linha sai de:

```bash
ssh-keyscan -p 22022 -t ed25519 143.95.163.57 2>/dev/null
# [143.95.163.57]:22022 ssh-ed25519 AAAAC3Nz…
```

Em **Settings → Environments**, crie o environment **`validacao`** e, dentro
dele, o secret **`VPS_SSH_KEY`** com a chave **privada** inteira, incluindo as
linhas `-----BEGIN`/`-----END`. Ela fica só aqui e na máquina de quem a gerou;
a VPS conhece apenas a pública.

O token do registry (`ghcr.io`) **não** é configurado: é o `GITHUB_TOKEN` que
o próprio Actions cria a cada execução e que expira com ela.

### 3.5 Primeiro push na main

O job **imagens** cria os pacotes `vitrine-api` e `vitrine-web` em
`github.com/orgs/FronteiraTec/packages`, ligados ao repositório. Se o deploy
falhar com *"o registry recusou o token"* ou *"não foi possível baixar"*:
abra cada pacote → **Package settings** → **Manage Actions access** → adicione
o repositório `vitrine` com permissão **Read**.

---

## 4. Dia a dia

**Atualizar o site:** `git push origin main`, ou merge de um pull request.
Acompanhe em **Actions → Vitrine**; o resumo do job mostra o commit no ar.

**A Vitrine está bem?** O `status.sh` mostra:

- versão no ar e a anterior;
- containers e saúde;
- migrations aplicadas e pendentes;
- se a borda alcança o site e se o bloco do Caddyfile está lá;
- últimos deploys, backups e disco.

É só leitura e pode rodar a qualquer hora.

```bash
# da sua máquina, com a chave do deploy (ela só sabe deploy, rollback e status)
ssh -i ~/.ssh/vitrine_deploy_github -p 22022 vitrine@143.95.163.57 status

# na VPS, como root
/opt/vitrine/app/vitrine/deploy/vps/status.sh
```

Sai com código diferente de zero se algo essencial estiver errado, então
também serve para monitoramento.

**De fora, no navegador ou com curl:**

| Endereço | Responde |
|---|---|
| `/version.json` | o commit e a data do build que o Nginx está servindo |
| `/api/health` | a API está viva |
| `/api/health/ready` | banco ok, migrations em dia, versão da API — `503` se não estiver pronta |

**Logs** (na VPS):

```bash
docker logs --tail 100 -f vitrine-api-1     # erros da API
docker logs --tail 100 -f vitrine-web-1     # acessos do Nginx
cat /opt/vitrine/deploys.log                # histórico: ok, falhou, revertido, restaurado
tail /opt/vitrine/backups/backup.log        # o backup da madrugada
```

---

## 5. Migrations no deploy

As regras de como escrever uma migration estão em
[`db/README.md`](../db/README.md#2-migrations). Em resumo:

- `npm run db:new -- "o que faz"` cria o arquivo com nome e ordem certos.
- Depois de ir para a main, o arquivo **não muda mais**. Errou? Outra migration
  corrige.
- A ordem é linear: migration nova sempre com data depois da última.
- Precisa funcionar com a versão **anterior** do app: acrescentar, sim;
  remover ou renomear, só numa versão seguinte.

**A CI confere tudo isso antes de qualquer imagem existir:**

- nada aplicado foi editado, apagado ou fura a fila;
- operação destrutiva tem o comentário `-- destrutiva: <motivo>`.

**No servidor:**

- cada migration roda uma vez e fica registrada em `app.schema_migrations`,
  com checksum, duração e o commit que a aplicou;
- há backup do banco antes de aplicar;
- todas as pendentes rodam numa transação só: ou entram todas, ou nenhuma;
- se a história estiver quebrada (um arquivo aplicado foi alterado), nada roda
  e o deploy para antes de tocar no banco.

Ninguém roda SQL à mão na VPS. Para conferir o estado:

```bash
docker exec vitrine-api-1 wget -qO- http://127.0.0.1:3000/api/health/ready
```

---

## 6. Quando algo dá errado

### 6.1 O que cada falha deixa para trás

| Onde falhou | O que acontece | O site |
|---|---|---|
| Testes da CI | nada é publicado, nada chega à VPS | versão anterior, intacta |
| Baixar imagens | o deploy para | versão anterior, intacta |
| Migration | a transação é desfeita: **nenhuma** das pendentes fica aplicada | versão anterior, intacta |
| A versão nova não fica saudável | volta **sozinho** para as imagens anteriores; as migrations novas ficam (ver 6.2) | versão anterior, depois de até ~3 min fora do ar ou instável (a espera pela versão nova tem limite de 2 min) |
| Primeiro deploy de todos | não há para onde voltar | fora do ar até o próximo deploy |

Em todos os casos o motivo aparece no log do job do Actions: a linha
`ERRO: …` diz o que falhou e onde.

### 6.2 Rollback — o código voltou com um bug

**O que volta é o aplicativo; o banco não volta.** As migrations são
escritas para que a versão anterior do app funcione com o banco já migrado:
ela só ignora a coluna nova (a regra *expandir/contrair*, em
[`db/README.md`](../db/README.md#2-migrations)). Por isso o rollback é rápido
e não perde dado.

Três formas, todas com as imagens já publicadas — nada é reconstruído:

```bash
# 1. GitHub: Actions → Vitrine → Run workflow → sha = commit de 40 caracteres

# 2. da sua máquina, com a chave do deploy
ssh -i ~/.ssh/vitrine_deploy_github -p 22022 vitrine@143.95.163.57 rollback          # a anterior
ssh -i ~/.ssh/vitrine_deploy_github -p 22022 vitrine@143.95.163.57 rollback <sha>    # um commit

# 3. na VPS, como root
/opt/vitrine/app/vitrine/deploy/vps/rollback.sh [sha]
```

Depois de um rollback, a main ainda contém o commit com o bug: o próximo push
o implanta de novo. Corrija com `git revert <commit>` ou com um commit que
conserte, e faça o push.

### 6.3 Restore — o dado se perdeu

Para quando uma migration destrutiva deu errado, ou o dado foi apagado. Na
VPS, como root, num terminal:

```bash
ls -lt /opt/vitrine/backups/
/opt/vitrine/app/vitrine/deploy/vps/restore.sh /opt/vitrine/backups/<arquivo>.dump
```

**Tudo o que foi gravado depois do backup se perde:** notícias, edições,
contas, audiência. Por isso o script pede que se digite `RESTAURAR` e nunca
roda sozinho; nem o deploy nem o rollback o chamam. Antes de restaurar, ele
faz um backup do estado atual (`antes-de-restore`), e assim dá para desfazer a
restauração. O site fica fora do ar durante a restauração: cerca de 12 s,
medido na VPS em 03/10/2026.

O `.dump` restaura o banco. As imagens enviadas pelo painel vêm do
`.tar.gz` da mesma data:

```bash
docker exec -i vitrine-api-1 tar xzf - -C /data/arquivos < /opt/vitrine/backups/<data>-arquivos.tar.gz
```

### 6.4 Problemas conhecidos

| Sintoma | Causa e solução |
|---|---|
| `status.sh`: *"o bloco da Vitrine não está no Caddyfile"*; o site some com erro de certificado | O Caddyfile da borda mora no clone do Quiron (`/opt/quiron/prod/proxy`). Um deploy do Quiron faz `git reset --hard` ali e apaga os blocos acrescentados (o do Desafio e este). Rode `borda.sh` como root. Solução definitiva: o Caddyfile sair do clone do Quiron, ou o bloco da Vitrine entrar no repositório dele — decisão de quem mantém a borda. |
| *"outro deploy está em andamento"* | Há um deploy rodando agora. A trava se solta sozinha quando o processo termina, mesmo que morra no meio: espere e repita. |
| *"a história das migrations está quebrada"* | Um arquivo já aplicado foi editado, apagado ou renomeado. Devolva o conteúdo original (`git log -p -- vitrine/db/migrations/<arquivo>`) e faça a mudança numa migration nova. Nada foi aplicado. |
| *"o registry recusou o token"* / *"não foi possível baixar"* | Permissão do pacote no GitHub ([seção 3.5](#35-primeiro-push-na-main)). |
| *"Configuração de deploy incompleta"* | Falta variable ou secret ([seção 3.4](#34-github)). |
| *"Host key verification failed"* | A chave do servidor mudou: a VPS foi reinstalada, ou não é a VPS. Confirme com quem administra antes de atualizar `VPS_KNOWN_HOSTS`. |
| *"Permission denied (publickey)"* | A chave em `VPS_SSH_KEY` não corresponde à de `/opt/vitrine/.ssh/authorized_keys`. |
| HTTPS não abre, mas `status.sh` está todo ✓ | DNS ou certificado. `docker logs quiron-proxy-caddy-1 2>&1 \| grep -i vitrine` |
| Disco cheio | `du -sh /opt/vitrine/backups`. O deploy já mantém só duas versões das imagens da Vitrine. **Nunca** rode `docker system prune` ou `docker builder prune` nesta VPS: eles apagam coisas de todos os sistemas. |

---

## 7. Backups

| Quando | Rótulo | Mantém |
|---|---|---|
| Todo dia, 03:30 (cron) | `diario` + `arquivos` | 14 do banco, 7 das imagens |
| Antes de um deploy com migration | `antes-de-<commit>` | 10 |
| Antes de um restore | `antes-de-restore` | (junto com os de deploy) |
| À mão: `backup.sh [rótulo] [--arquivos]` | `manual` | 10 |

Ficam em `/opt/vitrine/backups/`. O `.dump` é o banco (`pg_dump` formato
custom) e o `.tar.gz` são as imagens enviadas pelo painel.

**Esses backups moram no mesmo disco que o banco.** Eles cobrem uma migration
errada ou um dado apagado, mas não a perda do servidor. Copie a pasta para
fora da VPS de tempos em tempos (uma vez por semana é razoável para um sistema
em validação). Da sua máquina:

```bash
scp -P 22022 -r root@143.95.163.57:/opt/vitrine/backups ./vitrine-backups-$(date +%F)
```

**Num servidor novo:** faça o 3.1 a 3.4 e um deploy (push ou `deploy.sh`).
Depois copie os backups para `/opt/vitrine/backups/` e restaure com o
[6.3](#63-restore--o-dado-se-perdeu).

---

## 8. Segredos

| Segredo | Onde fica | Onde **não** fica |
|---|---|---|
| Senhas do banco | `/opt/vitrine/.env` (dono `vitrine`, `chmod 600`), geradas na VPS | Git, GitHub, logs |
| SMTP, MaxMind | `/opt/vitrine/.env` | Git, GitHub |
| Chave privada do deploy | secret `VPS_SSH_KEY` do environment `validacao` | Git, VPS |
| Token do registry | criado pelo Actions a cada execução; chega à VPS pela entrada padrão do SSH, vive num diretório temporário e é apagado no fim | disco da VPS, linha de comando, logs |

A chave do deploy está presa ao `entrada-ssh.sh` no `authorized_keys`
(`command=…,restrict`): sem shell, sem túnel, sem cópia de arquivo. Se ela
vazar, o máximo que faz é implantar ou voltar um commit do repositório.

**Mudar SMTP ou MaxMind:** edite `/opt/vitrine/.env` como root e reimplante a
versão no ar. A API sobe de novo com a configuração nova.

```bash
sudo -u vitrine /opt/vitrine/app/vitrine/deploy/vps/deploy.sh "$(cat /opt/vitrine/estado/atual)" --sem-pull
```

**`APP_DB_PASSWORD`** (a senha com que a API entra no banco) pode ser trocada
do mesmo jeito: o deploy a aplica no banco antes de subir a API.

**`POSTGRES_PASSWORD`** só vale quando o volume do banco é criado. Trocar
depois não muda a senha no banco; deixe como está.

**Trocar a chave do deploy:**

1. Gere uma chave nova: `ssh-keygen -t ed25519 -f ~/.ssh/vitrine_deploy_github_2`.
2. Autorize-a na VPS:
   `instalar.sh --dominio vitrine.fronteiratec.com --chave "$(cat …_2.pub)"`.
3. Apague a linha antiga de `/opt/vitrine/.ssh/authorized_keys`.
4. Atualize o secret `VPS_SSH_KEY`.

---

## 9. Remover a Vitrine da VPS

Tudo é da Vitrine; nada de outro sistema é tocado. Como root:

```bash
# 1. containers e rede (os volumes ficam)
sudo -u vitrine docker compose --project-name vitrine --project-directory /opt/vitrine/app/vitrine \
  --env-file /opt/vitrine/.env -f /opt/vitrine/app/vitrine/docker-compose.yml \
  -f /opt/vitrine/app/vitrine/deploy/compose.vps.yml down

# 2. o bloco na borda: apague as linhas entre "# >>> VITRINE" e "# <<< VITRINE"
#    em /opt/quiron/prod/proxy/Caddyfile e recarregue
docker exec quiron-proxy-caddy-1 caddy reload --config /etc/caddy/Caddyfile

# 3. dados — ⚠ irreversível; faça a cópia da seção 7 antes
docker volume rm vitrine_db-data vitrine_arquivos vitrine_geoip
docker image ls --filter 'reference=ghcr.io/fronteiratec/vitrine-*' --format '{{.Repository}}:{{.Tag}}' | xargs -r docker image rm

# 4. agendamento, usuário e pasta
rm /etc/cron.d/vitrine-backup
userdel vitrine
rm -rf /opt/vitrine
```
