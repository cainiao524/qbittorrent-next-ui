#!/bin/sh
set -e

SRC=/usr/share/nginx/html.default
DEST=/usr/share/nginx/html

# 版本对比：镜像内置 VERSION 与挂载目录 VERSION 的 VERSION= 行不一致时，全量替换为新版。
# 仅当镜像更新（构建 sha 变化）时触发；手动修改 webui 其他文件不会触发。
if [ -d "$SRC" ]; then
  SRC_VER=$(sed -n 's/^VERSION=//p' "$SRC/VERSION" 2>/dev/null | head -1)
  DEST_VER=$(sed -n 's/^VERSION=//p' "$DEST/VERSION" 2>/dev/null | head -1)
  if [ -z "$SRC_VER" ]; then
    # 旧镜像（无版本标记）：仅在空目录时填充，兼容旧行为
    if [ ! -f "$DEST/index.html" ]; then
      cp -r "$SRC"/. "$DEST"/
    fi
  elif [ "$SRC_VER" != "$DEST_VER" ]; then
    # 镜像版本更新：全量替换挂载目录（页面跟随镜像版本）
    rm -rf "$DEST"/*
    cp -r "$SRC"/. "$DEST"/
  fi
fi

# 放宽权限：文件与目录全部可读写，方便宿主机直接覆盖调试
chmod -R a+rwX "$DEST"

# 可选：设置 PUID/PGID 时改为精确属主
if [ -n "${PUID:-}" ] && [ -n "${PGID:-}" ]; then
  chown -R "${PUID}:${PGID}" "$DEST"
fi
