# Changelog

## v1.15.0-funky9

### 性能

- 分类路由状态保持同步更新，Torrent 列表过滤使用延迟值，优先保证 Sidebar 点击反馈与 Active Indicator 响应
- 后台刷新复用显示字段未变化的 Torrent 对象，避免破坏 TorrentRow 的 memo 缓存
- 大量 Torrent 列表启用窗口虚拟化，减少分类切换时同步渲染与 DOM 更新数量
- 快速连续切换分类时只提交最新的低优先级列表结果，降低过期过滤、排序与渲染造成的主线程阻塞

### UI / 交互

- 分类切换恢复 TorrentRow 淡入与轻微位移动画，并限制可见行动画延迟范围
- 分类切换增加列表整体轻量淡入反馈
- Button、导航项、工具栏与行操作按钮统一为明确的颜色、背景色、边框色、透明度和位移动画
- 交互动画统一使用短时长与 `cubic-bezier(0.2, 0, 0, 1)` 缓动，移除过重缩放、亮度和阴影动画

### 构建 / 文档

- 新增 `@tanstack/react-virtual`，用于大量 Torrent 列表窗口虚拟化
- README 与 DOCKERHUB 镜像标签同步至 v1.15.0-funky9

## v1.14.0-funky9

### UI / 交互

- Sidebar UI 与展开/收起 Motion 统一优化，保持 expanded/collapsed 双状态体系
- 修复选中项 Hover 时文字/图标被普通 Hover 样式覆盖的问题，Selected 状态优先
- 修复 Sidebar 与 Topbar 顶部对齐，消除滚动初期的 1px 位移
- 新增导航 Selection Indicator，页面切换时高亮背景平滑滑动
- 统一 Sidebar 横向留白：展开态 8px safe inset 与 56px Icon Rail，折叠态 64px 统一中心线

### 性能

- Torrent 分类切换不再重挂载 TorrentView，路由只改变 statusFilter
- 分类切换新增 RPC 请求数 = 0，数据层保持共享
- TorrentRow 使用 React.memo，未发生数据变化的行不重渲染
- 行回调稳定化（useCallback），selectedIds 使用 Set 快速判断
- EditTorrentDialog 改为页面级单实例，不再为每行创建 Dialog
- 详情页返回分类改由路由层 ref 记录，行组件不再订阅 pathname

### 修复

- 高级任务菜单与弹窗触发时页面布局保持稳定
- 详情页标签数据加载与文件树交互优化
- 列表数据请求字段与刷新逻辑整理

### 构建 / 文档

- README 与 DOCKERHUB 镜像标签同步至 v1.14.0-funky9
