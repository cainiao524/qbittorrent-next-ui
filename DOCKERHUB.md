# qBittorrent Next UI

面向 qBittorrent 的现代化、响应式第三方 WebUI。基于 React、Vite、Tailwind CSS 与 shadcn/ui 构建，通过 qBittorrent Web API v2 提供完整的种子管理体验，支持 qBittorrent 4.x / 5.x。

## 功能特性

- 列表 / 网格两种视图，支持列宽拖动、排序与一键对齐
- 搜索、状态、Tracker、目录与标签过滤
- 启动、停止、删除、重新校验与重新汇报
- 添加磁力链接与多个种子文件
- 重命名、移动目录、限速与分享率限制
- 批量移动、批量标签与批量替换 Tracker
- 查看种子属性、文件、Peer 与 Tracker
- 全局上传 / 下载速度与磁盘剩余空间展示
- 深色 / 浅色主题，简体中文与英文界面
- Cookie 会话登录与自动验证

## 快速开始

### docker run

```bash
docker run -d \
  --name qbittorrent-next-ui \
  -p 8088:80 \
  -e QBITTORRENT_URL=http://host.docker.internal:8085 \
  --add-host host.docker.internal:host-gateway \   # Linux / NAS 需要；Docker Desktop 可删除
  --restart unless-stopped \
  lowsabishi/qbittorrent-next-ui:latest
```

> 镜像内置 WebUI，开箱即用，无需挂载 `./webui` 目录。如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」，直接在宿主机目录上修改。


### docker-compose

```yaml
services:
  qbittorrent-next-ui:
    image: lowsabishi/qbittorrent-next-ui:latest
    container_name: qbittorrent-next-ui
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux / NAS 需要；Docker Desktop 可删除
    ports:
      - "8088:80"
    environment:
      - QBITTORRENT_URL=http://host.docker.internal:8085
    restart: unless-stopped
```

镜像内置 WebUI、Nginx 与 API 代理配置，无需手动配置，开箱即用，无需挂载或管理 `webui` 文件。浏览器访问 `http://<主机>:8088`，登录你的 qBittorrent 账号即可使用。如需修改 WebUI 文件进行调试或自定义，请使用发行版 + Nginx 独立部署（见 GitHub README 安装方式二）。

> `QBITTORRENT_URL` 是 qBittorrent WebUI 的地址。默认值 `http://host.docker.internal:8085` 适用于 Docker Desktop；Linux / 群晖等 NAS 需在 compose 中添加 `extra_hosts: ["host.docker.internal:host-gateway"]`（docker run 加 `--add-host host.docker.internal:host-gateway`）。也可以直接填写宿主机 IP，例如 `http://192.168.1.100:8085`。

## WebUI 目录挂载与实时更新机制

镜像默认内置 WebUI，开箱即用，无需挂载 `webui` 目录。如果你在 compose 中主动添加 `volumes: - ./webui:/usr/share/nginx/html`，则 Nginx 会实时读取宿主机 `webui` 目录中的文件：替换或解压新版本文件后，刷新浏览器即可立即生效，无需重建容器。
主动挂载的 Compose 写法：

```yaml
services:
  qbittorrent-next-ui:
    image: lowsabishi/qbittorrent-next-ui:latest
    container_name: qbittorrent-next-ui
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux / NAS 需要；Docker Desktop 可删除
    environment:
      QBITTORRENT_URL: http://host.docker.internal:8085
    ports:
      - "8088:80"
    volumes:
      - ./webui:/usr/share/nginx/html
    restart: unless-stopped
```

需要注意：

- 挂载目录会覆盖镜像内置页面，镜像升级后不会自动同步到挂载目录，需要手动把新版本文件放入 `webui` 目录。
- `assets` 静态文件带一年缓存头，切换版本后请强制刷新浏览器（Ctrl+F5）。
- 希望页面自动跟随镜像更新时，请在 compose 中移除 `volumes` 挂载，使用镜像内置 WebUI。

## 镜像标签

- `latest`：跟随最新稳定版本
- `v1.13.0-funky9`：固定版本标签（支持 linux/amd64、linux/arm64）

备用镜像（GHCR）：`ghcr.io/cainiao524/qbittorrent-next-ui`

## 相关链接

- GitHub 项目：https://github.com/cainiao524/qbittorrent-next-ui
