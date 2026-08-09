"use client"

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { Link, useLocation } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  CheckSquare,
  Square,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Play,
  Pause,
  Trash2,
  Pencil,
} from "lucide-react"
import { EditTorrentDialog } from "@/components/torrents/edit-torrent-dialog"
import { cn } from "@/lib/utils"
import { formatSpeed, formatDuration, formatSize, getStatusLabel, formatDate } from "@/lib/formatters"
import type { ColumnConfig } from "@/lib/columns"
import type { Torrent, TorrentId } from "@/lib/rpc-types"
import { useI18n } from "@/lib/i18n-context"
import { AdvancedTorrentMenu } from "@/components/torrents/advanced-torrent-menu"
import { getTorrentProgressColor } from "@/lib/torrent-progress"
import type { SortKey } from "@/lib/torrent-list-utils"
import { parseTorrentLabel } from "@/lib/torrent-labels"

const COLUMN_SORT_KEYS: Record<string, SortKey> = {
  name: "name", status: "status", progress: "percentDone", size: "size", totalSize: "totalSize",
  addedDate: "addedDate", editDate: "editDate", uploadedEver: "uploadedEver", rateDownload: "rateDownload",
  rateUpload: "rateUpload", eta: "eta", uploadRatio: "uploadRatio", seeds: "seeds", peers: "peers",
  category: "category", labels: "labels", dateCreated: "dateCreated", timeElapsed: "timeElapsed",
  lastSeenComplete: "lastSeenComplete", availability: "availability",
  tracker: "tracker", downloadedEver: "downloadedEver", amountLeft: "amountLeft", doneDate: "doneDate",
  downloadLimit: "downloadLimit", uploadLimit: "uploadLimit", downloadDir: "downloadDir",
}

interface TorrentListViewProps {
  enableRowEntrance: boolean
  listTransitionKey: string
  paginatedTorrents: Torrent[]
  visibleColumns: string[]
  allColumns: Array<ColumnConfig & { label: string }>
  selectedIds: TorrentId[]
  selectedIdSet: Set<TorrentId>
  filteredCount: number
  sortConfig: { key: SortKey; direction: 'asc' | 'desc' } | null
  animateSortTransitions: boolean
  tableMinWidth: number
  columnWidths: Record<string, number>
  density: "comfortable" | "compact"
  locale: string
  onToggleSelect: (id: TorrentId, range: boolean) => void
  onToggleSelectAll: () => void
  onSort: (key: SortKey) => void
  onColumnWidthChange: (id: string, width: number) => void
  onSingleAction: (id: TorrentId, action: "start" | "stop" | "remove") => void
  onAdvancedSuccess?: () => void
}

function SortIcon({ column, sortConfig }: { column: SortKey; sortConfig: TorrentListViewProps['sortConfig'] }) {
  if (sortConfig?.key !== column) return <ArrowDownCircle className="ml-1 h-3 w-3 opacity-20" />;
  return sortConfig.direction === 'asc'
    ? <ArrowUpCircle className="ml-1 h-3 w-3 text-primary" />
    : <ArrowDownCircle className="ml-1 h-3 w-3 text-primary" />;
}

interface TorrentRowProps {
  torrent: Torrent
  initialIndex: number
  selected: boolean
  locale: string
  columns: Array<ColumnConfig & { label: string }>
  columnWidths: Record<string, number>
  density: "comfortable" | "compact"
  listPath: string
  rowAnimationKey: string
  animateEntrance: boolean
  onToggleSelect: (id: TorrentId, range: boolean) => void
  onSingleAction: (id: TorrentId, action: "start" | "stop" | "remove") => void
  onOpenEdit: (torrent: Torrent) => void
  onAdvancedSuccess?: () => void
}

function rowPropsEqual(prev: TorrentRowProps, next: TorrentRowProps): boolean {
  return prev.torrent === next.torrent
    && prev.selected === next.selected
    && prev.locale === next.locale
    && prev.columns === next.columns
    && prev.columnWidths === next.columnWidths
    && prev.density === next.density
    && prev.listPath === next.listPath
    && prev.rowAnimationKey === next.rowAnimationKey
    && prev.onToggleSelect === next.onToggleSelect
    && prev.onSingleAction === next.onSingleAction
    && prev.onOpenEdit === next.onOpenEdit
    && prev.onAdvancedSuccess === next.onAdvancedSuccess
}

const TorrentRow = memo(function TorrentRow({
  torrent,
  initialIndex,
  selected,
  locale,
  columns,
  columnWidths,
  density,
  listPath,
  rowAnimationKey,
  animateEntrance,
  onToggleSelect,
  onSingleAction,
  onOpenEdit,
  onAdvancedSuccess,
}: TorrentRowProps) {
  const { t } = useI18n()
  const [animationDelay] = useState(() => Math.min(initialIndex, 6) * 12)
  const [shouldAnimateEntrance] = useState(animateEntrance)
  const compact = density === "compact"

  const getColumnStyle = (columnId: ColumnConfig["id"]): CSSProperties => ({ width: columnWidths[columnId] })

  const renderCell = (column: ColumnConfig & { label: string }) => {
    const style = getColumnStyle(column.id)
    const cellProps = { "data-column-id": column.id, style }

    switch (column.id) {
      case "name":
        return (
          <TableCell key={column.id} {...cellProps} className="text-heading-3 truncate" title={torrent.name}>
            <Link data-column-content to={`/torrents/detail?id=${torrent.id}`} state={{ fromListPath: listPath }} className="hover:text-primary transition-colors cursor-pointer block w-full min-w-0 truncate">
              {torrent.name}
            </Link>
          </TableCell>
        )
      case "status":
        return (
          <TableCell key={column.id} {...cellProps}>
            <span data-column-content className={cn(
              "inline-flex items-center rounded-full px-2.5 text-xs font-medium uppercase tracking-wider transition-colors",
              compact ? "py-0" : "py-0.5",
              torrent.status === 4 ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" :
                torrent.status === 6 ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400" :
                  torrent.status === 0 ? "bg-muted text-muted-foreground/70" :
                    "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
            )}>
              {t(getStatusLabel(torrent.status))}
            </span>
          </TableCell>
        )
      case "progress": {
        const isPartialDownload = torrent.totalSize > 0 && torrent.size < torrent.totalSize - 1
        const progressRatio = isPartialDownload
          ? Math.min(Math.max((torrent.size * torrent.percentDone) / torrent.totalSize, 0), 1)
          : Math.min(Math.max(torrent.percentDone, 0), 1)
        const progressColor = isPartialDownload
          ? "bg-fuchsia-500/65 dark:bg-fuchsia-400/65"
          : getTorrentProgressColor(torrent)
        return (
          <TableCell key={column.id} {...cellProps}>
            <div data-column-content className={cn("flex min-w-0 items-center", compact ? "h-7" : "h-10")}>
              <div className="flex w-full min-w-0 items-center gap-2.5">
                <div
                  role="progressbar"
                  aria-label={t("common.progress")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Number((progressRatio * 100).toFixed(1))}
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
                >
                  <div className={cn("h-full w-full origin-left rounded-full transition-transform duration-500 ease-out", progressColor)} style={{ transform: `scaleX(${progressRatio})` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                  {(progressRatio * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </TableCell>
        )
      }
      case "size":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{formatSize(torrent.size)}</span></TableCell>
      case "totalSize":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{formatSize(torrent.totalSize)}</span></TableCell>
      case "addedDate":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right text-muted-foreground text-xs"><span data-column-content>{formatDate(torrent.addedDate, locale)}</span></TableCell>
      case "editDate":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right text-muted-foreground text-xs"><span data-column-content>{torrent.editDate ? formatDate(torrent.editDate, locale) : "—"}</span></TableCell>
      case "uploadedEver":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{formatSize(torrent.uploadedEver)}</span></TableCell>
      case "rateDownload":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-green-500 text-right"><span data-column-content>{formatSpeed(torrent.rateDownload)}</span></TableCell>
      case "rateUpload":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-blue-500 text-right"><span data-column-content>{formatSpeed(torrent.rateUpload)}</span></TableCell>
      case "eta":
        return <TableCell key={column.id} {...cellProps} className="text-right"><div data-column-content className="flex items-center justify-end gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span className="text-label lowercase">{formatDuration(torrent.eta, locale)}</span></div></TableCell>
      case "uploadRatio":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{torrent.uploadRatio >= 0 ? torrent.uploadRatio.toFixed(2) : "0.00"}</span></TableCell>
      case "seeds":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{torrent.peersSendingToUs} ({torrent.seedsTotal ?? 0})</span></TableCell>
      case "peers":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{torrent.peersGettingFromUs} ({torrent.peersTotal ?? 0})</span></TableCell>
      case "category":
        return <TableCell key={column.id} {...cellProps} className="truncate text-muted-foreground" title={torrent.category || undefined}><span data-column-content>{torrent.category || "—"}</span></TableCell>
      case "labels": {
        const labels = torrent.labels?.map(parseTorrentLabel).filter(Boolean).join(", ") || "—"
        return <TableCell key={column.id} {...cellProps} className="truncate text-muted-foreground" title={labels}><span data-column-content>{labels}</span></TableCell>
      }
      case "dateCreated":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right text-xs text-muted-foreground"><span data-column-content>{formatDate(torrent.dateCreated ?? 0, locale)}</span></TableCell>
      case "timeElapsed":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right text-muted-foreground"><span data-column-content>{formatDuration(torrent.timeElapsed ?? 0, locale)}</span></TableCell>
      case "lastSeenComplete":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right text-xs text-muted-foreground"><span data-column-content>{formatDate(torrent.lastSeenComplete ?? 0, locale)}</span></TableCell>
      case "availability":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{Number.isFinite(torrent.availability) && (torrent.availability ?? -1) >= 0 ? (torrent.availability ?? 0).toFixed(2) : "—"}</span></TableCell>
      case "tracker": {
        const tracker = torrent.trackers?.[0]?.announce || "—"
        return <TableCell key={column.id} {...cellProps} className="truncate text-muted-foreground" title={tracker}><span data-column-content>{tracker}</span></TableCell>
      }
      case "downloadedEver":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{formatSize(torrent.downloadedEver)}</span></TableCell>
      case "amountLeft":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{formatSize(torrent.amountLeft ?? 0)}</span></TableCell>
      case "doneDate":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right text-xs text-muted-foreground"><span data-column-content>{formatDate(torrent.doneDate, locale)}</span></TableCell>
      case "downloadLimit":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{torrent.downloadLimited ? formatSpeed((torrent.downloadLimit ?? 0) * 1024) : t("common.mode_unlimited")}</span></TableCell>
      case "uploadLimit":
        return <TableCell key={column.id} {...cellProps} className="text-numeric text-right"><span data-column-content>{torrent.uploadLimited ? formatSpeed((torrent.uploadLimit ?? 0) * 1024) : t("common.mode_unlimited")}</span></TableCell>
      case "downloadDir":
        return <TableCell key={column.id} {...cellProps} className="truncate text-muted-foreground" title={torrent.downloadDir}><span data-column-content>{torrent.downloadDir || "—"}</span></TableCell>
    }
  }

  return (
    <TableRow
      key={`${rowAnimationKey}-${torrent.id}`}
      className={cn(
        "hover:bg-muted/30 transition-colors border-b last:border-0 border-muted/50 group/row",
        shouldAnimateEntrance && "animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none",
        selected && "bg-primary/5 hover:bg-primary/10",
        compact && "[&>td]:py-1"
      )}
      style={shouldAnimateEntrance ? { animationDelay: `${animationDelay}ms`, animationFillMode: "both" } : undefined}
    >
      <TableCell className="pl-6">
        <div
          className="cursor-pointer text-muted-foreground hover:text-primary transition-colors select-none"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => onToggleSelect(torrent.id, event.shiftKey)}
        >
          {selected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 opacity-40 group-hover/row:opacity-100" />
          )}
        </div>
      </TableCell>
      {columns.map(renderCell)}
      <TableCell className="w-[170px] pr-6">
        <div className="flex items-center justify-center gap-1">
          <AdvancedTorrentMenu ids={[torrent.id]} torrent={torrent} onSuccess={onAdvancedSuccess} />
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => onOpenEdit(torrent)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {torrent.status !== 0 ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-orange-500/10 hover:text-orange-500 transition-colors" onClick={() => onSingleAction(torrent.id, "stop")}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-500/10 hover:text-green-500 transition-colors" onClick={() => onSingleAction(torrent.id, "start")}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => onSingleAction(torrent.id, "remove")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}, rowPropsEqual)

export function TorrentListView({
  enableRowEntrance,
  listTransitionKey,
  paginatedTorrents,
  visibleColumns,
  allColumns,
  selectedIds,
  selectedIdSet,
  filteredCount,
  sortConfig,
  animateSortTransitions,
  tableMinWidth,
  columnWidths,
  density,
  locale,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  onColumnWidthChange,
  onSingleAction,
  onAdvancedSuccess,
}: TorrentListViewProps) {
  const { t } = useI18n()
  const location = useLocation()
  const tableRef = useRef<HTMLTableElement>(null)
  const compact = density === "compact"
  const [editingTorrent, setEditingTorrent] = useState<Torrent | null>(null)
  const orderedVisibleColumns = useMemo(
    () => visibleColumns
      .map((columnId) => allColumns.find((column) => column.id === columnId))
      .filter((column): column is ColumnConfig & { label: string } => Boolean(column)),
    [visibleColumns, allColumns]
  )
  const rowAnimationKey = animateSortTransitions
    ? `${listTransitionKey}-${sortConfig?.key ?? "default"}-${sortConfig?.direction ?? "none"}`
    : listTransitionKey
  const [previousRowAnimationKey, setPreviousRowAnimationKey] = useState(rowAnimationKey)
  const animateRows = enableRowEntrance || previousRowAnimationKey !== rowAnimationKey
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const shouldVirtualize = paginatedTorrents.length >= 50
  const getVirtualRowKey = useCallback(
    (index: number) => paginatedTorrents[index]?.id ?? index,
    [paginatedTorrents]
  )
  const rowVirtualizer = useWindowVirtualizer({
    count: paginatedTorrents.length,
    estimateSize: () => compact ? 41 : 57,
    getItemKey: getVirtualRowKey,
    overscan: 8,
    scrollMargin,
    enabled: shouldVirtualize,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const renderedRowIndexes = shouldVirtualize
    ? virtualRows.map((virtualRow) => virtualRow.index)
    : paginatedTorrents.map((_, index) => index)
  const paddingTop = shouldVirtualize && virtualRows.length
    ? Math.max(0, virtualRows[0].start - scrollMargin)
    : 0
  const paddingBottom = shouldVirtualize && virtualRows.length
    ? Math.max(0, rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1].end - scrollMargin))
    : 0
  const tableColumnCount = orderedVisibleColumns.length + 2

  useEffect(() => {
    setPreviousRowAnimationKey(rowAnimationKey)
  }, [rowAnimationKey])

  useLayoutEffect(() => {
    if (!shouldVirtualize || !tableBodyRef.current) return
    const nextScrollMargin = Math.round(tableBodyRef.current.getBoundingClientRect().top + window.scrollY)
    setScrollMargin((current) => current === nextScrollMargin ? current : nextScrollMargin)
  }, [shouldVirtualize])

  useLayoutEffect(() => {
    if (shouldVirtualize) rowVirtualizer.measure()
  }, [compact, rowVirtualizer, shouldVirtualize])

  const openEdit = useCallback((torrent: Torrent) => setEditingTorrent(torrent), [])
  const closeEdit = useCallback(() => setEditingTorrent(null), [])

  const getColumnStyle = (columnId: ColumnConfig["id"]): CSSProperties => ({ width: columnWidths[columnId] })

  const getHeaderClassName = (column: ColumnConfig) => cn(
    "group/header relative cursor-pointer select-none hover:text-primary transition-colors",
    compact ? "h-9" : "h-12",
    column.align === "right" && "text-right"
  )

  const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = columnWidths[columnId]
    event.currentTarget.setPointerCapture(event.pointerId)
    const onPointerMove = (pointerEvent: PointerEvent) => onColumnWidthChange(columnId, startWidth + pointerEvent.clientX - startX)
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp, { once: true })
  }, [columnWidths, onColumnWidthChange])

  const autoFitColumn = useCallback((columnId: string) => {
    const cells = tableRef.current?.querySelectorAll<HTMLElement>(`[data-column-id="${columnId}"]`)
    if (!cells?.length) return
    const contentWidth = Math.max(...Array.from(cells).map((cell) => {
      const content = cell.querySelector<HTMLElement>("[data-column-content]")
      return (content?.scrollWidth ?? cell.scrollWidth) + 24
    }))
    onColumnWidthChange(columnId, contentWidth)
  }, [onColumnWidthChange])

  const renderHeader = (column: ColumnConfig & { label: string }) => {
    const sortKey = COLUMN_SORT_KEYS[column.id]
    return (
      <TableHead key={column.id} data-column-id={column.id} className={getHeaderClassName(column)} style={getColumnStyle(column.id)} onClick={() => onSort(sortKey)}>
        <div data-column-content className={cn("flex min-w-0 items-center truncate pr-3", column.align === "right" && "justify-end")}>
          <span className="truncate">{column.label}</span><SortIcon column={sortKey} sortConfig={sortConfig} />
        </div>
        <div role="separator" aria-orientation="vertical" aria-label={`${column.label} ${t("common.resize_column", "调整列宽")}`} className="absolute right-0 top-1/2 z-10 h-2/3 w-2 -translate-y-1/2 cursor-col-resize touch-none after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border/50 hover:after:w-0.5 hover:after:bg-primary" onPointerDown={(event) => startResize(event, column.id)} onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); autoFitColumn(column.id) }} />
      </TableHead>
    )
  }

  return (
    <Card className="shadow-md border-none overflow-hidden py-0">
      <CardContent className="p-0 overflow-hidden">
        <Table ref={tableRef} className="table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className={cn("w-[50px] pl-6", compact ? "h-9" : "h-12")}>
                <div
                  className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                  onClick={onToggleSelectAll}
                >
                  {selectedIds.length === filteredCount && filteredCount > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : selectedIds.length > 0 ? (
                    <div className="h-4 w-4 flex items-center justify-center">
                      <div className="w-2.5 h-0.5 bg-primary rounded-full" />
                    </div>
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              {orderedVisibleColumns.map(renderHeader)}
              <TableHead className={cn("w-[170px] pr-6 text-center", compact ? "h-9" : "h-12")}>{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody ref={tableBodyRef} data-virtualized={shouldVirtualize ? "true" : "false"}>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={tableColumnCount} className="p-0" style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {renderedRowIndexes.map((index) => {
              const torrent = paginatedTorrents[index]
              return (
              <TorrentRow
                key={`${rowAnimationKey}-${torrent.id}`}
                torrent={torrent}
                initialIndex={index}
                selected={selectedIdSet.has(torrent.id)}
                locale={locale}
                columns={orderedVisibleColumns}
                columnWidths={columnWidths}
                density={density}
                listPath={location.pathname}
                rowAnimationKey={rowAnimationKey}
                animateEntrance={animateRows}
                onToggleSelect={onToggleSelect}
                onSingleAction={onSingleAction}
                onOpenEdit={openEdit}
                onAdvancedSuccess={onAdvancedSuccess}
              />
              )
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={tableColumnCount} className="p-0" style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <EditTorrentDialog torrent={editingTorrent} onClose={closeEdit} onSuccess={onAdvancedSuccess} />
    </Card>
  )
}
