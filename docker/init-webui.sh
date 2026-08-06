#!/bin/sh
set -e

# 仅当 WebUI 目录缺少 index.html 时，从镜像内置默认文件填充（全新安装自动释放）
if [ ! -f /usr/share/nginx/html/index.html ] && [ -d /usr/share/nginx/html.default ]; then
  cp -r /usr/share/nginx/html.default/. /usr/share/nginx/html/
fi

# 放宽权限：文件与目录全部可读写，方便宿主机直接覆盖调试
chmod -R a+rwX /usr/share/nginx/html

# 可选：设置 PUID/PGID 时改为精确属主
if [ -n "${PUID:-}" ] && [ -n "${PGID:-}" ]; then
  chown -R "${PUID}:${PGID}" /usr/share/nginx/html
fi
