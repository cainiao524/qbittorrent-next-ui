# 项目维护说明：qBittorrent Next & Transmission VibeMod

你是这两个开源项目（界面层 Web UI）的维护助手。请严格按本说明执行，遇到未授权操作先停下询问。

# 一、项目信息

| 项 | qBittorrent Next | Transmission VibeMod |
|---|---|---|
| 仓库 | https://github.com/cainiao524/qbittorrent-next-ui | https://github.com/cainiao524/transmission-next-vibemod |
| 镜像仓库 | lowsabishi/qbittorrent-next-ui + ghcr.io/cainiao524/... | lowsabishi/transmission-next-vibemod + ghcr.io/cainiao524/... |
| 版本后缀 | `-funky9` | `-baka9` |
| 技术栈 | Vite + React + TypeScript + Tailwind v4 + pnpm | 同左（与 qBittorrent 界面高度同步） |
| 当前已发布 | 以远端最新稳定 Release 为准 | 以远端最新稳定 Release 为准 |

两个项目的界面设计和大部分表格组件已同步：**任何修复必须先在 qBittorrent 实施并验证，再将等价修改同步到 Transmission，两项目 diff 保持一致**（唯一允许差异：项目名、ENV 变量、版本后缀）。

# 二、当前稳定生产基线

当前正式发布版本不得写死在维护说明中。接手任务时必须分别读取两个远端仓库最新的非草稿、非预发布 Release，并确认本地 `main` 与 `origin/main` 一致。

除非用户明确要求准备或发布新版本，否则禁止修改版本号、创建正式标签或 Release，以及更新正式镜像版本标签或 `latest`。

---

# 三、工作区准备（全新环境）

```bash
git clone https://github.com/cainiao524/qbittorrent-next-ui.git
git clone https://github.com/cainiao524/transmission-next-vibemod.git
cd <项目> && pnpm install --frozen-lockfile
```

- 构建/检查命令：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 本地 demo（无需后端）：`VITE_APP_DEMO=true pnpm dev`（用 src/lib/rpc-client-mock.ts）
- GitHub 访问不稳定时走本机代理：`export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890`
- gh CLI 已认证账号 cainiao524（repo + workflow 权限），git 走 HTTPS

# 四、版本发布规范（重要）

- 版本号修改位置：`package.json` 的 `version` 与 `src/lib/config.ts` 的 `APP_CONFIG.version`（界面显示，含 `⑨` 符号）
- 发布标签：qBittorrent `vX.Y.Z-funky9`，Transmission `vX.Y.Z-baka9`
- **禁止覆盖已存在的同名标签/Release**；发布前必须 `git ls-remote --tags origin` 确认
- 版本建议：保持两项目基础版本号一致；下次发布前读取两个远端仓库的最新稳定 Release，并与用户确认新版本号

# 五、标准工作流程（每次任务按此执行）

1. **先分析后修改**：读取代码、版本历史、现有测试；先复现并定位根因，给出最小修改方案，**等用户确认后再编辑**。
2. 从最新 main 创建独立分支（如 `fix/xxx` 或 `release/vX.Y.Z`）。
3. 本地跑完整检查链：`pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`。
4. 提交、推送分支、创建**草稿 PR**（净差异必须只含预期文件），等自动检查通过。
5. 用户确认后：转正式 → **squash merge**（不要普通 merge）→ 删除远端分支。
6. 拉取最新 main 验证：工作区干净、改动正确、无残留临时文件。
7. 发布（仅当用户明确要求）：从 main 打标签 → 推送标签 → 等待 Actions 完成 → 验证镜像/Release。

**未经用户确认，禁止：** 合并主线、打标签、发布版本、推送到正式分支、操作 NAS 正式容器。

# 六、已知技术背景（避免重复踩坑）

- **多架构构建**：Dockerfile builder 阶段已改为 `FROM --platform=$BUILDPLATFORM node:22-alpine AS builder`（前端只在原生平台构建，避免 arm64 QEMU 模拟 Node/pnpm 的 `qemu: uncaught target signal 4 (Illegal instruction)` 故障）。**不要回退此修复**。发布工作流 `docker-image.yml` 同时推 Docker Hub + GHCR，并含 export job 生成离线镜像附件。
- **文件详情列表**：种子"详情 → 文件"页面的表头/行滚动容器始终 `overflow-x-auto`、内层保持 `min-w-[900px]`（窄宽度在容器内横向滚动，不产生全局横向溢出）。**不要回退**。
- **Release 正文**：`build.yml` 的 softprops/action-gh-release 步骤已加 `generate_release_notes: true`，发布时自动生成正文。softprops/action-gh-release@v2 的 Node 20 弃用警告是非阻塞的，**不要顺手升级**（升级需另开分支）。
- 已知待评估（未实施）：方案二——单次多架构构建同时推送 Docker Hub 与 GHCR（需先评估凭据缺失、失败阻断、重试粒度）。

# 七、NAS 测试部署（仅当用户明确要求）

- NAS：`192.168.50.149`，SSH：`admin@192.168.50.149`（密钥认证，无密码）
- 测试容器（**只允许操作这两个**）：
  - `qbittorrent-next-ui-livetest` → `http://192.168.50.149:38088`
  - `transmission-next-vibemod-livetest` → `http://192.168.50.149:39095`
- 部署流程（必须严格遵守）：
  1. 只读检查容器/挂载/端口（`docker inspect`），路径不符立即停止汇报；
  2. 先备份：`cp -a webui webui-before-<YYYYMMDD-HHMMSS>`（验证存在、文件数非零、index.html 在）；
  3. 上传到 `webui-staging-<时间戳>`（**dist 目录里的内容**，不要多一层目录），核对 JS/CSS 哈希；
  4. 原子替换：`mv webui webui-old-<时间戳>` + `mv webui-staging-<时间戳> webui`；
  5. 目录被 mv 换名后 inode 变化，**必须重启测试容器**让 bind mount 重新解析；重启后若 403，检查 webui 目录权限（应为 root:root 755/644）；
  6. 部署后验证：HTTP 200、资源哈希一致、无 404、容器无 crash loop。
- **禁止**：操作正式容器、模糊通配符删除、影响其他容器的批量命令；部署后备份目录保留待用户决定。

# 八、验收与汇报要求

- 汇报必须包含：分支与提交哈希、改动文件与差异、测试结果、验证证据（日志/链接）、风险说明。
- 任何"失败后重跑"前必须先读完整日志分析根因，禁止盲目重跑。
- 不要在对话、日志或提交中记录任何登录密码。
- 修改前后注意行尾一致性（项目文件混合 CRLF/LF 时用字节级编辑避免 diff 噪声）。
