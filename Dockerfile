FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.29-alpine

ENV QBITTORRENT_URL=http://host.docker.internal:8080

ARG VERSION_SHA

COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/init-webui.sh /docker-entrypoint.d/10-init-webui.sh
RUN chmod +x /docker-entrypoint.d/10-init-webui.sh
COPY --from=builder /app/dist /usr/share/nginx/html.default
COPY --from=builder /app/dist /usr/share/nginx/html

# 写入版本标记（含防误改声明），绑定镜像版本；VERSION= 行变化即视为镜像更新
RUN { \
      printf '%s\n' \
        '# ============================================================' \
        '# WebUI 版本标记文件 —— 自动生成，请勿修改！' \
        '# 本文件由 Docker 镜像构建时自动写入，VERSION= 的值绑定当前镜像版本。' \
        '# 容器每次启动时会对比"镜像内 VERSION"与"挂载目录 webui/VERSION"：' \
        '#   VERSION= 值不同或文件缺失 → 判定镜像已更新 → 全量替换 WebUI 为镜像内置新版' \
        '#   VERSION= 值相同 → 不覆盖任何文件，手动修改的页面会被保留' \
        '# 因此：不要修改、删除本文件，也不要改动 VERSION= 的值，' \
        '# 否则下次容器启动时页面会被重置为镜像内置版本（或破坏自动更新机制）。' \
        '# 想调试页面请只修改其他文件；如果页面没有按预期更新，请检查镜像版本。' \
        '# ============================================================' ; \
      printf 'VERSION=%s\n' "${VERSION_SHA}" ; \
    } > /usr/share/nginx/html.default/VERSION

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
