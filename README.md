<p align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="qBittorrent Next UI" />
</p>

<h1 align="center">qBittorrent Next UI</h1>

<p align="center">
  面向 qBittorrent 的现代化、响应式第三方网页界面
</p>

<p align="center">
  <a href="https://github.com/cainiao524/qbittorrent-next-ui/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/cainiao524/qbittorrent-next-ui/build.yml?branch=main&label=%E6%9E%84%E5%BB%BA" alt="构建状态" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/cainiao524/qbittorrent-next-ui" alt="许可证" /></a>
  <a href="https://hub.docker.com/r/lowsabishi/qbittorrent-next-ui"><img src="https://img.shields.io/docker/pulls/lowsabishi/qbittorrent-next-ui?label=Docker%20Hub" alt="Docker Hub 镜像拉取量" /></a>
  <img src="https://img.shields.io/badge/qBittorrent-4.x%20%7C%205.x-2f67ba" alt="qBittorrent 兼容版本" />
  <img src="https://img.shields.io/badge/React-19-149eca" alt="React 版本" />
</p>

<p align="center">
  <a href="#安装">安装</a> ·
  <a href="#推荐安装方式一docker-hub-镜像推荐">Docker 镜像安装</a> ·
  <a href="#安装方式二发行版--nginx-独立部署">发行版安装</a> ·
  <a href="#安装方式四从源码构建开发者">源码构建</a> ·
  <a href="#功能">功能</a> ·
  <a href="#开发">开发</a>
</p>

![qBittorrent Next UI 深色界面](pic/qbittorrent-next-ui.png)

## 项目简介

qBittorrent Next UI 使用 React、Vite、Tailwind CSS 与 shadcn/ui 构建，通过 qBittorrent Web API v2 提供完整的种子管理体验。它可以作为 qBittorrent 的备用网页界面部署，也可以由独立网页服务器托管。

本项目由 [Transmission Next UI](https://github.com/hisproc/transmission-next-ui) 改造而来，保留原项目优秀的响应式布局与交互方式，并将后端通信层替换为 qBittorrent Web API。

> 当前版本为早期可用版本。建议首次部署时保留一个已登录的原生网页界面页面，确认备用界面可用后再关闭。

## 功能

### 任务管理

- 列表与网格两种视图
- 搜索、状态、Tracker、目录与标签筛选
- 启动、停止、删除、重新校验与重新汇报
- 添加磁力链接和多个种子文件
- 重命名、移动目录、限速与分享率限制
- 批量移动、批量标签与批量替换 Tracker

### 详情与状态

- 查看种子属性、文件、Peer 与 Tracker
- 展示全局上传、下载速度和磁盘剩余空间
- 映射 qBittorrent 下载、做种、排队、校验与错误状态
- 支持自动刷新与备用速度限制模式

### 使用体验

- 桌面端、平板与移动端响应式布局
- 深色与浅色主题
- 简体中文与英文界面
- Cookie 会话登录和自动验证
- qBittorrent 5 的启动、停止接口，并兼容 qBittorrent 4 的旧接口

## 安装

qBittorrent Next UI 构建后是一组纯静态网页文件，不需要在服务器上持续运行 Node.js。推荐按下面的顺序选择安装方式：

| 推荐顺序 | 安装方式 | 独立访问端口 | 是否修改 qBittorrent 备用界面 | 适合场景 |
| --- | --- | --- | --- | --- |
| 1 | **Docker Hub / GHCR 镜像** | 是 | 否 | NAS、Docker，步骤最少且升级方便，首要推荐 |
| 2 | 发行版 + Nginx 独立部署 | 是 | 否 | 不使用项目镜像，希望自行管理 Nginx 配置与静态文件 |
| 3 | 直接导入 qBittorrent WebUI | 否 | 是 | 希望直接替换 qBittorrent 原生界面，不增加独立端口 |
| 4 | 从源码构建 | 取决于部署方式 | 取决于部署方式 | 开发、二次修改或需要构建最新 `main` 分支 |

> 首要推荐直接拉取 Docker Hub 镜像；GitHub Container Registry（GHCR）提供同一版本的备用镜像。两者都已包含 WebUI、Nginx 和 API 代理配置，无需手动下载发行版、解压文件或编写 Nginx 配置。

### 推荐安装方式一：Docker Hub 镜像（推荐）

镜像地址：[lowsabishi/qbittorrent-next-ui](https://hub.docker.com/r/lowsabishi/qbittorrent-next-ui)（Docker Hub，首选），备用镜像为 [ghcr.io/cainiao524/qbittorrent-next-ui](https://github.com/users/cainiao524/packages/container/package/qbittorrent-next-ui)（GHCR），均支持 `linux/amd64` 与 `linux/arm64`。`latest` 跟随最新稳定镜像，也可以使用固定版本标签 `v1.13.0-funky9`。

> 镜像内置 WebUI，开箱即用。如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」。

#### 写法 A（推荐）：`host.docker.internal` 自动指向宿主机

`host.docker.internal` 由 Docker 自动解析到宿主机，无需关心服务器 IP，跨平台通用：

- Docker Desktop（Windows / macOS）：直接可用，无需额外配置
- Linux / 群晖等 NAS：Docker 20.10+ 需添加 `extra_hosts: ["host.docker.internal:host-gateway"]`

创建 `docker-compose.yml`：

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
    restart: unless-stopped
```

启动：

```bash
docker compose pull
docker compose up -d
```

浏览器访问 `http://服务器地址:8088`，使用 qBittorrent WebUI 的账户登录。此方式不会修改 qBittorrent 的备用网页界面设置，原生界面仍可通过原端口访问。镜像内置 WebUI，开箱即用，无需挂载或管理 `webui` 文件。
> 如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」，直接在宿主机目录上修改。

#### 写法 B：直接填写宿主机局域网 IP（原有写法）
创建 `docker-compose.yml`：

```yaml
services:
  qbittorrent-next-ui:
    image: lowsabishi/qbittorrent-next-ui:latest
    container_name: qbittorrent-next-ui
    environment:
      QBITTORRENT_URL: http://192.168.1.10:8085
    ports:
      - "8088:80"
    restart: unless-stopped
```

将 `QBITTORRENT_URL` 改成 qBittorrent WebUI 的实际地址，然后启动：

```bash
docker compose pull
docker compose up -d
```

浏览器访问 `http://服务器地址:8088`，使用 qBittorrent WebUI 的账户登录。此方式不会修改 qBittorrent 的备用网页界面设置，原生界面仍可通过原端口访问。镜像内置 WebUI，开箱即用，无需挂载或管理 `webui` 文件。
> 如需修改 WebUI 文件进行调试或自定义，请使用「安装方式二：发行版 + Nginx 独立部署」，直接在宿主机目录上修改。

如果两个服务位于同一个 Compose 网络，可以把地址写成：

```yaml
environment:
  QBITTORRENT_URL: http://qbittorrent:8085
```

需要锁定当前版本时，将镜像改为：

```yaml
image: lowsabishi/qbittorrent-next-ui:v1.13.0-funky9
```

如果从 Docker Hub 拉取受限，可以把镜像地址换成 GHCR：

```yaml
image: ghcr.io/cainiao524/qbittorrent-next-ui:v1.13.0-funky9
```

#### 写法 C：docker run 快速启动

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


镜像内置 WebUI，开箱即用。浏览器访问 `http://服务器地址:8088`，使用 qBittorrent WebUI 的账户登录。



#### WebUI 目录挂载与实时更新机制

镜像默认内置 WebUI。如果你在 compose 中主动挂载 `./webui:/usr/share/nginx/html`，Nginx 会实时读取宿主机目录，替换文件后刷新即可生效，无需重建容器。该机制便于在 NAS 上直接解压发行版、随时切换或调试版本。
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

- 挂载目录会覆盖镜像内置页面，镜像升级后不会自动同步，需要手动更新 `webui` 目录中的文件。
- `assets` 静态文件带一年缓存头，切换版本后请强制刷新浏览器（Ctrl+F5）。
- 希望页面自动跟随镜像更新时，请在 compose 中移除 `volumes` 挂载，使用镜像内置 WebUI。

### 安装方式二：发行版 + Nginx 独立部署

这是原来的推荐安装方式，现调整为次要方式。它由通用 Nginx 容器提供发行版静态文件，并把同源 `/api/v2/` 请求转发给 qBittorrent。适合希望自行管理 Nginx 配置和 WebUI 文件的用户。

```text
浏览器
  └─ Nginx WebUI 端口
       ├─ /          → WebUI 静态文件
       └─ /api/v2/   → qBittorrent Web API
```

这种方式不会修改 qBittorrent 的备用界面设置，也不需要关闭浏览器跨域保护。

##### 第一步：准备目录和发行版

```bash
mkdir -p qbittorrent-next-ui-nginx/webui
cd qbittorrent-next-ui-nginx
curl -L https://github.com/cainiao524/qbittorrent-next-ui/releases/latest/download/qbittorrent-next-ui.zip -o qbittorrent-next-ui.zip
unzip qbittorrent-next-ui.zip -d webui
```

最终目录结构：

```text
qbittorrent-next-ui-nginx/
├─ docker-compose.yml
├─ nginx.conf
└─ webui/
   ├─ index.html
   └─ assets/
```

##### 第二步：确认 qBittorrent 的 Docker 网络

如果 qBittorrent 已经在 Docker 中运行，先查看它所在的网络：

```bash
docker inspect qbittorrent --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}'
```

假设输出为 `qbittorrent_default`。nginx 加入这个网络后，就能通过容器名 `qbittorrent` 访问 qBittorrent 的 WebUI 端口。

##### 第三步：创建 `docker-compose.yml`

```yaml
services:
  webui:
    image: nginx:alpine
    container_name: qbittorrent-next-ui
    ports:
      - "8098:80"
    volumes:
      - ./webui:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - qbittorrent_network
    restart: unless-stopped

networks:
  qbittorrent_network:
    external: true
    name: qbittorrent_default
```

把最后一行的 `qbittorrent_default` 改成上一步查询到的真实网络名。`8098` 是新界面对外访问端口，可以改成其他未占用端口。

##### 第四步：创建 `nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://qbittorrent:8085;
        proxy_http_version 1.1;
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

这里的 `qbittorrent` 是 qBittorrent 容器名，`8085` 是容器内部 WebUI 端口。如果你的容器名称或内部端口不同，请同步修改 `proxy_pass`。

> `proxy_pass` 不要附加 `/api/` 或 `/api/v2/`。当前写法会原样保留请求路径，例如 `/api/v2/auth/login` 会被正确转发到 qBittorrent。

##### qBittorrent 在宿主机或另一台服务器时

如果 qBittorrent 不在同一个 Docker 网络中，可以删除 Compose 文件中的 `networks` 配置，并在服务中增加：

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

然后把 nginx 配置改成宿主机地址：

```nginx
proxy_pass http://host.docker.internal:8085;
```

qBittorrent 位于另一台设备时，直接使用它的局域网地址，例如：

```nginx
proxy_pass http://192.0.2.20:8085;
```

`192.0.2.20` 是保留的文档示例地址，请替换成 qBittorrent 设备的真实局域网地址。请确保 qBittorrent WebUI 监听地址允许 nginx 所在设备访问，并且防火墙已放行对应端口。

##### 第五步：启动并验证

```bash
docker compose config
docker compose up -d
docker ps --filter name=qbittorrent-next-ui
curl -I http://127.0.0.1:8098/
curl -i http://127.0.0.1:8098/api/v2/app/version
```

- 页面请求应返回 `200`。
- API 请求在未登录时可能返回 `403`，这表示代理已经连通且 qBittorrent 正在要求认证。
- `502 Bad Gateway` 表示 nginx 无法连接 `proxy_pass` 指定的地址，应检查容器名、网络和端口。

验证完成后访问：

```text
http://服务器地址:8098
```

使用 qBittorrent WebUI 的用户名和密码登录。此部署方式不需要在 qBittorrent 中启用“备用网页用户界面”。

##### 更新 WebUI

先解压到新目录并保留旧版，确认文件完整后再切换：

```bash
curl -L https://github.com/cainiao524/qbittorrent-next-ui/releases/latest/download/qbittorrent-next-ui.zip -o qbittorrent-next-ui.zip
mkdir webui-new
unzip qbittorrent-next-ui.zip -d webui-new
mv webui "webui.backup.$(date +%Y%m%d-%H%M%S)"
mv webui-new webui
chmod -R a+rX webui
docker restart qbittorrent-next-ui
```

##### 常见问题

| 现象 | 检查方法 |
| --- | --- |
| 页面返回 `403` | 确认 `webui/` 及其中所有文件对 nginx 容器可读，可执行 `chmod -R a+rX webui` |
| API 返回 `502` | 检查 `proxy_pass`、qBittorrent 容器名、内部端口和 Docker 网络 |
| 登录一直失败 | 使用 qBittorrent 原生 WebUI 的账户；检查 qBittorrent 日志和主机头验证设置 |
| 页面仍是旧版本 | 强制刷新浏览器，或清除该站点缓存后重新打开 |
| 上传种子失败 | 确认 nginx 已设置足够大的 `client_max_body_size` |

不要在没有 HTTPS 和强密码保护的情况下把此端口直接暴露到公网。公网访问建议在外层增加可信反向代理、TLS 证书和访问控制。

### 安装方式三：直接导入 qBittorrent WebUI

这种方式把发行版文件设置为 qBittorrent 的备用网页用户界面。访问地址和端口保持不变，但启用后会直接替换原生界面，不需要额外运行 Nginx 容器。

#### 第一步：下载并解压发行版

打开 [Releases 页面](https://github.com/cainiao524/qbittorrent-next-ui/releases/latest)，下载 `qbittorrent-next-ui.zip`。也可以在 Linux 或 NAS 终端执行：

```bash
mkdir -p qbittorrent-next-ui-release
cd qbittorrent-next-ui-release
curl -L https://github.com/cainiao524/qbittorrent-next-ui/releases/latest/download/qbittorrent-next-ui.zip -o qbittorrent-next-ui.zip
unzip qbittorrent-next-ui.zip -d webui
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force qbittorrent-next-ui-release
Set-Location qbittorrent-next-ui-release
Invoke-WebRequest -Uri "https://github.com/cainiao524/qbittorrent-next-ui/releases/latest/download/qbittorrent-next-ui.zip" -OutFile "qbittorrent-next-ui.zip"
Expand-Archive -Path "qbittorrent-next-ui.zip" -DestinationPath "webui"
```

解压后的 `webui/` 应直接包含 `index.html`、`assets/` 和字体等静态文件。

#### 第二步 A：Docker 版 qBittorrent

把解压目录只读挂载到 qBittorrent 容器内的 `/webui`。以下为 LinuxServer.io 镜像示例：

```yaml
services:
  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    volumes:
      - ./config:/config
      - ./downloads:/downloads
      - ./qbittorrent-next-ui-release/webui:/webui:ro
```

重新创建容器使挂载生效：

```bash
docker compose up -d
```

然后在 qBittorrent 原生界面中完成启用：

1. 打开“工具 → 选项 → 网页用户界面”。
2. 启用“使用备用网页用户界面”。
3. 备用网页界面文件路径填写 `/webui`。
4. 保存设置并刷新浏览器。

> 第一次切换时建议保留一个已登录的原生界面页面。如果路径填写错误，可以关闭备用界面选项，或在停止 qBittorrent 后把配置文件中的 `WebUI\AlternativeUIEnabled` 改为 `false`。

#### 第二步 B：非 Docker 版 qBittorrent

把 `webui/` 放到 qBittorrent 运行用户有权读取的固定目录，例如 `/opt/qbittorrent-next-ui`，然后在“网页用户界面”设置中启用备用界面并填写该绝对路径：

```bash
sudo mkdir -p /opt/qbittorrent-next-ui
sudo cp -a webui/. /opt/qbittorrent-next-ui/
sudo chmod -R a+rX /opt/qbittorrent-next-ui
```

### 安装方式四：从源码构建（开发者）

#### 环境要求

- Git
- Node.js 22 或更高版本
- pnpm 10 或更高版本
- qBittorrent 4.x 或 5.x

#### 1. 获取源码并安装依赖

```bash
git clone https://github.com/cainiao524/qbittorrent-next-ui.git
cd qbittorrent-next-ui
pnpm install --frozen-lockfile
```

#### 2. 检查并构建

```bash
pnpm typecheck
pnpm test
pnpm build
```

构建成功后，生产文件位于 `dist/`：

```text
dist/
├─ index.html
└─ assets/
```

#### 3. 部署构建结果

将 `dist/` 中的全部文件复制到 qBittorrent 的备用网页界面目录，或复制到独立 nginx 的网页根目录。Docker 用户也可以直接使用仓库提供的 [docker-compose.yml](docker-compose.yml)：

```bash
docker compose up -d
```

仓库中的 Compose 配置会把本地 `dist/` 只读挂载到 qBittorrent 容器内的 `/webui`。首次启动后访问 `http://服务器地址:8085`，并在原生界面中把备用网页界面路径设置为 `/webui`。LinuxServer.io 镜像的临时管理员密码可通过以下命令查看：

```bash
docker compose logs qbittorrent
```

### 升级与回滚

发行版用户升级时，建议先保留旧目录，再解压新版本：

```bash
mv webui "webui.backup.$(date +%Y%m%d-%H%M%S)"
mkdir webui
unzip qbittorrent-next-ui.zip -d webui
docker restart qbittorrent
```

源码构建用户可以执行：

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
docker restart qbittorrent
```

如果新版本出现问题，停止服务后把当前 `webui` 移走，再将最近的 `webui.backup.*` 改回 `webui` 即可回滚。

## 本地开发

```bash
pnpm install
pnpm dev
```

开发服务器默认将 `/api` 代理至 `http://127.0.0.1:8080`。qBittorrent 位于其他地址时，可在启动前设置：

```bash
VITE_QBITTORRENT_PROXY_TARGET=http://192.0.2.10:8080 pnpm dev
```

Windows PowerShell：

```powershell
$env:VITE_QBITTORRENT_PROXY_TARGET = "http://192.0.2.10:8080"
pnpm dev
```

演示模式使用本地模拟数据，不会连接或修改真实 qBittorrent：

```bash
pnpm dev --mode demo
```

## 配置

| 环境变量 | 默认值 | 用途 |
| --- | --- | --- |
| `VITE_QBITTORRENT_API_URL` | `/api/v2` | 前端调用的 qBittorrent Web API 前缀 |
| `VITE_QBITTORRENT_PROXY_TARGET` | `http://127.0.0.1:8080` | 开发服务器代理目标 |
| `VITE_APP_DEMO` | `false` | 是否使用本地模拟数据 |

作为 qBittorrent 备用网页界面部署时，通常应保留 `VITE_QBITTORRENT_API_URL=/api/v2`。

## 开发

### 常用命令

```bash
pnpm typecheck
pnpm test
pnpm build
```

生产构建结果位于 `dist/`。

### 关键目录

```text
src/
├─ app/                 页面
├─ components/          界面组件
├─ hooks/               数据与交互逻辑
├─ lib/rpc-client.ts    qBittorrent Web API 适配层
├─ lib/rpc-client-mock.ts
└─ locales/             中英文翻译
```

## 接口兼容

界面层使用统一的种子模型，`src/lib/rpc-client.ts` 负责 qBittorrent 字段与接口转换，包括：

- Cookie 会话认证
- 哈希标识与批量操作
- 状态字符串映射
- 文件、Peer、Tracker 和任务属性聚合
- 应用偏好与全局传输状态映射
- qBittorrent 4 与 5 的操作接口兼容

接口实现参考 [qBittorrent WebUI API 文档](https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-%28qBittorrent-5.0%29)。

## 参与贡献

欢迎提交问题报告和合并请求。提交代码前请至少运行：

```bash
pnpm typecheck
pnpm test
```

## 许可证与来源

本项目沿用原项目的 [MIT 许可证](LICENSE)。二次分发时请保留许可证与来源说明。

- 上游界面：[hisproc/transmission-next-ui](https://github.com/hisproc/transmission-next-ui)
- qBittorrent：[qbittorrent/qBittorrent](https://github.com/qbittorrent/qBittorrent)
