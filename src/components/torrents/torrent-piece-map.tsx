import { Boxes } from "lucide-react"

import { formatSize } from "@/lib/formatters"
import { aggregatePieceStates, summarizePieceStates } from "@/lib/piece-states"
import type { TorrentPieceState } from "@/lib/rpc-types"

interface TorrentPieceMapProps {
  states: readonly TorrentPieceState[]
  pieceSize: number
  totalSize: number
  loading?: boolean
}

export function TorrentPieceMap({ states, pieceSize, totalSize, loading = false }: TorrentPieceMapProps) {
  const summary = summarizePieceStates(states)
  const buckets = aggregatePieceStates(states, 384)
  const completion = summary.total ? summary.complete / summary.total * 100 : 0
  const effectivePieceSize = pieceSize > 0
    ? pieceSize
    : summary.total > 0
      ? Math.ceil(totalSize / summary.total)
      : 0

  return (
    <section className="col-span-full rounded-2xl border border-muted/30 bg-muted/10 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Boxes className="h-4 w-4" />文件块信息
        </h4>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>共 <strong className="text-foreground">{summary.total.toLocaleString()}</strong> 块</span>
          <span>每块 <strong className="text-foreground">{formatSize(effectivePieceSize)}</strong></span>
          <span>完成 <strong className="text-emerald-500">{completion.toFixed(1)}%</strong></span>
        </div>
      </div>

      {loading && !states.length ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
      ) : states.length ? (
        <>
          <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-1 md:grid-cols-[repeat(64,minmax(0,1fr))]">
            {buckets.map((bucket) => {
              const complete = bucket.complete / bucket.total * 100
              const downloading = bucket.downloading / bucket.total * 100
              const activeEnd = Math.min(100, complete + downloading)
              return (
                <span
                  key={bucket.start}
                  className="h-3 rounded-[3px] ring-1 ring-black/5 dark:ring-white/5"
                  style={{ background: `linear-gradient(90deg, var(--color-emerald-500) 0 ${complete}%, var(--color-amber-400) ${complete}% ${activeEnd}%, var(--muted) ${activeEnd}% 100%)` }}
                  title={`区块 ${bucket.start + 1}–${bucket.end + 1}：已完成 ${bucket.complete}，下载中 ${bucket.downloading}，未完成 ${bucket.missing}`}
                />
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />已完成 {summary.complete.toLocaleString()}</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-amber-400" />下载中 {summary.downloading.toLocaleString()}</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-muted ring-1 ring-border" />未完成 {summary.missing.toLocaleString()}</span>
            {states.length > buckets.length && <span className="ml-auto">已聚合为 {buckets.length} 个显示单元</span>}
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">暂无文件块状态</p>
      )}
    </section>
  )
}
