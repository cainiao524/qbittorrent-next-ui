import { Boxes, Clock3, Network, RadioTower } from "lucide-react"

import { formatDuration, formatSize, formatSpeed } from "@/lib/formatters"
import type { Torrent } from "@/lib/rpc-types"

function Property({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-muted/20 py-2.5 last:border-0"><span className="text-xs text-muted-foreground">{label}</span><span className="break-all text-right text-xs font-medium tabular-nums">{value}</span></div>
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-muted/30 bg-muted/10 p-4"><h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{icon}{title}</h4>{children}</div>
}

export function TorrentPropertiesPanel({ torrent: tor }: { torrent: Torrent }) {
  const state = (value: boolean | undefined) => value ? <span className="text-green-500">已启用</span> : <span className="text-muted-foreground">已关闭</span>
  const limit = (mode: number | undefined, value: number | undefined, unit = "") => mode === 0 ? "继承全局" : mode === 2 ? "无限制" : `${value ?? 0}${unit}`
  return (
    <div className="col-span-full grid gap-4 border-t border-muted/20 pt-6 md:grid-cols-2 xl:grid-cols-4">
      <Group title="运行状态" icon={<RadioTower className="h-4 w-4" />}>
        <Property label="强制启动" value={state(tor.forceStart)} />
        <Property label="超级做种" value={state(tor.superSeeding)} />
        <Property label="自动种子管理" value={state(tor.autoManagement)} />
        <Property label="顺序下载" value={state(tor.sequentialDownload)} />
        <Property label="首尾区块优先" value={state(tor.firstLastPiecePriority)} />
        <Property label="分享率限制" value={limit(tor.seedRatioMode, tor.seedRatioLimit)} />
        <Property label="做种时间限制" value={limit(tor.seedingTimeMode, tor.seedingTimeLimit, " 分钟")} />
        <Property label="非活跃做种限制" value={limit(tor.inactiveSeedingTimeMode, tor.inactiveSeedingTimeLimit, " 分钟")} />
        <Property label="达到限制后" value={({ Default: "继承全局", Stop: "暂停", Remove: "删除任务", RemoveWithContent: "删除任务和文件", EnableSuperSeeding: "启用超级做种" } as const)[tor.shareLimitAction ?? "Default"]} />
      </Group>
      <Group title="连接与时间" icon={<Network className="h-4 w-4" />}>
        <Property label="连接数／上限" value={`${tor.peersConnected} / ${tor.connectionsLimit || "∞"}`} />
        <Property label="种子总数" value={tor.seedsTotal ?? 0} />
        <Property label="用户总数" value={tor.peersTotal ?? 0} />
        <Property label="活动时间" value={formatDuration(tor.timeElapsed ?? 0)} />
        <Property label="做种时间" value={formatDuration(tor.seedingTime ?? 0)} />
        <Property label="下次汇报" value={formatDuration(tor.nextAnnounce ?? 0)} />
      </Group>
      <Group title="区块与可用性" icon={<Boxes className="h-4 w-4" />}>
        <Property label="已拥有区块" value={`${tor.piecesHave ?? 0} / ${tor.piecesCount ?? 0}`} />
        <Property label="区块大小" value={formatSize(tor.pieceSize ?? 0)} />
        <Property label="可用性" value={(tor.availability ?? 0).toFixed(3)} />
        <Property label="流行度" value={(tor.popularity ?? 0).toFixed(3)} />
        <Property label="丢弃数据" value={formatSize(tor.wastedSize ?? 0)} />
      </Group>
      <Group title="本次传输" icon={<Clock3 className="h-4 w-4" />}>
        <Property label="本次下载" value={formatSize(tor.downloadedSession ?? 0)} />
        <Property label="本次上传" value={formatSize(tor.uploadedSession ?? 0)} />
        <Property label="平均下载速度" value={formatSpeed(tor.averageDownloadSpeed ?? 0)} />
        <Property label="平均上传速度" value={formatSpeed(tor.averageUploadSpeed ?? 0)} />
        <Property label="最后完整可见" value={tor.lastSeenComplete ? new Date(tor.lastSeenComplete * 1000).toLocaleString("zh-CN") : "从未"} />
        <Property label="临时下载路径" value={tor.downloadPath || "未启用"} />
      </Group>
    </div>
  )
}
