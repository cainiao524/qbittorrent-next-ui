"use client"

import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronDown, Database, Gauge } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatSize, formatSpeed } from "@/lib/formatters"
import { useI18n } from "@/lib/i18n-context"
import type { FreeSpaceResponse, SessionStats } from "@/lib/rpc-types"
import type { SpeedPoint } from "@/hooks/use-speed-history"

function Sparkline({ values, className }: { values: number[]; className: string }) {
  if (values.length < 2) return <div className="h-5" />
  const max = Math.max(1, ...values)
  const points = values
    .map((value, index) => `${((index / (values.length - 1)) * 100).toFixed(1)},${(18 - (value / max) * 16).toFixed(1)}`)
    .join(" ")
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-5 w-full overflow-visible" aria-hidden>
      <polyline points={points} fill="none" className={className} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

interface StatCellProps {
  icon: ReactNode
  label: string
  value: ReactNode
  footer: ReactNode
  onClick?: () => void
  ariaExpanded?: boolean
}

function StatCell({ icon, label, value, footer, onClick, ariaExpanded }: StatCellProps) {
  const content = (
    <>
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-numeric truncate text-base font-bold tracking-tight">{value}</span>
      <span className="min-h-5 text-[11px] text-muted-foreground">{footer}</span>
    </>
  )
  const className = "flex min-w-0 flex-col gap-0.5 px-4 py-2.5 text-left"
  return onClick ? (
    <button type="button" onClick={onClick} aria-expanded={ariaExpanded} className={cn(className, "rounded-xl transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

interface TorrentStatsBarProps {
  stats: SessionStats
  freeSpace: FreeSpaceResponse | null
  downloadSpeed: number
  uploadSpeed: number
  history: SpeedPoint[]
  chartExpanded: boolean
  onToggleChart: () => void
}

/** Single-row bandwidth overview: speeds with sparklines, session totals and free space. */
export function TorrentStatsBar({ stats, freeSpace, downloadSpeed, uploadSpeed, history, chartExpanded, onToggleChart }: TorrentStatsBarProps) {
  const { t } = useI18n()
  const session = stats["current-stats"]
  const ratio = session.downloadedBytes > 0 ? session.uploadedBytes / session.downloadedBytes : 0
  const freeRatio = freeSpace && freeSpace.total_size > 0 ? freeSpace["size-bytes"] / freeSpace.total_size : null
  const chartToggle = (
    <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", chartExpanded && "rotate-180")} aria-hidden />
  )

  return (
    <div
      className="grid auto-cols-[minmax(180px,70vw)] grid-flow-col overflow-x-auto overscroll-x-contain rounded-2xl border border-muted/30 bg-muted/20 no-scrollbar md:auto-cols-auto md:grid-flow-row md:grid-cols-4 md:overflow-visible md:divide-x md:divide-muted/30"
      aria-label={t("stats.overview", "传输总览")}
    >
      <StatCell
        icon={<><ArrowDown className="h-3.5 w-3.5 text-green-500" />{t("stats.download_speed")}{chartToggle}</>}
        label=""
        value={formatSpeed(downloadSpeed)}
        footer={<Sparkline values={history.map((point) => point.download)} className="stroke-green-500" />}
        onClick={onToggleChart}
        ariaExpanded={chartExpanded}
      />
      <StatCell
        icon={<><ArrowUp className="h-3.5 w-3.5 text-blue-500" />{t("stats.upload_speed")}{chartToggle}</>}
        label=""
        value={formatSpeed(uploadSpeed)}
        footer={<Sparkline values={history.map((point) => point.upload)} className="stroke-blue-500" />}
        onClick={onToggleChart}
        ariaExpanded={chartExpanded}
      />
      <StatCell
        icon={<Gauge className="h-3.5 w-3.5 text-orange-500" />}
        label={t("stats.session")}
        value={<>↓ {formatSize(session.downloadedBytes)}</>}
        footer={<span className="block truncate">↑ {formatSize(session.uploadedBytes)} · {t("stats.ratio", "分享率")} {ratio.toFixed(2)}</span>}
      />
      <StatCell
        icon={<Database className="h-3.5 w-3.5 text-purple-500" />}
        label={t("stats.free_space")}
        value={freeSpace ? formatSize(freeSpace["size-bytes"]) : "—"}
        footer={freeRatio === null ? (
          <span className="block truncate">{freeSpace?.path}</span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-purple-500/70" style={{ width: `${Math.round((1 - freeRatio) * 100)}%` }} />
            </span>
            <span className="text-numeric shrink-0">{Math.round(freeRatio * 100)}% {t("stats.free_unit")}</span>
          </span>
        )}
      />
    </div>
  )
}
