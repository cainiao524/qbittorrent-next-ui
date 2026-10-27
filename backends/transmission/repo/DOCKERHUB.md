# Transmission VibeMod

面向 Transmission 4.x 的现代化、响应式第三方 WebUI。基于 React、Vite、Tailwind CSS 与 shadcn/ui 构建，通过 Transmission RPC v17 提供完整的任务管理体验。

## 功能特性

- 任务列表 / 网格两种视图，支持列宽拖动、排序与一键对齐
- 添加磁力链接与种子文件、拖放快速添加
- 开始、暂停、删除、校验、重新汇报、队列排序
- 移动数据位置、标签、Tracker、Peer、文件树与文件优先级
- 批量与范围选择、键盘快捷键、速度历史图表及会话设置
- 深色 / 浅色主题，简体中文与英文界面

## 快速开始

### docker run

```bash
docker run -d \
  --name transmission-next-vibemod \
  -p 9095:80 \
  -e TRANSMISSION_URL=http://host.docker.internal:9091 \
  --add-host host.docker.internal:host-gateway \   # Linux / NAS 需要；Docker Desktop 可删除
  --restart unless-stopped \
  lowsabishi/transmission-next-vibemod:latest
```

> 镜像内置 WebUI，开箱即用，无需挂载 `./webui` 目录。如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」，直接在宿主机目录上修改。


### docker-compose

```yaml
services:
  transmission-next-vibemod:
    image: lowsabishi/transmission-next-vibemod:latest
    container_name: transmission-next-vibemod
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux / NAS 需要；Docker Desktop 可删除
    ports:
      - "9095:80"
    environment:
      - TRANSMISSION_URL=http://host.docker.internal:9091
    restart: unless-stopped
```

镜像内置 WebUI、Nginx 与 Transmission RPC 代理配置，无需手动配置，开箱即用，无需挂载或管理 `webui` 文件。浏览器访问 `http://<主机>:9095`，使用 Transmission RPC 的账户登录即可使用。如需修改 WebUI 文件进行调试或自定义，请使用发行版 + Nginx 独立部署（见 GitHub README 安装方式二）。

> `TRANSMISSION_URL` 是 Transmission RPC 的地址。默认值 `http://host.docker.internal:9091` 适用于 Docker Desktop；Linux / 群晖等 NAS 需在 compose 中添加 `extra_hosts: ["host.docker.internal:host-gateway"]`（docker run 加 `--add-host host.docker.internal:host-gateway`）。也可以直接填写宿主机 IP，例如 `http://192.168.1.100:9091`；同一 Compose 网络可写 `http://transmission:9091`。

## WebUI 目录挂载与实时更新机制

镜像默认内置 WebUI，开箱即用，无需挂载 `webui` 目录。如果你在 compose 中主动添加 `volumes: - ./webui:/usr/share/nginx/html`，则 Nginx 会实时读取宿主机 `webui` 目录中的文件：替换或解压新版本文件后，刷新浏览器即可立即生效，无需重建容器。

主动挂载的 Compose 写法：

```yaml
services:
  transmission-next-vibemod:
    image: lowsabishi/transmission-next-vibemod:latest
    container_name: transmission-next-vibemod
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux / NAS 需要；Docker Desktop 可删除
    environment:
      TRANSMISSION_URL: http://host.docker.internal:9091
    ports:
      - "9095:80"
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
- `{{DOCKER_VERSION_TAG}}`：固定版本标签（支持 linux/amd64、linux/arm64）

备用镜像（GHCR）：`ghcr.io/cainiao524/transmission-next-vibemod`

## 相关链接

- GitHub 项目：https://github.com/cainiao524/transmission-next-vibemod
