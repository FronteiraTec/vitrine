# syntax=docker/dockerfile:1
#
# API da Vitrine (Node). O contexto de build é a pasta `vitrine/`, porque a
# API usa módulos compartilhados com o React (`src/lib`, `src/i18n`) — as
# regras de SEO e de montagem da notícia são as mesmas nos dois lados — e as
# migrations de `db/`, aplicadas pelo serviço `migrate` com esta mesma imagem.
#
# A imagem é construída no GitHub Actions e publicada no GitHub Container
# Registry com a tag = SHA do commit. O servidor só baixa; nunca constrói.

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

# Só pelo "type": "module": os módulos compartilhados de `src/` são ESM.
COPY package.json ./package.json
COPY server/src ./server/src
COPY src/lib ./src/lib
COPY src/i18n ./src/i18n
COPY db ./db

# A pasta dos arquivos enviados nasce do usuário `node`: o volume nomeado
# herda o dono na primeira montagem, e a API consegue gravar nele.
RUN mkdir -p /data/arquivos && chown node:node /data/arquivos

# A versão vem por último, para não invalidar o cache das camadas acima a cada
# commit. Aparece em /api/health e em `app.schema_migrations.app_version`.
ARG APP_VERSION=local
ARG APP_BUILT_AT=""
ENV APP_VERSION=$APP_VERSION \
    APP_BUILT_AT=$APP_BUILT_AT
LABEL org.opencontainers.image.source="https://github.com/FronteiraTec/vitrine" \
      org.opencontainers.image.revision="$APP_VERSION" \
      org.opencontainers.image.title="vitrine-api"

USER node
EXPOSE 3000

# Pronto = banco respondendo e nenhuma migration pendente (ver health.js).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health/ready || exit 1

CMD ["node", "server/src/index.js"]
