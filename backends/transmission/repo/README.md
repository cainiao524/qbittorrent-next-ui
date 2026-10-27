<p align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="Transmission VibeMod" />
</p>

<h1 align="center">Transmission VibeMod</h1>

<p align="center">面向 Transmission 4.x 的现代化响应式网页界面</p>

<p align="center">
  <a href="https://github.com/cainiao524/transmission-next-vibemod/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/cainiao524/transmission-next-vibemod/build.yml?branch=main&label=%E6%9E%84%E5%BB%BA" alt="构建状态" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/cainiao524/transmission-next-vibemod" alt="许可证" /></a>
  <a href="https://hub.docker.com/r/lowsabishi/transmission-next-vibemod"><img src="https://img.shields.io/docker/pulls/lowsabishi/transmission-next-vibemod?label=Docker%20Hub" alt="Docker Hub 镜像拉取量" /></a>
  <img src="https://img.shields.io/badge/Transmission-4.x-d76b2b" alt="Transmission 兼容版本" />
</p>

## 项目说明

Transmission VibeMod 使用 React、Vite、Tailwind CSS 与 shadcn/ui 构建，通过 Transmission RPC v17 管理任务。项目参考了 [qbittorrent-next-ui](https://github.com/cainiao524/qbittorrent-next-ui) 的视觉与交互，但通信层已改为 `/transmission/rpc`，不是 qBittorrent Web API。

当前版本支持任务列表、添加磁力链接与种子文件、拖放快速添加、开始与暂停、删除、校验、重新汇报、队列排序、移动数据位置、标签、Tracker、Peer、文件树、文件优先级、批量与范围选择、键盘快捷键、速度历史图表及会话设置。

## 安装方式

| 推荐顺序 | 安装方式 | 适合场景 |
| --- | --- | --- |
| 1 | **Docker Hub / GHCR 镜像** | NAS、Docker，配置最少且升级方便，首要推荐 |
| 2 | 发行版＋Nginx 反向代理 | 希望自行管理静态文件与 Nginx 配置 |
| 3 | 从源码构建 | 开发、二次修改或需要最新 `main` 分支 |

> 首要推荐直接拉取 Docker Hub 镜像；GitHub Container Registry（GHCR）提供同一版本的备用镜像。两者都已包含 WebUI、Nginx 和 Transmission RPC 代理配置，不需要下载发行版、解压文件或手动编写 Nginx 配置。

## 安装方式一：Docker Hub 镜像（推荐）

镜像地址：[lowsabishi/transmission-next-vibemod](https://hub.docker.com/r/lowsabishi/transmission-next-vibemod)（Docker Hub，首选），备用镜像为 [ghcr.io/cainiao524/transmission-next-vibemod](https://github.com/users/cainiao524/packages/container/package/transmission-next-vibemod)（GHCR），均支持 `linux/amd64` 与 `linux/arm64`。`latest` 跟随最新稳定镜像，也可以使用格式为 `vX.Y.Z-baka9` 的固定版本标签。

> 镜像内置 WebUI，开箱即用。如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」。

#### 写法 A（推荐）：`host.docker.internal` 自动指向宿主机

`host.docker.internal` 由 Docker 自动解析到宿主机，无需关心服务器 IP，跨平台通用：

- Docker Desktop（Windows / macOS）：直接可用，无需额外配置
- Linux / 群晖等 NAS：Docker 20.10+ 需添加 `extra_hosts: ["host.docker.internal:host-gateway"]`

创建 `docker-compose.yml`：

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
    restart: unless-stopped
```

启动：

```bash
docker compose pull
docker compose up -d
```

浏览器访问 `http://服务器地址:9095`，使用 Transmission RPC 的账户登录。如果 Transmission 没有启用认证，页面会自动进入。镜像内置 WebUI，开箱即用，无需挂载或管理 `webui` 文件。
> 如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」，直接在宿主机目录上修改。

#### 写法 B：直接填写宿主机局域网 IP（原有写法）
创建 `docker-compose.yml`：

```yaml
services:
  transmission-next-vibemod:
    image: lowsabishi/transmission-next-vibemod:latest
    container_name: transmission-next-vibemod
    environment:
      TRANSMISSION_URL: http://192.168.1.10:9091
    ports:
      - "9095:80"
    restart: unless-stopped
```

把 `TRANSMISSION_URL` 改成 Transmission RPC 的实际地址，地址末尾不要添加 `/transmission/rpc`，然后启动：

```bash
docker compose pull
docker compose up -d
```

浏览器访问 `http://服务器地址:9095`，使用 Transmission RPC 的账户登录。如果 Transmission 没有启用认证，页面会自动进入。镜像内置 WebUI，开箱即用，无需挂载或管理 `webui` 文件。

> 注意：容器通过默认网桥访问宿主机内网 IP 通常可用，但若因防火墙或路由限制连接失败，优先改用写法 A，或在同一个 Compose 网络内把地址直接写成 `http://transmission:9091`。
> 如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」，直接在宿主机目录上修改。

如果两个服务位于同一个 Compose 网络，可以把地址写成 `http://transmission:9091`。需要锁定当前版本时，将镜像改为：

```yaml
image: lowsabishi/transmission-next-vibemod:vX.Y.Z-baka9
```

如果从 Docker Hub 拉取受限，可以把镜像地址换成 GHCR：

```yaml
image: ghcr.io/cainiao524/transmission-next-vibemod:vX.Y.Z-baka9
```

#### 写法 C：docker run 快速启动

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


镜像内置 WebUI，开箱即用。浏览器访问 `http://服务器地址:9095`，使用 Transmission RPC 的账户登录。如果 Transmission 没有启用认证，页面会自动进入。



#### WebUI 目录挂载与实时更新机制

镜像默认内置 WebUI。如果你在 compose 中主动挂载 `./webui:/usr/share/nginx/html`，Nginx 会实时读取宿主机目录，替换文件后刷新即可生效，无需重建容器。该机制便于在 NAS 上直接解压发行版、随时切换或调试版本。

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

- 挂载目录会覆盖镜像内置页面，镜像升级后不会自动同步，需要手动更新 `webui` 目录中的文件。
- `assets` 静态文件带一年缓存头，切换版本后请强制刷新浏览器（Ctrl+F5）。
- 希望页面自动跟随镜像更新时，请在 compose 中移除 `volumes` 挂载，使用镜像内置 WebUI。

## 安装方式二：发行版＋Nginx 反向代理

这是原来的推荐安装方式，现调整为次要方式。Nginx 同时提供发行版 WebUI 静态文件和 `/transmission/rpc` 反向代理，使页面与 RPC 保持同源，可以避免跨域问题，并由自定义登录页接管认证流程。

这种方式具有以下优点：

- 不需要修改 Transmission 自带网页目录。
- WebUI 和 Transmission 可以分别更新。
- 不必把 Transmission 的 `9091` 端口直接暴露到公网。
- 可以隐藏 `WWW-Authenticate` 响应头，避免浏览器弹出原生基础认证对话框。
- 用户名和密码不由 WebUI 保存，密码保存与自动填充交给浏览器密码管理器。

### 1. 准备目录

NAS 示例目录：

```bash
mkdir -p /vol1/1000/Docker/Compose/transmission-next-vibemod/webui
cd /vol1/1000/Docker/Compose/transmission-next-vibemod
```

普通 Linux 服务器也可以使用其他目录，例如 `/opt/transmission-next-vibemod`。

最终目录结构如下：

```text
transmission-next-vibemod/
├─ docker-compose.yml
├─ nginx.conf
└─ webui/
   ├─ index.html
   └─ assets/
```

### 2. 下载发行版

安装 `curl` 和 `unzip` 后执行：

```bash
curl -L https://github.com/cainiao524/transmission-next-vibemod/releases/latest/download/transmission-next-vibemod.zip -o webui.zip
unzip -o webui.zip -d webui
```

请勿直接双击 `index.html`，WebUI 必须通过网页服务器访问，并把 `/transmission/rpc` 转发到 Transmission。

### 3. 创建 docker-compose.yml

```yaml
services:
  webui:
    image: nginx:alpine
    container_name: transmission-next-vibemod
    ports:
      - "${WEBUI_PORT:-9095}:80"
    volumes:
      - ./webui:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
```

默认访问端口为 `9095`。如需改为 `8088`，可以创建 `.env`：

```dotenv
WEBUI_PORT=8088
```

### 4. 创建 nginx.conf

下面示例假设 Transmission 位于 `192.168.1.10:9091`。请把该地址替换成你的 NAS 或 Transmission 服务器地址。

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-store";
        try_files $uri =404;
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location /transmission/rpc {
        proxy_pass http://192.168.1.10:9091/transmission/rpc;
        proxy_http_version 1.1;

        # 避免外网域名触发 Transmission 的主机名白名单检查。
        proxy_set_header Host 127.0.0.1;

        # 传递 Transmission 的基础认证和会话编号。
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Transmission-Session-Id $http_x_transmission_session_id;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass_request_headers on;

        # 必须保留：防止浏览器弹出原生账号密码对话框。
        proxy_hide_header WWW-Authenticate;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

注意：Nginx 运行在容器内，`127.0.0.1:9091` 指向 Nginx 容器自身，通常不能用于连接 NAS 主机上的 Transmission。请使用 NAS 的局域网地址，或把两个容器加入同一个 Docker 网络。

如果 Transmission 服务名为 `transmission`，并且两个容器位于同一个 Docker 网络，可以改成：

```nginx
proxy_pass http://transmission:9091/transmission/rpc;
```

### 5. 启动 WebUI

```bash
docker compose up -d
docker compose ps
```

打开：

```text
http://NAS地址:9095
```

使用 Transmission RPC 的用户名和密码登录。如果 Transmission 未启用认证，页面会自动进入。启用认证后，浏览器可以通过标准密码管理器询问是否保存密码；WebUI 本身不会保存密码。

### 6. 验证反向代理

确认首页：

```bash
curl -I http://127.0.0.1:9095/
```

确认 RPC 代理：

```bash
curl -i -X POST \
  -H 'Content-Type: application/json' \
  --data '{"method":"session-get"}' \
  http://127.0.0.1:9095/transmission/rpc
```

未携带账号密码时返回 `401 Unauthorized` 属于正常现象，但响应头中不应再出现 `WWW-Authenticate`。登录后首次 RPC 请求返回 `409 Conflict` 也属于 Transmission 的正常会话编号协商，WebUI 会自动读取编号并重试。

### 7. 外网访问

建议在现有反向代理、网关或隧道中为 `9095` 配置 HTTPS 域名，只向外提供 HTTPS 入口，不要直接向公网开放 Transmission 的 `9091` 端口。

浏览器密码按协议、域名和端口分别保存，因此局域网地址与外网 HTTPS 域名通常需要各自保存一次。公共或临时设备上不要允许浏览器保存密码。

### 8. 更新 WebUI

先备份旧网页目录，再解压最新发行版：

```bash
cd /vol1/1000/Docker/Compose/transmission-next-vibemod
mv webui "webui-backup-$(date +%Y%m%d-%H%M%S)"
mkdir webui
curl -L https://github.com/cainiao524/transmission-next-vibemod/releases/latest/download/transmission-next-vibemod.zip -o webui.zip
unzip -o webui.zip -d webui
docker compose up -d --force-recreate
```

### 9. 常见问题

#### 浏览器仍弹出原生账号密码对话框

检查 `nginx.conf` 的 RPC 区块是否包含：

```nginx
proxy_hide_header WWW-Authenticate;
```

修改后执行：

```bash
docker compose up -d --force-recreate
```

#### 登录页面始终提示连接失败

- 检查 `proxy_pass` 的 IP、端口和路径。
- 确认 Nginx 容器可以访问 Transmission 的 `9091` 端口。
- 不要把容器内的 `127.0.0.1:9091` 当作 NAS 主机地址。
- 查看日志：`docker compose logs --tail=100 webui`。

#### 页面能打开但刷新详情页失败

确认 `location /` 中存在 SPA 回退规则：

```nginx
try_files $uri $uri/ /index.html;
```

## 安装方式三：从源码构建

需要 Node.js 22 和 pnpm 10：

```bash
git clone https://github.com/cainiao524/transmission-next-vibemod.git
cd transmission-next-vibemod
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

构建结果位于 `dist/`。开发服务器默认把 `/transmission` 代理到 `http://127.0.0.1:9091`。Transmission 位于其他地址时：

```bash
VITE_TRANSMISSION_PROXY_TARGET=http://192.168.1.10:9091 pnpm dev
```

前端 RPC 路径也可以在构建时通过 `VITE_TRANSMISSION_RPC_URL` 修改，默认值为 `/transmission/rpc`。

## 说明

Transmission RPC 不提供 qBittorrent 的种子创建器、导出原始 `.torrent`、超级做种、自动种子管理、顺序下载与首尾区块优先接口，因此本项目不会显示无法实际执行的相关按钮。

## 许可证

[MIT](LICENSE)
