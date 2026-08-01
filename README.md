# qBittorrent Next UI

一个面向 qBittorrent 的现代化第三方网页界面，基于 React、Vite、Tailwind CSS 与 shadcn/ui 构建。

本项目由 [Transmission Next UI](https://github.com/hisproc/transmission-next-ui) 改造而来，保留其响应式界面与组件结构，后端已经替换为 qBittorrent Web API v2。

> 当前版本为 `0.1.0`。核心功能已经可用，但仍建议先在测试环境验证，再替换正在使用的网页界面。

## 已实现功能

- qBittorrent 会话登录与自动验证
- 种子列表和网格视图
- 搜索、状态筛选、Tracker 筛选、目录筛选和标签筛选
- 启动、停止、删除、重新校验和重新汇报
- 磁力链接及多个 `.torrent` 文件添加
- 种子重命名、移动目录、速度限制和分享率限制
- 批量移动目录、批量修改标签、批量替换 Tracker
- 种子详情、文件、Peer 与 Tracker 信息
- qBittorrent 全局速度、队列、网络与下载目录设置
- 自动刷新、深色模式和中英文界面
- qBittorrent 5 的 `start`、`stop` 端点，并兼容 qBittorrent 4 的 `resume`、`pause` 端点

## 开发运行

要求 Node.js 22 或更高版本，以及 pnpm 10 或更高版本。

```bash
pnpm install
pnpm dev
```

开发服务器默认把 `/api` 代理到 `http://127.0.0.1:8080`。如 qBittorrent 位于其他地址，可在启动前设置：

```bash
VITE_QBITTORRENT_PROXY_TARGET=http://192.168.1.10:8080 pnpm dev
```

也可以通过 `VITE_QBITTORRENT_API_URL` 修改前端使用的 API 前缀；作为 qBittorrent 替代网页界面部署时应保留默认值 `/api/v2`。

## 构建与验证

```bash
pnpm typecheck
pnpm test
pnpm build
```

构建结果位于 `dist/`。

## 安装为 qBittorrent 替代网页界面

1. 执行 `pnpm build`。
2. 将 `dist/` 中的全部文件复制到 qBittorrent 可以读取的目录，例如 `/webui`。
3. 在 qBittorrent 原生网页界面中打开“设置 → 网页用户界面”。
4. 启用“使用替代网页用户界面”，并将文件路径设置为 `/webui`。
5. 保存后刷新页面。

建议在启用前保留一个已登录的原生界面页面，以便路径配置错误时能够快速恢复。

## 容器示例

仓库内的 `docker-compose.yml` 使用 LinuxServer.io 的 qBittorrent 镜像，并把本地 `dist/` 只读挂载到容器内的 `/webui`：

```bash
pnpm build
docker compose up -d
```

首次启动后访问 `http://服务器地址:8080`。初始管理员临时密码会出现在容器日志中。登录原生界面后，将替代网页界面路径设置为 `/webui`。

## 接口映射

界面层使用统一的种子模型，`src/lib/rpc-client.ts` 负责完成 qBittorrent 字段和端点转换，包括：

- Cookie 会话认证
- 状态字符串到界面状态的转换
- 哈希标识与批量操作
- 应用偏好设置映射
- 文件、Peer、Tracker 和种子属性聚合
- qBittorrent 4 与 5 的操作端点兼容

## 许可证与来源

本项目延续原项目的 MIT 许可证。二次分发时请保留 `LICENSE` 及本节中的来源说明。
