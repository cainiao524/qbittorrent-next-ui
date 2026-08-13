# AGENTS.md

# qBittorrent Next & Transmission VibeMod 项目维护规范

本文件用于约束 AI、Codex 以及其他自动化开发助手维护以下两个项目时的行为。

所有维护任务必须优先遵守本文件。

如果用户当前对话中的明确指令与本文件存在冲突，以用户当前明确授权为准。

对于高风险或不可逆操作，如果用户没有明确授权，必须停止并询问。

---

# 一、项目基本信息

## qBittorrent Next

仓库：

https://github.com/cainiao524/qbittorrent-next-ui

Docker Hub：

lowsabishi/qbittorrent-next-ui

GHCR：

ghcr.io/cainiao524/qbittorrent-next-ui

正式 Tag 格式：

```text
vX.Y.Z-funky9
```

界面显示版本格式：

```text
vX.Y.Z-funky⑨
```

---

## Transmission VibeMod

仓库：

[https://github.com/cainiao524/transmission-next-vibemod](https://github.com/cainiao524/transmission-next-vibemod)

Docker Hub：

lowsabishi/transmission-next-vibemod

GHCR：

ghcr.io/cainiao524/transmission-next-vibemod

正式 Tag 格式：

```text
vX.Y.Z-baka9
```

界面显示版本格式：

```text
vX.Y.Z-baka⑨
```

---

## 技术栈

两个项目主要使用：

* Vite
* React
* TypeScript
* Tailwind CSS v4
* pnpm
* Radix UI
* shadcn
* dnd-kit
* TanStack React Virtual
* Vitest

两个项目的 Web UI 设计和大部分共享组件保持高度同步。

---

# 二、当前稳定生产基线

当前正式发布版本不得写死在维护说明中。接手任务时必须分别执行：

```bash
gh release view --repo cainiao524/qbittorrent-next-ui
gh release view --repo cainiao524/transmission-next-vibemod
```

以两个远端仓库最新的非草稿、非预发布 Release 为生产基线，并确认本地 `main` 与 `origin/main` 一致。

除非用户明确要求准备或发布新版本，否则禁止：

* 修改 `package.json` 中的 `version`
* 修改 `src/lib/config.ts` 中的 `APP_CONFIG.version`
* 创建 `release/vX.Y.Z`
* 创建正式 Git Tag
* 创建正式 GitHub Release
* 更新正式 Docker 版本标签
* 更新 Docker `latest`
* 将普通修复自动解释为版本发布

普通功能开发、Bug 修复、性能优化、测试和 NAS livetest 部署不得自动提高版本号。

---

# 三、双仓库同步原则

两个项目共享绝大多数：

* UI
* Sidebar
* Torrent 列表
* 表格
* Toolbar
* Button
* Motion
* 布局
* 性能优化逻辑
* 测试结构

共享 UI、性能和表格修复的默认流程：

```text
qBittorrent
↓
先实施
↓
本地验证
↓
确认行为正确
↓
将等价修改同步到 Transmission
↓
再次验证
```

目标是：

```text
共享逻辑保持等价同步
```

而不是：

```text
两个仓库所有文件逐字节完全一致
```

---

# 四、合法项目差异

必须保留项目特有代码。

允许存在的差异包括但不限于：

* 项目名称
* package 名称
* ENV 变量
* 后端连接地址
* qBittorrent API 实现
* Transmission RPC 实现
* RPC 字段差异
* 后端能力差异
* add-torrent 事件名称
* ThemeProvider 等项目特有 Provider
* Docker 配置差异
* README 部署说明差异
* 项目截图
* 品牌文字
* 版本后缀
* 后端能力不同导致的 UI 差异

例如：

qBittorrent 可以存在：

```text
ThemeProvider
```

而 Transmission 不一定存在。

事件名也允许不同，例如：

qBittorrent：

```text
qbittorrent:add-torrent
```

Transmission：

```text
transmission:add-torrent
```

禁止为了"保持 diff 一致"删除这些合法差异。

---

# 五、双仓库同步操作规则

同步修改前必须先读取两个项目当前版本的对应文件。

禁止：

```text
直接使用 qB 的完整文件覆盖 Transmission
```

或反向覆盖。

正确流程：

```text
读取 qB 文件
+
读取 Transmission 文件
↓
识别共享逻辑
↓
同步等价修改
↓
保留项目特有实现
```

涉及两个项目的任务完成后，应明确说明：

* 哪些修改完全一致
* 哪些差异是项目特有差异
* 是否存在未同步内容
* 未同步的原因

---

# 六、全新工作环境准备

首次进入新的开发环境：

```bash
git clone https://github.com/cainiao524/qbittorrent-next-ui.git
git clone https://github.com/cainiao524/transmission-next-vibemod.git
```

安装依赖：

```bash
cd <项目目录>
pnpm install --frozen-lockfile
```

标准检查链：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## Demo 模式

无需真实后端时可以运行：

```bash
VITE_APP_DEMO=true pnpm dev
```

Demo RPC：

```text
src/lib/rpc-client-mock.ts
```

---

## GitHub 网络代理

GitHub 访问不稳定时，可使用：

```bash
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
```

当前开发环境：

```text
gh CLI 已认证：cainiao524
git 使用 HTTPS
```

禁止在日志、Commit、PR 或对话中输出 GitHub Token。

---

# 七、默认工作模式

默认执行顺序：

```text
分析
↓
定位根因
↓
提出最小修改方案
↓
用户确认
↓
修改
↓
测试
↓
汇报
```

收到新的：

* Bug
* UI 问题
* 性能问题
* 功能请求
* CI 问题

时，默认先只读分析。

---

# 八、修改前的只读检查

开始任何实际修改前，应根据任务需要检查：

```bash
git status
git branch --show-current
git log -5 --oneline
git remote -v
git fetch origin
```

必要时比较：

```bash
git diff
git diff origin/main...HEAD
```

同时读取：

* 相关源码
* 现有测试
* 历史实现
* Git 历史
* 当前架构

分析报告至少说明：

* 当前行为
* 预期行为
* 根因
* 修改范围
* 最小解决方案
* 风险

默认情况下，在用户确认前不得编辑源码。

---

# 九、连续执行授权

如果用户在当前任务中明确说：

```text
持续执行到完成
```

或：

```text
中途无需确认
```

或：

```text
直接部署 NAS 测试
```

则允许在用户明确授权的范围内连续执行。

例如：

用户明确要求：

```text
修改并部署到 NAS livetest，中途不用确认
```

则可以执行：

```text
修改
→
lint
→
typecheck
→
test
→
build
→
NAS livetest 部署
→
验证
```

但是这并不自动授权：

* Merge main
* Git Tag
* GitHub Release
* 正式 Docker 发布
* 操作 NAS 正式容器
* 删除 NAS 备份

这些操作仍需要明确授权。

---

# 十、高风险操作授权规则

除非用户明确授权，否则禁止：

* 直接修改 main
* Merge main
* 创建或移动正式 Git Tag
* 删除历史 Tag
* 覆盖历史 Tag
* 发布 GitHub Release
* 删除历史 Release
* 替换历史 Release 资产
* 更新正式 Docker 镜像
* 更新 Docker `latest`
* 操作 NAS 正式容器
* 删除 NAS 备份
* 修改 GitHub Secrets
* 修改 Docker Hub 凭据
* 修改 SSH 配置
* 修改 NAS 防火墙

遇到授权不明确时必须停止询问。

---

# 十一、Git 分支规范

任何源码、测试、CI 或文档修改都应从最新 main 创建独立分支。

修改前：

```bash
git checkout main
git pull --ff-only
git status
```

确认工作区干净。

分支示例：

```text
fix/sidebar-active-state
fix/torrent-table-overflow
perf/torrent-list-render
perf/route-switching
feat/playwright-smoke
chore/ci-sync-check
docs/add-agents-md
release/v1.18.0
```

禁止直接在 main 上开发。

---

# 十二、Commit 规范

Commit Message 必须描述真实修改。

推荐：

```text
fix(ui): prevent file table global overflow
perf(torrents): reduce row rendering during category switch
test(e2e): add torrent details overflow smoke test
chore(ci): add shared file consistency check
docs: add project maintenance guide
```

禁止：

```text
update
fix
changes
stuff
123
test
modify
```

如果一次任务包含多个独立问题，应尽量拆成逻辑明确的 Commit。

---

# 十三、Pull Request 工作流

完成本地验证后：

```text
功能分支
↓
Push
↓
Draft PR
↓
自动 CI
↓
用户确认
↓
Ready
↓
Squash Merge
↓
删除远端分支
```

PR Body 应说明：

* 问题
* 根因
* 修改方案
* 修改文件
* 测试结果
* 风险
* NAS 验证结果（如有）

必须确认 PR 净差异只包含预期内容。

---

## 禁止进入 PR 的内容

包括但不限于：

* `dist`
* `node_modules`
* `.env`
* Token
* SSH Key
* Docker Hub Token
* GitHub Token
* Profiler 临时文件
* Performance JSON
* 临时 Mock 大数据
* NAS 临时文件
* 调试截图
* 无关 formatter 变化
* 临时代理配置

---

# 十四、Merge 规范

默认使用：

```text
Squash Merge
```

除非用户明确要求，否则禁止普通 Merge Commit。

Merge 前必须：

* PR Diff 正确
* CI 全绿
* 用户明确授权

Merge 后：

* 删除远端功能分支
* 拉取最新 main
* 确认工作区干净

---

# 十五、标准检查链

所有实际代码修改完成后必须运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

不得仅因为修改很小就跳过。

---

# 十六、失败处理规则

如果：

* lint
* typecheck
* test
* build
* GitHub Actions
* Docker build

失败，

禁止直接无分析重跑。

必须：

```text
读取完整日志
↓
确认根因
↓
判断是确定性失败还是外部环境问题
↓
处理根因
↓
重新运行
```

禁止：

```text
"可能只是偶发，再跑一次看看"
```

如果确实判断为外部网络/代理瞬态故障，应明确说明证据后再重试。

---

# 十七、Torrent 数据架构保护

Torrent 分类页面采用：

```text
单一后端同步数据快照
+
前端派生视图
```

架构：

```text
qBittorrent / Transmission
          ↓
Torrent Data Snapshot
          ↓
Front-end Cache
          ↓
Filter
          ↓
Sort
          ↓
Pagination / Virtualization
          ↓
Render
```

以下页面：

```text
全部
活动
下载中
做种中
已停止
```

应基于同一份 Torrent 数据派生。

分类切换不得重新向后端请求完整 Torrent 列表。

目标：

```text
分类切换新增 Torrent RPC = 0
```

禁止重新实现"每个分类独立请求后端"。

---

# 十八、TorrentView 生命周期保护

历史上已经修复过：

```text
statusFilter 改变
→ TorrentView 强制 remount
→ 大量列表重新创建
→ 页面切换卡顿
```

禁止重新引入类似：

```tsx
key={statusFilter}
```

或任何等价的强制 remount。

分类切换应更新视图状态，而不是销毁 TorrentView。

---

# 十九、TorrentRow 性能保护

当前已经实施过的性能设计不得无理由回退，包括：

* TorrentRow 使用 React.memo
* 稳定 Callback
* `selectedIdSet`
* 减少行级路由订阅
* 页面级单实例 EditTorrentDialog
* DOM 行复用
* TanStack React Virtual
* 分类切换复用已有 Torrent 数据

不得因为：

```text
代码看起来更简单
```

而回退这些优化。

---

# 二十、虚拟列表保护

当前大列表已使用：

```text
@tanstack/react-virtual
```

涉及虚拟列表修改时必须验证：

* 固定或动态行高
* overscan
* 横向滚动
* 表头列宽
* 行列宽同步
* Shift 连选
* 全选
* 单选
* 编辑
* 删除
* 开始/停止
* 高级菜单
* 排序
* 搜索
* Filter
* 页面切换
* 滚动恢复

不得仅验证"列表能显示"。

---

# 二十一、大量 Torrent 性能测试

性能问题不得仅凭主观感受判断。

应在修改前后使用相同条件测试。

建议规模：

```text
100 torrents
500 torrents
1000+ torrents
```

分类切换：

```text
全部
→ 下载中
→ 做种中
→ 活动
→ 已停止
```

快速连续切换：

```text
全部
下载中
做种中
活动
已停止
```

建议记录：

* React commit
* Script
* Recalculate Style
* Layout
* Paint
* Long Task
* DOM 行数量
* RPC 数量

应特别关注：

```text
Sidebar 点击反馈
是否被 Torrent 列表更新阻塞
```

---

# 二十二、性能优化原则

优先优化真实瓶颈。

禁止看到：

```text
1000 torrents
```

就直接假设：

```text
filter/sort 一定是瓶颈
```

必须通过性能测量判断。

历史性能诊断表明：

* RPC 不一定是分类切换瓶颈
* Filter/Sort 成本可能远低于 DOM/React Render
* 当前页 DOM 数量可能比总 Torrent 数量更重要
* 后台刷新可能与用户交互争用主线程

修改应根据实际证据进行。

---

# 二十三、后台刷新保护

后端刷新可能返回新的 Torrent 对象。

涉及对象复用、memo comparator 或增量更新时必须保证动态字段及时更新。

包括但不限于：

* 状态
* 下载速度
* 上传速度
* 进度
* Ratio
* peers
* seeds
* 已完成大小
* 总大小
* 名称
* 保存路径

禁止为了提高 memo 命中率导致 UI 数据滞后。

---

# 二十四、Sidebar 保护规则

Sidebar 已经过多轮布局和 Motion 修复。

除非当前任务明确针对 Sidebar，否则禁止重新设计 Sidebar。

稳定原则：

* 展开/收起状态单一来源
* 状态持久化
* 首次访问默认展开
* Active Indicator 层级正确
* Active / Hover 优先级正确
* 图标和文字不会因 hover 消失
* Sidebar 与 Topbar 对齐稳定
* 避免布局变化型动画
* 避免 `transition-all`

不要重新引入：

* 随意 `translateX`
* 负 z-index Active Background
* 用 `display:none` 中断文字动画
* 大量 `!important`
* `setTimeout` 修复布局
* 滚动后才校正布局
* 修改 icon 自身位置来补偿容器布局错误

---

# 二十五、按钮与鼠标交互 Motion

按钮和鼠标交互优先保证即时响应。

优先动画：

```text
transform
opacity
color
background-color
border-color
```

避免：

```text
width
height
padding
margin
filter
blur
brightness
大型 box-shadow
```

推荐 Hover：

```text
120–160ms
```

推荐 Pressed：

```text
80–120ms
```

推荐 easing：

```css
cubic-bezier(0.2, 0, 0, 1)
```

禁止为了动画改变按钮真实尺寸。

尽量避免：

```text
transition-all
scale-110
大型阴影动画
brightness filter
```

普通 Button、Toolbar Button、Row Action Button、Menu Trigger 的反馈应保持一致。

---

# 二十六、详情页与列表状态保护

当前进入 Torrent 详情页时：

```text
TorrentView 保留实例
```

而不是完全销毁列表。

目的：

* 保留 Torrent Cache
* 保留 Filter
* 保留排序
* 保留列表状态
* 返回时恢复滚动位置

当前结构允许详情显示时隐藏 TorrentView，同时保留其生命周期。

涉及以下修改时必须保护这一行为：

* React.lazy
* Suspense
* Router
* AppRoutes
* TorrentDetailsPage
* 页面代码分割
* 详情页重构

必须验证：

```text
Torrent List
→ Torrent Details
→ Back
```

后：

* 列表状态仍在
* 滚动位置正确恢复
* 不重新请求无必要的数据
* 不出现列表 remount

---

# 二十七、文件详情列表保护

Torrent：

```text
详情
→ 文件
```

页面历史上修复过窄视口和高缩放时的全局横向溢出。

稳定原则：

外层滚动容器：

```text
overflow-x-auto
```

内层表格区域：

```text
min-w-[900px]
```

窄视口或浏览器 200% 缩放时：

允许：

```text
文件列表容器内部横向滚动
```

禁止：

```text
整个网页产生全局横向滚动
```

表头与数据行必须保持列宽同步。

不要回退这项修复。

---

# 二十八、localStorage 与列布局保护

Torrent 表格的：

* 列宽
* 列显示状态
* 列顺序
* Header 布局

存在历史 localStorage 状态兼容问题。

当前：

```text
use-column-manager.ts
```

中已经存在历史迁移保护，例如：

```text
header-expansion-rollback-v1
```

修改列系统时必须测试：

```text
全新用户
+
已有 localStorage 用户
```

禁止只在清空浏览器状态后验证。

---

# 二十九、国际化保护

当前已有 i18n 测试保护，例如：

```text
i18n-locales.test.ts
```

新增 UI 文本必须考虑现有国际化结构。

不得只加入单语言文本后绕过测试。

i18n 修改后必须运行完整测试。

---

# 三十、路由级代码分割

当前可评估候选：

```text
TorrentDetailsPage
SettingsPage
```

可以考虑：

```text
React.lazy
Suspense
```

但代码分割不得破坏：

* TorrentView 保留实例
* 返回列表滚动恢复
* 路由行为
* 加载状态
* Error Boundary 行为

先建立基线，再修改，再比较首屏 bundle。

---

# 三十一、manualChunks 原则

不要因为看到：

```text
单 bundle 较大
```

就直接加入 `manualChunks`。

正确顺序：

```text
先做真正有意义的 lazy splitting
↓
重新 build
↓
分析 bundle
↓
再决定 manualChunks
```

manualChunks 主要可能改善缓存和 chunk 组织。

它不天然降低首次必须下载或执行的 JavaScript。

---

# 三十二、未使用依赖

如果怀疑依赖未使用，例如：

```text
@fontsource-variable/inter
```

删除前必须：

* 全仓库搜索 import
* 检查 CSS
* 检查动态 import
* 检查构建配置
* 检查测试

确认未使用后才能删除。

不要把"看起来没用"当作证据。

---

# 三十三、Playwright E2E 候选

Playwright E2E 属于高价值候选项。

可优先覆盖：

* Demo 登录/进入列表
* Torrent 列表
* 详情页面
* 文件页面
* 返回滚动位置
* Sidebar 分类切换
* 快速连续切换
* 200% 浏览器缩放
* 全局横向溢出
* 表头与数据行同步

这是用于捕获 jsdom/Vitest 无法发现的真实浏览器布局回归。

实施前仍需用户确认。

---

# 三十四、双仓库一致性 CI

可以评估自动检查共享文件一致性。

禁止简单执行：

```text
diff repoA repoB
```

因为两个项目存在合法差异。

正确设计应包含：

```text
共享文件集合
+
允许差异白名单
+
必要的归一化规则
```

必须避免把：

* ThemeProvider
* RPC
* ENV
* 事件名
* 后端字段差异

误判为 Bug。

---

# 三十五、Docker 多架构构建保护

Dockerfile Builder 已采用：

```dockerfile
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
```

这是重要稳定性修复。

目的：

```text
Node/pnpm 前端构建
只在原生 BUILDPLATFORM 执行
```

避免：

```text
ARM64
↓
QEMU
↓
Node/pnpm
↓
qemu: uncaught target signal 4
Illegal instruction
```

禁止回退该设计。

历史错误方案曾导致约 30 分钟 timeout。

当前正确方案的 Builder 应在数分钟级完成。

---

# 三十六、Docker BuildKit Cache

当前 `docker-image.yml` 已使用 GHA BuildKit Cache：

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

不要重复添加另一套等价 GHA cache。

如果修改缓存方案，必须先证明当前方案存在实际问题。

---

# 三十七、Docker 发布结构

正式 Tag 会触发：

* Docker Hub
* GHCR
* linux/amd64
* linux/arm64
* multiarch
* Release 离线镜像

正式 Release 资产预期包括：

```text
WebUI ZIP
*-docker-amd64.tar.gz
*-docker-arm64.tar.gz
*-docker-multiarch.tar.gz
```

---

# 三十八、Docker Hub 与 GHCR

qBittorrent：

```text
Docker Hub:
lowsabishi/qbittorrent-next-ui

GHCR:
ghcr.io/cainiao524/qbittorrent-next-ui
```

Transmission：

```text
Docker Hub:
lowsabishi/transmission-next-vibemod

GHCR:
ghcr.io/cainiao524/transmission-next-vibemod
```

正式发布后应验证：

* 固定版本 Tag
* latest
* amd64
* arm64
* manifest/index

不得只根据 Actions 显示 success 就认为镜像一定正确。

---

# 三十九、Docker 单次构建推双仓库方案

目前仅属于：

```text
待评估
```

不得直接实施。

实施前必须评估：

* 两个项目镜像内容是否真正一致
* Docker Hub 凭据缺失
* Docker Hub Push 失败
* GHCR Push 失败
* 单 Registry 失败是否阻断另一 Registry
* 重试粒度
* Release 资产归属
* Digest 一致是否有实际价值

优先考虑：

```text
共享 reusable workflow
```

而不是强制两个不同产品共享同一个构建产物。

---

# 四十、GitHub Release 正文

当前发布 Workflow 使用自动 Release Notes。

例如：

```text
generate_release_notes: true
```

正式 Tag 后由 GitHub 自动生成 Release 正文。

不要在无关任务中修改 Release 流程。

---

# 四十一、GitHub Actions Node.js 警告

部分第三方 Actions 可能出现 Node.js 20 Runtime 弃用警告。

可能涉及：

* docker/build-push-action
* docker/login-action
* docker/setup-buildx-action
* softprops/action-gh-release

如果当前仍能正常执行：

```text
属于非阻塞警告
```

禁止在其他任务中顺手升级这些 Actions。

升级必须单独开：

```text
chore/ci-*
```

分支进行验证。

---

# 四十二、版本号修改位置

正式发布时版本号至少需要同步修改：

```text
package.json
src/lib/config.ts
```

例如：

`package.json`：

```json
"version": "1.18.0"
```

qB 界面版本：

```text
v1.18.0-funky⑨
```

Transmission 界面版本：

```text
v1.18.0-baka⑨
```

两个项目的基础版本号应保持一致。

---

# 四十三、Tag 规范

qB：

```text
vX.Y.Z-funky9
```

Transmission：

```text
vX.Y.Z-baka9
```

发布前必须运行：

```bash
git ls-remote --tags origin
```

确认目标 Tag 不存在。

禁止：

* 覆盖旧 Tag
* force move Tag
* 删除历史 Tag 后重新创建
* 把新 Commit 绑定到已有正式 Tag

Tag 必须精确指向经过验证的 main Commit。

---

# 四十四、正式发布流程

只有用户明确要求正式发布时才能执行。

标准流程：

```text
最新 main
↓
release/vX.Y.Z
↓
修改版本号
↓
完整检查
↓
Draft PR
↓
CI
↓
用户确认
↓
Ready
↓
Squash Merge
↓
main CI
↓
Tag
↓
GitHub Actions
↓
Docker Hub
↓
GHCR
↓
Release
↓
最终验证
```

禁止跳过 main 验证直接打 Tag。

---

# 四十五、正式 Release 历史保护

历史正式版本属于不可变发布记录。

禁止：

* 修改旧 Tag 指向
* 覆盖旧 Release
* 删除旧 Release 后以同名重建
* 用新镜像替换旧版本附件
* 修改旧版本使其表现为新代码

如果旧版本存在问题：

发布新的 Patch 版本。

例如：

```text
v1.17.5
→
v1.17.6
```

而不是修改 v1.17.5。

---

# 四十六、NAS 测试环境

仅当用户明确要求 NAS 测试部署时使用。

NAS：

```text
192.168.50.149
```

SSH：

```text
admin@192.168.50.149
```

认证：

```text
SSH Key
```

禁止要求用户提供 SSH 密码。

禁止输出 SSH 私钥。

---

# 四十七、NAS 测试容器

只允许操作以下测试容器。

qBittorrent：

```text
qbittorrent-next-ui-livetest
```

访问地址：

```text
http://192.168.50.149:38088
```

Transmission：

```text
transmission-next-vibemod-livetest
```

访问地址：

```text
http://192.168.50.149:39095
```

除非用户明确授权：

禁止操作任何其他 NAS 容器。

---

# 四十八、NAS 路径必须动态确认

即使本文档记录了历史部署方式，

每次 NAS 部署前仍必须重新执行：

```bash
docker inspect qbittorrent-next-ui-livetest
docker inspect transmission-next-vibemod-livetest
```

确认：

* Container Name
* Container State
* Bind Mount Source
* Bind Mount Destination
* Port Mapping

实际部署路径必须以：

```text
当次 docker inspect
```

为准。

禁止猜：

* webui 路径
* mount source
* volume
* 端口
* Container ID

如果实际路径和预期不一致：

```text
立即停止
↓
汇报
↓
等待用户确认
```

---

# 四十九、NAS 测试部署第一步：只读检查

部署前先只读检查：

```bash
docker inspect <livetest-container>
```

确认：

* 容器存在
* 容器运行中
* Mount 正确
* WebUI 路径正确
* Port 正确

路径不符不得继续。

---

# 五十、NAS 测试部署第二步：备份

部署新版本前必须备份当前 WebUI。

命名：

```text
webui-before-YYYYMMDD-HHMMSS
```

例如：

```bash
cp -a webui webui-before-20260811-080000
```

必须验证：

* 备份目录存在
* 文件数量非零
* `index.html` 存在

备份验证失败：

停止部署。

---

# 五十一、NAS 测试部署第三步：Staging

新构建先上传到：

```text
webui-staging-YYYYMMDD-HHMMSS
```

上传的是：

```text
dist 目录内部的内容
```

正确：

```text
webui-staging/index.html
webui-staging/assets/...
```

错误：

```text
webui-staging/dist/index.html
```

禁止多出一层 `dist`。

---

# 五十二、NAS Staging 验证

替换前检查：

* `index.html`
* JS
* CSS
* 文件数量
* 资源哈希

需要确认：

```text
NAS staging
与
当前本地 dist
```

对应。

不能仅看到文件存在就继续。

---

# 五十三、NAS 原子替换

采用：

```text
webui
→
webui-old-时间戳

webui-staging
→
webui
```

例如：

```bash
mv webui webui-old-20260811-080000
mv webui-staging-20260811-080000 webui
```

禁止：

```text
先 rm -rf webui
再复制
```

必须保留可快速回滚的旧目录。

---

# 五十四、NAS Bind Mount 重启规则

由于目录通过 `mv` 替换后 inode 发生变化，

Docker Bind Mount 可能仍然绑定旧目录。

因此完成原子替换后必须：

```bash
docker restart <livetest-container>
```

使 Docker 重新解析 Bind Mount。

不得因为页面"似乎能访问"就跳过。

---

# 五十五、NAS 文件权限

如果部署后出现：

```text
403
```

首先检查：

* Owner
* Directory Mode
* File Mode

预期通常为：

```text
root:root

Directory:
755

File:
644
```

禁止无理由执行：

```bash
chmod -R 777
```

---

# 五十六、NAS 部署后验证

部署完成后必须检查：

* HTTP 200
* `index.html` 正常
* JS 无 404
* CSS 无 404
* 页面可以实际加载
* Container 无 crash loop
* 资源 Hash 与新构建一致

仅执行：

```text
docker restart success
```

不能算部署验证完成。

---

# 五十七、NAS 安全规则

禁止：

```bash
docker system prune
docker volume prune
```

禁止：

```text
批量停止所有容器
批量删除容器
模糊匹配容器名
通配符删除备份
```

禁止操作：

* NAS 正式容器
* 其他 Web 服务
* qBittorrent 正式后端
* Transmission 正式后端
* NAS 网络
* NAS 防火墙
* SSH 设置

除非用户明确授权。

---

# 五十八、NAS 备份保留

部署生成的：

```text
webui-before-*
webui-old-*
```

默认保留。

AI 不得自行删除。

是否清理由用户决定。

---

# 五十九、NAS 回滚

新版本出现问题时：

优先使用已有备份。

回滚原则：

```text
保留异常当前版本
↓
恢复上一份 webui-before-* 或 webui-old-*
↓
恢复正确目录名
↓
重启 livetest Container
↓
HTTP 验证
↓
浏览器验证
```

禁止：

```text
直接删除整个环境重新部署
```

除非用户明确要求。

---

# 六十、正式 NAS 容器保护

本文件中的 NAS 自动部署权限默认只包括：

```text
qbittorrent-next-ui-livetest
transmission-next-vibemod-livetest
```

即使发现其他名称类似的容器，例如：

```text
qbittorrent-next-ui
transmission-next-vibemod
```

也不得假定它们可以操作。

任何正式容器操作必须单独取得用户明确授权。

---

# 六十一、敏感信息保护

任何情况下不得：

* 输出 GitHub Token
* 输出 Docker Hub Token
* 输出 GHCR Token
* 输出 SSH 私钥
* 输出账号密码
* Commit `.env`
* Commit Secret
* 在 PR 中写 Secret
* 在日志汇报中保留完整 Bearer Token

如果工具日志包含敏感信息：

汇报时必须脱敏。

---

# 六十二、临时测试代码

为了诊断允许临时创建：

* Performance Profiler
* Mock Torrent 数据
* 100 / 500 / 1000 条测试数据
* 浏览器测量脚本
* React Profiler
* Performance JSON
* 临时日志

但是任务结束前必须：

```bash
git status
```

确认临时内容没有进入正式 Diff。

禁止正式提交：

* 压测 Mock 数据
* Profiler 临时代码
* Performance JSON
* 调试 `console.log`
* 临时截图
* 临时代理配置
* NAS 路径临时文件

---

# 六十三、文件行尾保护

项目历史文件可能同时存在：

```text
CRLF
LF
```

修改文件时必须避免产生无意义整文件 Diff。

如果：

```text
实际只修改几行
```

但：

```text
git diff 显示数百行变化
```

必须停止。

检查：

* CRLF/LF
* UTF-8
* BOM
* Formatter
* Git autocrlf

必要时使用保持原行尾的编辑方式。

禁止为了一个小修改重写整个文件行尾。

---

# 六十四、文档任务规则

如果任务只涉及：

```text
README
AGENTS.md
CHANGELOG
docs/
```

仍必须检查：

```bash
git diff --check
git diff --stat
git diff
```

如果项目规则要求完整检查链，则继续执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

禁止因为是文档修改顺手修改产品源码。

---

# 六十五、AGENTS.md 自身维护规则

本文件是长期项目维护规则。

修改 `AGENTS.md` 时必须：

* 单独分支
* 明确 Diff
* Draft PR
* 用户确认
* Squash Merge

不得让普通功能修复任务顺手修改本文件。

两个仓库应尽量保持相同版本的 `AGENTS.md`。

如果两个仓库的 `AGENTS.md` 出现差异：

必须说明原因。

---

# 六十六、汇报格式

实际修改任务完成后应报告：

```text
项目：
分支：
Commit：
修改文件：
修改内容：

lint：
typecheck：
test：
build：

NAS：
PR：
CI：

风险：
```

---

# 六十七、性能任务汇报

性能任务还应报告：

```text
Before：
After：

React：
Script：
Style：
Layout：
Paint：
Long Task：
DOM：
RPC：
```

必须注明：

* 测试环境
* Demo / Production
* 数据规模
* 每页数量
* 是否真实 NAS
* 是否开发环境 React Profiler

不要把开发环境耗时直接描述为生产设备绝对性能。

---

# 六十八、发布任务汇报

正式发布完成后应报告：

```text
qBittorrent

main commit：
PR：
Tag：
Release：
Actions：
Docker Hub：
GHCR：
Assets：
Tests：

Transmission

main commit：
PR：
Tag：
Release：
Actions：
Docker Hub：
GHCR：
Assets：
Tests：
```

并说明：

* Tag 是否精确指向 main
* Release 是否 Latest
* 是否 Draft
* amd64/arm64 是否存在
* Docker `latest` 是否更新
* 是否存在 CI Warning
* 是否操作过 NAS

---

# 六十九、任务结束条件

实际修改任务只有满足以下条件才算完成：

```text
预期修改完成
+
两个项目按要求同步
+
检查完成
+
没有无关 Diff
+
没有临时文件
+
工作区状态明确
+
风险已汇报
```

如果任务只要求：

```text
分析
```

则禁止修改源码。

如果任务只要求：

```text
NAS 测试
```

则禁止自动发布 Release。

如果任务只要求：

```text
修复 Bug
```

则禁止自动提高版本号。

如果任务只要求：

```text
创建 Draft PR
```

则不得自动 Merge。

---

# 七十、最高原则

维护优先级：

```text
正确性
>
不破坏已有稳定功能
>
数据与发布安全
>
实际性能
>
交互体验
>
代码简洁
```

不要为了：

```text
代码更现代
代码更漂亮
代码更短
两个仓库看起来完全一致
顺手升级依赖
顺手升级 CI
```

破坏已经经过：

* 实际 NAS 测试
* 性能测量
* CI
* 正式 Release

验证过的稳定行为。

遇到不确定情况：

```text
先读取当前实现
↓
检查历史背景
↓
分析风险
```

如果仍无法确定：

```text
停止修改
↓
向用户汇报
↓
等待确认
```
