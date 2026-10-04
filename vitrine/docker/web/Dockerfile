# syntax=docker/dockerfile:1
#
# Nginx com o React já construído. O contexto de build é a pasta `vitrine/`.
#
# VITE_SITE_URL entra no BUILD, não na execução: o domínio vai para o bundle
# (canônica, hreflang) e para o robots.txt. No GitHub Actions ele vem da
# variável SITE_URL do ambiente; trocar o domínio exige um build novo.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY scripts ./scripts
COPY src ./src

ARG VITE_SITE_URL=""
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

FROM nginx:1.28-alpine

COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/web/snippets/ /etc/nginx/snippets/
COPY docker/web/40-real-ip.sh /docker-entrypoint.d/40-real-ip.sh
# Remove um eventual CR de clone no Windows antes de marcar como executável.
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-real-ip.sh && chmod +x /docker-entrypoint.d/40-real-ip.sh

COPY --from=build /app/dist /usr/share/nginx/html

# /version.json diz qual commit está servindo o frontend — o deploy confere.
ARG APP_VERSION=local
ARG APP_BUILT_AT=""
RUN printf '{"version":"%s","builtAt":"%s"}\n' "$APP_VERSION" "$APP_BUILT_AT" \
      > /usr/share/nginx/html/version.json
LABEL org.opencontainers.image.source="https://github.com/FronteiraTec/vitrine" \
      org.opencontainers.image.revision="$APP_VERSION" \
      org.opencontainers.image.title="vitrine-web"

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/version.json || exit 1
