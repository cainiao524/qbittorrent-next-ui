FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.29-alpine

ENV QBITTORRENT_URL=http://host.docker.internal:8080

COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/init-webui.sh /docker-entrypoint.d/10-init-webui.sh
RUN chmod +x /docker-entrypoint.d/10-init-webui.sh
COPY --from=builder /app/dist /usr/share/nginx/html.default
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
