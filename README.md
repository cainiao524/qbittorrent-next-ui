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
  <img src="https://img.shields.io/badge/qBittorrent-4.x%20%7C%205.x-2f67ba" alt="qBittorrent 兼容版本" />
  <img src="https://img.shields.io/badge/React-19-149eca" alt="React 版本" />
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#作为备用网页界面部署">部署</a> ·
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

## 快速开始

### 环境要求

- Node.js 22 或更高版本
- pnpm 10 或更高版本
- qBittorrent 4.x 或 5.x

### 本地开发

```bash
pnpm install
pnpm dev
```

开发服务器默认将 `/api` 代理至 `http://127.0.0.1:8080`。qBittorrent 位于其他地址时，可在启动前设置：

```bash
VITE_QBITTORRENT_PROXY_TARGET=http://192.168.1.10:8080 pnpm dev
```

Windows PowerShell 示例：

```powershell
$env:VITE_QBITTORRENT_PROXY_TARGET = "http://192.168.1.10:8080"
pnpm dev
```

### 演示模式

```bash
pnpm dev --mode demo
```

演示模式使用本地模拟数据，不会连接或修改真实的 qBittorrent 实例。

## 作为备用网页界面部署

### 手动部署

1. 构建生产文件：

   ```bash
   pnpm install
   pnpm build
   ```

2. 将 `dist/` 中的全部文件复制到 qBittorrent 可以读取的目录，例如 `/webui`。
3. 在 qBittorrent 原生界面打开“设置 → 网页用户界面”。
4. 启用“使用备用网页用户界面”，并将文件路径设置为 `/webui`。
5. 保存设置并刷新页面。

如果备用界面路径设置错误，可以通过修改 qBittorrent 配置文件关闭 `WebUI\AlternativeUIEnabled`，再重新启动 qBittorrent。

### Docker Compose

仓库中的 [docker-compose.yml](docker-compose.yml) 使用 LinuxServer.io 的 qBittorrent 镜像，并把本地 `dist/` 只读挂载至容器内的 `/webui`：

```bash
pnpm build
docker compose up -d
```

首次启动后访问 `http://服务器地址:8080`。临时管理员密码可在容器日志中查看：

```bash
docker compose logs qbittorrent
```

登录原生界面后，将备用网页界面路径设置为 `/webui`。

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
