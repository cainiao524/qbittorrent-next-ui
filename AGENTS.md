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

**统一源码仓（本仓库）**：两个项目的界面只在这里开发一次。`src/` 是共享界面，`backends/qbittorrent` 与 `backends/transmission` 是各自的后端适配层（rpc-client、列定义、偏好设置、文案覆盖、config、发布元数据 `release.json`、仓库专属文件 `repo/`）。共享代码通过 `@backend/*` 引用后端模块，由 `BACKEND` 环境变量或 `package.json` 的 `backend` 字段选择，**共享代码中禁止出现按后端分支的判断**；后端专属功能用后端模块导出的组件或能力实现（如 `backends/*/toolbar-tools.tsx`）。

两个发布仓库（上表）由 `pnpm release` 生成并以 PR 同步，**不要在发布仓库直接改代码**；发布仓库只负责打标签、触发 Docker Hub / GHCR 发布。

# 二、当前稳定生产基线

当前正式发布版本不得写死在维护说明中。接手任务时必须分别读取两个远端仓库最新的非草稿、非预发布 Release，并确认本地 `main` 与 `origin/main` 一致。

除非用户明确要求准备或发布新版本，否则禁止修改版本号、创建正式标签或 Release，以及更新正式镜像版本标签或 `latest`。

---

# 三、工作区准备（全新环境）

```bash
pnpm install --frozen-lockfile
```

- 检查命令（均覆盖两个后端）：`pnpm check:versions`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build:all`
- 单个后端：`pnpm test:qb` / `pnpm test:tr`、`pnpm build:qb` / `pnpm build:tr`、`pnpm dev:qb` / `pnpm dev:tr`
- 本地 demo（无需后端）：`node scripts/with-backend.mjs transmission "vite --mode demo"`（用 `backends/<后端>/rpc-client-mock.ts`）
- 生成发布树（不推送）：`pnpm release`，输出到 `release-out/<仓库名>`；加 `--compare ..` 与本地已有的发布仓库 checkout 对比
- GitHub 访问不稳定时走本机代理：`export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890`
- gh CLI 已认证账号 cainiao524（repo + workflow 权限），git 走 HTTPS

# 四、版本发布规范（重要）

- 改版本号：`pnpm release <X.Y.Z 或热修 X.Y.Z-N> [--only qbittorrent|transmission]`，同时改写 `package.json` 与 `backends/*/config.ts` 的 `APP_CONFIG.version`（含 `⑨`），改完走 PR 合并
- 发布标签：qBittorrent `vX.Y.Z[-N]-funky9`，Transmission `vX.Y.Z[-N]-baka9`
- 发布仓库的 workflow 由 `release/workflows/*.yml` 模板渲染（占位符见 `scripts/release.mjs` 的 `renderWorkflow`），**只改模板，不改发布仓库里的生成结果**
- **禁止覆盖已存在的同名标签/Release**；发布前必须 `git ls-remote --tags origin` 确认
- 版本建议：保持两项目基础版本号一致；下次发布前读取两个远端仓库的最新稳定 Release，并与用户确认新版本号

# 五、标准工作流程（每次任务按此执行）

1. **先分析后修改**：读取代码、版本历史、现有测试；先复现并定位根因，给出最小修改方案，**等用户确认后再编辑**。
2. 从最新 main 创建独立分支（如 `fix/xxx` 或 `release/vX.Y.Z`）。
3. 本地跑完整检查链（两个后端）：`pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build:all` → `pnpm release`（生成发布树自检）。
4. 提交、推送分支、创建**草稿 PR**（净差异必须只含预期文件），等自动检查通过。
5. 用户确认后：转正式 → **squash merge**（不要普通 merge）→ 删除远端分支。
6. 拉取最新 main 验证：工作区干净、改动正确、无残留临时文件。
7. 发布（仅当用户明确要求）：用 `pnpm release <版本>` 改版本号，走 PR。**用户合并这个版本 PR 即为发版确认**，之后全自动：本仓库「同步到发布仓库」检查两个后端 → 为尚未发布该版本的发布仓库开同步 PR → 等发布仓库检查通过后 squash merge → 发布仓库 `auto-release.yml` 打标签并调起 `docker-image.yml` → Docker Hub / GHCR / Release。之后验证镜像与 Release。任一步失败即停止，不会部分发布；读完整日志定位根因后再重跑。第一次同步（发布仓库还没有 `.github/SYNCED_FROM`）只开草稿 PR，必须人工审阅合并。同步脚本发现发布仓库有非同步产生的提交时会停止，需先把那些提交移植回本仓库。

**未经用户确认，禁止：** 合并主线、打标签、发布版本、推送到正式分支、操作 NAS 正式容器。（发版流程中，同步 PR 的自动合并和自动打标签由用户合并版本 PR 授权，不需要再次确认；不得手动绕过这条链路打标签或合并同步 PR。）

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
