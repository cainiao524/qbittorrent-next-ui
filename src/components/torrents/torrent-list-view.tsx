"use client"

import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
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

type SortKey =
  | "name"
  | "status"
  | "percentDone"
  | "size"
  | "totalSize"
  | "addedDate"
  | "editDate"
  | "uploadedEver"
  | "rateDownload"
  | "rateUpload"
  | "eta"
  | "uploadRatio"
  | "labels"

interface TorrentListViewProps {
  enableRowEntrance: boolean
  paginatedTorrents: Torrent[]
  visibleColumns: string[]
  allColumns: Array<ColumnConfig & { label: string }>
  selectedIds: TorrentId[]
  selectedIdSet: Set<TorrentId>
  filteredCount: number
  sortConfig: { key: SortKey; direction: 'asc' | 'desc' } | null
  animateSortTransitions: boolean
  tableMinWidth: number
  locale: string
  onToggleSelect: (id: TorrentId, range: boolean) => void
  onToggleSelectAll: () => void
  onSort: (key: SortKey) => void
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

  const getColumnStyle = (columnId: ColumnConfig["id"]): CSSProperties => {
    const column = columns.find(c => c.id === columnId)
    return {
      width: column?.width,
      minWidth: column?.minWidth,
    }
  }

  const renderCell = (column: ColumnConfig & { label: string }) => {
    const style: CSSProperties = {
      width: getColumnStyle(column.id).width,
      minWidth: getColumnStyle(column.id).minWidth,
    }

    switch (column.id) {
      case "name":
        return (
          <TableCell key={column.id} className="text-heading-3 max-w-[350px] lg:max-w-[500px] truncate" style={style} title={torrent.name}>
            <Link to={`/torrents/detail?id=${torrent.id}`} className="hover:text-primary transition-colors cursor-pointer block w-full min-w-0 truncate">
              {torrent.name}
            </Link>
          </TableCell>
        )
      case "status":
        return (
          <TableCell key={column.id}>
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider transition-colors",
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
          <TableCell key={column.id}>
            <div className="flex h-10 min-w-0 items-center">
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
        return <TableCell key={column.id} className="text-numeric text-right">{formatSize(torrent.size)}</TableCell>
      case "totalSize":
        return <TableCell key={column.id} className="text-numeric text-right">{formatSize(torrent.totalSize)}</TableCell>
      case "addedDate":
        return <TableCell key={column.id} className="text-numeric text-right text-muted-foreground text-xs">{formatDate(torrent.addedDate, locale)}</TableCell>
      case "editDate":
        return <TableCell key={column.id} className="text-numeric text-right text-muted-foreground text-xs">{torrent.editDate ? formatDate(torrent.editDate, locale) : "—"}</TableCell>
      case "uploadedEver":
        return <TableCell key={column.id} className="text-numeric text-right">{formatSize(torrent.uploadedEver)}</TableCell>
      case "rateDownload":
        return <TableCell key={column.id} className="text-numeric text-green-500 text-right">{formatSpeed(torrent.rateDownload)}</TableCell>
      case "rateUpload":
        return <TableCell key={column.id} className="text-numeric text-blue-500 text-right">{formatSpeed(torrent.rateUpload)}</TableCell>
      case "eta":
        return <TableCell key={column.id} className="text-right"><div className="flex items-center justify-end gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span className="text-label lowercase">{formatDuration(torrent.eta, locale)}</span></div></TableCell>
      case "uploadRatio":
        return <TableCell key={column.id} className="text-numeric text-right">{torrent.uploadRatio >= 0 ? torrent.uploadRatio.toFixed(2) : "0.00"}</TableCell>
    }
  }

  return (
    <TableRow
      key={`${rowAnimationKey}-${torrent.id}`}
      className={cn(
        "hover:bg-muted/30 transition-colors border-b last:border-0 border-muted/50 group/row",
        shouldAnimateEntrance && "animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none",
        selected && "bg-primary/5 hover:bg-primary/10"
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
  paginatedTorrents,
  visibleColumns,
  allColumns,
  selectedIds,
  selectedIdSet,
  filteredCount,
  sortConfig,
  animateSortTransitions,
  tableMinWidth,
  locale,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  onSingleAction,
  onAdvancedSuccess,
}: TorrentListViewProps) {
  const { t } = useI18n()
  const [editingTorrent, setEditingTorrent] = useState<Torrent | null>(null)
  const orderedVisibleColumns = useMemo(
    () => visibleColumns
      .map((columnId) => allColumns.find((column) => column.id === columnId))
      .filter((column): column is ColumnConfig & { label: string } => Boolean(column)),
    [visibleColumns, allColumns]
  )
  const rowAnimationKey = animateSortTransitions
    ? `${sortConfig?.key ?? "default"}-${sortConfig?.direction ?? "none"}`
    : "stable"
  const [previousRowAnimationKey, setPreviousRowAnimationKey] = useState(rowAnimationKey)
  const animateRows = enableRowEntrance || previousRowAnimationKey !== rowAnimationKey

  useEffect(() => {
    setPreviousRowAnimationKey(rowAnimationKey)
  }, [rowAnimationKey])

  const openEdit = useCallback((torrent: Torrent) => setEditingTorrent(torrent), [])
  const closeEdit = useCallback(() => setEditingTorrent(null), [])

  const getColumnStyle = (columnId: ColumnConfig["id"]): CSSProperties => {
    const column = allColumns.find(c => c.id === columnId)
    return {
      width: column?.width,
      minWidth: column?.minWidth,
    }
  }

  const getHeaderClassName = (column: ColumnConfig) =>
    cn(
      "h-12 cursor-pointer hover:text-primary transition-colors",
      column.align === "right" && "text-right"
    )

  const renderHeader = (column: ColumnConfig & { label: string }) => {
    const style = getColumnStyle(column.id)

    switch (column.id) {
      case "name":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("name")}><div className="flex items-center truncate pr-4">{t("common.name")} <SortIcon column="name" sortConfig={sortConfig} /></div></TableHead>
      case "status":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("status")}><div className="flex items-center">{t("common.status")} <SortIcon column="status" sortConfig={sortConfig} /></div></TableHead>
      case "progress":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("percentDone")}><div className="flex items-center">{t("common.progress")} <SortIcon column="percentDone" sortConfig={sortConfig} /></div></TableHead>
      case "size":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("size")}><div className="flex items-center justify-end">{t("common.size", "Size")} <SortIcon column="size" sortConfig={sortConfig} /></div></TableHead>
      case "totalSize":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("totalSize")}><div className="flex items-center justify-end">{t("common.total_size", "Total Size")} <SortIcon column="totalSize" sortConfig={sortConfig} /></div></TableHead>
      case "addedDate":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("addedDate")}><div className="flex items-center justify-end">{t("common.added_date", "Added Date")} <SortIcon column="addedDate" sortConfig={sortConfig} /></div></TableHead>
      case "editDate":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("editDate")}><div className="flex items-center justify-end">{t("common.edit_date", "Modified Date")} <SortIcon column="editDate" sortConfig={sortConfig} /></div></TableHead>
      case "uploadedEver":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("uploadedEver")}><div className="flex items-center justify-end">{t("details.total_uploaded", "Uploaded")} <SortIcon column="uploadedEver" sortConfig={sortConfig} /></div></TableHead>
      case "rateDownload":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("rateDownload")}><div className="flex items-center justify-end">{t("common.down_speed")} <SortIcon column="rateDownload" sortConfig={sortConfig} /></div></TableHead>
      case "rateUpload":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("rateUpload")}><div className="flex items-center justify-end">{t("common.up_speed")} <SortIcon column="rateUpload" sortConfig={sortConfig} /></div></TableHead>
      case "eta":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("eta")}><div className="flex items-center justify-end">{t("common.eta")} <SortIcon column="eta" sortConfig={sortConfig} /></div></TableHead>
      case "uploadRatio":
        return <TableHead key={column.id} className={getHeaderClassName(column)} style={style} onClick={() => onSort("uploadRatio")}><div className="flex items-center justify-end">{t("details.share_ratio", "Ratio")} <SortIcon column="uploadRatio" sortConfig={sortConfig} /></div></TableHead>
    }
  }

  return (
    <Card className="shadow-md border-none overflow-hidden py-0">
      <CardContent className="p-0 overflow-hidden">
        <Table className="table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-[50px] pl-6 h-12">
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
              <TableHead className="text-center w-[170px] h-12 pr-6">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTorrents.map((torrent, index) => (
              <TorrentRow
                key={`${rowAnimationKey}-${torrent.id}`}
                torrent={torrent}
                initialIndex={index}
                selected={selectedIdSet.has(torrent.id)}
                locale={locale}
                columns={orderedVisibleColumns}
                rowAnimationKey={rowAnimationKey}
                animateEntrance={animateRows}
                onToggleSelect={onToggleSelect}
                onSingleAction={onSingleAction}
                onOpenEdit={openEdit}
                onAdvancedSuccess={onAdvancedSuccess}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <EditTorrentDialog torrent={editingTorrent} onClose={closeEdit} onSuccess={onAdvancedSuccess} />
    </Card>
  )
}
