"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { useListMotion } from "@/hooks/use-list-motion"
import { useAppSettings } from "@/lib/app-settings-context"
import { Link, useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Pause,
  Play,
  Pencil,
  Trash2,
} from "lucide-react"
import { EditTorrentDialog } from "@/components/torrents/edit-torrent-dialog"
import { cn } from "@/lib/utils"
import { formatSpeed, formatDuration, getStatusLabel, formatSize, formatSizeParts, splitSpeed } from "@/lib/formatters"
import type { Torrent, TorrentId } from "@/lib/rpc-types"
import { useI18n } from "@/lib/i18n-context"
import { getTorrentProgressColor, getTorrentProgressMetrics } from "@/lib/torrent-progress"
import { AdvancedTorrentMenu } from "@/components/torrents/advanced-torrent-menu"

interface TorrentGridViewProps {
  paginatedTorrents: Torrent[]
  onSingleAction: (id: TorrentId, action: "start" | "stop" | "remove") => void
  onAdvancedSuccess?: () => void
}

export function TorrentGridView({
  paginatedTorrents,
  onSingleAction,
  onAdvancedSuccess,
}: TorrentGridViewProps) {
  const { t, locale } = useI18n()
  const location = useLocation()
  const [editingTorrent, setEditingTorrent] = useState<Torrent | null>(null)
  const openEdit = useCallback((torrent: Torrent) => setEditingTorrent(torrent), [])
  const closeEdit = useCallback(() => setEditingTorrent(null), [])
  const [columnCount, setColumnCount] = useState(() => getGridColumnCount())
  const gridRef = useRef<HTMLDivElement>(null)
  const { animateTorrentSorting } = useAppSettings()
  const [scrollMargin, setScrollMargin] = useState(0)
  const torrentRows = useMemo(() => {
    const rows: Array<Array<{ torrent: Torrent; index: number }>> = []
    for (let index = 0; index < paginatedTorrents.length; index += columnCount) {
      rows.push(paginatedTorrents.slice(index, index + columnCount).map((torrent, offset) => ({
        torrent,
        index: index + offset,
      })))
    }
    return rows
  }, [columnCount, paginatedTorrents])
  const shouldVirtualize = paginatedTorrents.length >= 50
  const getVirtualRowKey = useCallback(
    (index: number) => torrentRows[index]?.[0]?.torrent.id ?? index,
    [torrentRows],
  )
  const rowVirtualizer = useWindowVirtualizer({
    count: torrentRows.length,
    estimateSize: () => 349,
    getItemKey: getVirtualRowKey,
    overscan: 2,
    scrollMargin,
    enabled: shouldVirtualize,
  })
  const renderedRows = shouldVirtualize
    ? rowVirtualizer.getVirtualItems().map((virtualRow) => ({
        key: virtualRow.key,
        index: virtualRow.index,
        offset: virtualRow.start - scrollMargin,
        end: virtualRow.end - scrollMargin,
      }))
    : torrentRows.map((_, index) => ({ key: getVirtualRowKey(index), index, offset: null, end: 0 }))

  const renderedCardKey = JSON.stringify([columnCount, ...renderedRows.flatMap(row => torrentRows[row.index].map(({ torrent }) => torrent.id))])
  useListMotion(gridRef, animateTorrentSorting, `${columnCount}:${renderedRows[0]?.offset ?? 0}`)

  useEffect(() => {
    const updateColumnCount = () => setColumnCount((current) => {
      const next = getGridColumnCount()
      return current === next ? current : next
    })
    window.addEventListener("resize", updateColumnCount, { passive: true })
    return () => window.removeEventListener("resize", updateColumnCount)
  }, [])

  useLayoutEffect(() => {
    if (!shouldVirtualize || !gridRef.current) return
    const nextScrollMargin = Math.round(gridRef.current.getBoundingClientRect().top + window.scrollY)
    setScrollMargin((current) => current === nextScrollMargin ? current : nextScrollMargin)
  }, [columnCount, shouldVirtualize])

  useLayoutEffect(() => {
    if (shouldVirtualize) rowVirtualizer.measure()
  }, [columnCount, rowVirtualizer, shouldVirtualize])

  // 同序数据刷新复用观察器；只有可见卡片集合/分组变化才重新订阅。
  useLayoutEffect(() => {
    if (!shouldVirtualize || !gridRef.current) return
    const cards = Array.from(gridRef.current.querySelectorAll<HTMLElement>("[data-grid-row]"))
    const measureRows = () => {
      const heights = new Map<number, number>()
      for (const card of cards) {
        const row = Number(card.dataset.gridRow)
        heights.set(row, Math.max(heights.get(row) ?? 0, card.offsetHeight))
      }
      for (const [row, height] of heights) {
        if (height > 0) rowVirtualizer.resizeItem(row, height + 24)
      }
    }
    measureRows()
    const observer = new ResizeObserver(measureRows)
    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [renderedCardKey, rowVirtualizer, shouldVirtualize])

  return (
    <>
    <div
      ref={gridRef}
      data-grid-virtualized={shouldVirtualize ? "true" : "false"}
      className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      style={shouldVirtualize ? {
        paddingTop: renderedRows[0]?.offset ?? 0,
        paddingBottom: Math.max(0, rowVirtualizer.getTotalSize() - (renderedRows.at(-1)?.end ?? 0)) + 24,
      } : undefined}
    >
      {renderedRows.flatMap(renderedRow => torrentRows[renderedRow.index]).map(({ torrent, index }) => {
        const { progressRatio, completedSelected, selectedSize, totalSize, selectionRatio, isPartialDownload } = getTorrentProgressMetrics(torrent)
        return (
        <div key={torrent.id} data-motion-id={torrent.id} data-grid-row={Math.floor(index / columnCount)} className="min-w-0">
        <TorrentGridCard initialIndex={index}>
          <CardHeader className="pb-3 pt-4 border-b border-muted/50 bg-background/50">
            <div className="min-w-0 space-y-1">
              <Link to={`/torrents/detail?id=${torrent.id}`} state={{ fromListPath: location.pathname }} className="block group-hover:text-primary transition-colors">
                <CardTitle className="text-heading-3 truncate pr-2 cursor-pointer leading-tight" title={torrent.name}>
                  {torrent.name}
                </CardTitle>
              </Link>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tracking-wide transition-colors",
                  torrent.status === 4 ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" :
                    torrent.status === 6 ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400" :
                      torrent.status === 0 ? "bg-muted text-muted-foreground/70" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                )}>
                  {t(getStatusLabel(torrent.status))}
                </span>
                <span className="text-label tracking-tighter whitespace-nowrap">
                  {(() => {
                    const parts = formatSizeParts(torrent.totalSize)
                    return (
                      <>
                        {parts.value} <span className="text-[10px] opacity-60 font-medium">{parts.unit}</span>
                      </>
                    )
                  })()}
                </span>
              </div>
            </div>
            <CardAction className="flex gap-1 shrink-0">
              <AdvancedTorrentMenu ids={[torrent.id]} torrent={torrent} onSuccess={onAdvancedSuccess} />
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-opacity rounded-full" onClick={() => openEdit(torrent)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-opacity rounded-full" onClick={() => onSingleAction(torrent.id, "remove")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="py-5 space-y-5 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between text-label">
                <span>{t('common.progress')}</span>
                <span className="text-primary">{(progressRatio * 100).toFixed(1)}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={t("common.progress")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number((progressRatio * 100).toFixed(1))}
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
              >
                <div
                  className={cn("h-full w-full origin-left rounded-full transition-transform duration-500 ease-out", getTorrentProgressColor(torrent))}
                  style={{ transform: `scaleX(${progressRatio})` }}
                ></div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
                <span>{formatSize(completedSelected)} / {formatSize(selectedSize)}</span>
                {isPartialDownload && (
                  <span className="text-fuchsia-600 dark:text-fuchsia-400" title={t("common.selected_of_total", { selected: formatSize(selectedSize), total: formatSize(totalSize) })}>
                    {t("common.selected_percent", { percent: (selectionRatio * 100).toFixed(0) })}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-label">{t('stats.download_speed')}</p>
                <div className="flex items-center gap-1 text-green-500 text-heading-3 whitespace-nowrap">
                  <ArrowDown className="h-3 w-3" />
                  <span className="text-numeric">
                    {(() => {
                      const parts = splitSpeed(formatSpeed(torrent.rateDownload))
                      return (
                        <>
                          {parts.value} <span className="text-sm opacity-60 ml-0.5">{parts.unit}</span>
                        </>
                      )
                    })()}
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-label">{t('stats.upload_speed')}</p>
                <div className="flex items-center justify-end gap-1 text-blue-500 text-heading-3 whitespace-nowrap">
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-numeric">
                    {(() => {
                      const parts = splitSpeed(formatSpeed(torrent.rateUpload))
                      return (
                        <>
                          {parts.value} <span className="text-sm opacity-60 ml-0.5">{parts.unit}</span>
                        </>
                      )
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 px-4 py-3 border-t border-muted/50 flex justify-between items-center mt-auto">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-label lowercase">{formatDuration(torrent.eta, locale)}</span>
            </div>
            <div className="flex gap-2">
              {torrent.status !== 0 ? (
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-muted-foreground/20 hover:bg-orange-500/10 hover:text-orange-500" onClick={() => onSingleAction(torrent.id, "stop")}>
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-muted-foreground/20 hover:bg-green-500/10 hover:text-green-500" onClick={() => onSingleAction(torrent.id, "start")}>
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardFooter>
        </TorrentGridCard>
        </div>
        )
      })}
    </div>
    <EditTorrentDialog torrent={editingTorrent} onClose={closeEdit} onSuccess={onAdvancedSuccess} />
    </>
  )
}

function TorrentGridCard({ initialIndex, children }: { initialIndex: number; children: ReactNode }) {
  const [entranceIndex] = useState(initialIndex)
  return (
    <Card
      data-grid-card
      className={cn(
        "group relative h-full shadow-md border-none overflow-hidden hover:-translate-y-0.5 transition-[translate,background-color,color,box-shadow] duration-180 ease-[cubic-bezier(0.2,0,0,1)] bg-sidebar/30 flex flex-col py-0",
        entranceIndex < 12 && "animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none",
      )}
      style={entranceIndex < 12 ? {
        animationDelay: `${Math.min(entranceIndex, 6) * 12}ms`, animationDuration: "160ms", animationFillMode: "both",
      } : undefined}
    >{children}</Card>
  )
}

function getGridColumnCount() {
  if (typeof window === "undefined") return 1
  if (window.innerWidth >= 1280) return 4
  if (window.innerWidth >= 1024) return 3
  if (window.innerWidth >= 640) return 2
  return 1
}
