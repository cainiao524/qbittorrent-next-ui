"use client"

import { useState, useEffect, useCallback, useDeferredValue, useMemo, useRef } from "react"
import { MoreVertical, Pause, Play, Radio, ShieldCheck, Tag, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BatchReplaceTrackerDialog } from "@/components/torrents/batch-replace-tracker-dialog"
import { BatchMoveDirectoryDialog } from "@/components/torrents/batch-move-directory-dialog"
import { BatchSetLabelsSelectedDialog } from "@/components/torrents/batch-set-labels-selected-dialog"
import { toast } from "sonner"
import { RemoveTorrentDialog } from "@/components/torrents/remove-torrent-dialog"

import { useI18n } from "@/lib/i18n-context"
import { useSearch } from "@/lib/search-context"
import { rpc } from "@backend/rpc-client"
import { useTorrentData } from "@/hooks/use-torrent-data"
import { useTorrentFilters } from "@/hooks/use-torrent-filters"
import { useIsMobile } from "@/hooks/use-mobile"
import { useColumnManager } from "@/hooks/use-column-manager"
import { TorrentListView } from "@/components/torrents/torrent-list-view"
import { TorrentGridView } from "@/components/torrents/torrent-grid-view"
import { TorrentToolbar } from "@/components/torrents/torrent-toolbar"
import { KeyboardShortcutsDialog } from "@/components/torrents/keyboard-shortcuts-dialog"
import { AdvancedTorrentMenu } from "@/components/torrents/advanced-torrent-menu"
import { TorrentStatsBar } from "@/components/torrents/torrent-stats-bar"
import { TorrentEmptyState } from "@/components/torrents/torrent-empty-state"
import { SpeedHistoryChart } from "@/components/torrents/speed-history-chart"
import { useAppSettings } from "@/lib/app-settings-context"
import { exportTorrentFile } from "@/lib/torrent-export"
import {
  createTorrentActionPlan,
  type BatchTorrentAction,
  type SingleTorrentAction,
} from "@/lib/torrent-actions"
import { getTorrentOverview, selectTorrentRange, type SortConfig, type SortKey } from "@/lib/torrent-list-utils"
import { useSortedTorrents } from "@/hooks/use-sorted-torrents"
import { useSpeedHistory } from "@/hooks/use-speed-history"
import { useTorrentOverview } from "@/lib/torrent-overview-context"
import type { TorrentId } from "@/lib/rpc-types"
import { APP_CONFIG } from "@/lib/config"

interface TorrentViewProps {
  title?: string
  statusFilter?: string
  showStats?: boolean
  isActive?: boolean
}

export function TorrentView({ statusFilter, showStats = true, isActive = true }: TorrentViewProps) {
  const isMobile = useIsMobile()
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const { showSpeedChart, setShowSpeedChart, animateTorrentSorting, torrentListDensity } = useAppSettings()
  const [selectedIds, setSelectedIds] = useState<TorrentId[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<TorrentId | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: "addedDate", direction: "desc" })
  const { t, locale } = useI18n()
  const { searchQuery, setSearchQuery } = useSearch()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBatchReplaceOpen, setIsBatchReplaceOpen] = useState(false)
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false)
  const [isBatchSetLabelsOpen, setIsBatchSetLabelsOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [idsToDelete, setIdsToDelete] = useState<TorrentId[]>([])
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false)
  const [toolbarCount, setToolbarCount] = useState(0)

  const {
    visibleColumns,
    columnDnDSensors,
    toggleColumn,
    resetVisibleColumns,
    handleColumnDragEnd,
    allColumns,
    hiddenColumns,
    orderedVisibleColumnConfigs,
    tableMinWidth,
    columnWidths,
    setColumnWidth,
    actionsColumnPinned,
    setActionsColumnPinned,
  } = useColumnManager()

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setShowSelectionToolbar(selectedIds.length > 0)
        if (selectedIds.length > 0) setToolbarCount(selectedIds.length)
      },
      selectedIds.length > 0 ? 0 : 200,
    )
    return () => clearTimeout(timer)
  }, [selectedIds.length])

  const { torrents, stats, freeSpace, isInitialLoading, fetchData } = useTorrentData(viewMode, visibleColumns, isActive)
  const speedHistory = useSpeedHistory(showStats ? stats : null)
  const { setOverview, toggleFacet } = useTorrentOverview()

  useEffect(() => {
    if (isActive && !isInitialLoading) setOverview(getTorrentOverview(torrents))
  }, [isActive, isInitialLoading, setOverview, torrents])
  const deferredStatusFilter = useDeferredValue(statusFilter)

  const {
    trackerFilter,
    dirFilter,
    labelFilter,
    categoryFilter,
    toggleTracker,
    toggleDir,
    toggleLabel,
    clearFilters,
    trackers,
    downloadDirs,
    availableLabels,
    filteredTorrents,
  } = useTorrentFilters(torrents, deferredStatusFilter, searchQuery)

  const activeFilters = useMemo(() => [
    ...categoryFilter.map((value) => ({ kind: "category" as const, value })),
    ...trackerFilter.map((value) => ({ kind: "tracker" as const, value })),
    ...dirFilter.map((value) => ({ kind: "dir" as const, value })),
    ...labelFilter.map((value) => ({ kind: "label" as const, value })),
  ], [categoryFilter, dirFilter, labelFilter, trackerFilter])

  const totalDownloadSpeed = useMemo(() =>
    torrents.reduce((acc, tor) => acc + (tor.rateDownload || 0), 0)
    , [torrents])

  const totalUploadSpeed = useMemo(() =>
    torrents.reduce((acc, tor) => acc + (tor.rateUpload || 0), 0)
    , [torrents])

  const executeTorrentAction = useCallback(async (
    ids: TorrentId[],
    action: BatchTorrentAction,
    mode: "single" | "batch"
  ) => {
    const plan = createTorrentActionPlan(action, ids, mode, t)
    if (plan.type === "noop") return

    if (plan.type === "confirm-delete") {
      setIdsToDelete(plan.ids)
      setIsDeleteDialogOpen(true)
      return
    }

    try {
      switch (plan.action) {
        case "start":
          await rpc.startTorrents(plan.ids)
          break
        case "stop":
          await rpc.stopTorrents(plan.ids)
          break
        case "verify":
          await rpc.verifyTorrents(plan.ids)
          break
        case "reannounce":
          await rpc.reannounceTorrents(plan.ids)
          break
      }

      if (plan.toast.level === "success") {
        toast.success(plan.toast.title, { description: plan.toast.description })
      } else {
        toast.info(plan.toast.title, { description: plan.toast.description })
      }

      if (plan.clearSelection) {
        setSelectedIds([])
        setSelectionAnchorId(null)
      }
      await fetchData()
    } catch {
      toast.error(t('common.action_failed', 'Action Failed'))
    }
  }, [fetchData, t])

  const handleBatchAction = useCallback((action: BatchTorrentAction) => {
    void executeTorrentAction(selectedIds, action, "batch")
  }, [executeTorrentAction, selectedIds])

  const confirmDelete = async (deleteLocalData: boolean) => {
    try {
      await rpc.removeTorrents(idsToDelete, deleteLocalData)
      toast.success(t('common.remove_success', 'Removed'), {
        description: t('common.remove_desc', 'Selected torrents deleted')
      })
      if (idsToDelete.length > 1) {
        setSelectedIds([])
      } else {
        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)))
      }
      setIsDeleteDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(t('common.action_failed', 'Action Failed'))
      throw error
    }
  }

  const handleSingleAction = useCallback((id: TorrentId, action: SingleTorrentAction) =>
    executeTorrentAction([id], action, "single"), [executeTorrentAction])

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' | null = 'asc'

    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }

    setSortConfig(direction === null ? null : { key, direction })
  }

  const sortedTorrents = useSortedTorrents(filteredTorrents, sortConfig)
  const sortedIdsRef = useRef<TorrentId[]>([])

  useEffect(() => {
    sortedIdsRef.current = sortedTorrents.map((torrent) => torrent.id)
  }, [sortedTorrents])

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTorrents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTorrents.map(t => t.id))
    }
    setSelectionAnchorId(null)
  }

  const toggleSelect = useCallback((id: TorrentId, range = false) => {
    if (range) {
      setSelectedIds((current) => selectTorrentRange(sortedIdsRef.current, current, selectionAnchorId, id))
      return
    }
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setSelectionAnchorId(id)
  }, [selectionAnchorId])

  const exportSelectedTorrents = useCallback(async () => {
    let exported = 0
    for (const id of selectedIds) {
      const torrent = torrents.find((item) => item.id === id)
      if (!torrent) continue
      try {
        await exportTorrentFile(id, torrent.name)
        exported += 1
      } catch {
        // Continue exporting the remaining selected torrents.
      }
    }
    if (exported === selectedIds.length) toast.success(t("export.batch_success", "已导出选中的种子文件"))
    else toast.error(t("export.batch_partial", "部分种子文件无法导出"))
  }, [selectedIds, t, torrents])

  const handleGlobalAction = async (action: "start" | "stop") => {
    try {
      if (action === "start") {
        await rpc.startTorrents([])
        toast.success(t('common.resume_all_success', 'All tasks started'))
      } else {
        await rpc.stopTorrents([])
        toast.info(t('common.pause_all_success', 'All tasks stopped'))
      }
      fetchData()
    } catch {
      toast.error(t('common.action_failed', 'Action failed'))
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.matches("input, textarea, select, [contenteditable='true']") || target?.closest("[role='dialog']")
      if (isEditing) return

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === "a") {
        event.preventDefault()
        setSelectedIds(sortedTorrents.map((torrent) => torrent.id))
        setSelectionAnchorId(null)
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey && key === "a") {
        event.preventDefault()
        window.dispatchEvent(new Event(APP_CONFIG.events.addTorrent))
      } else if (event.key === "Escape") {
        setSelectedIds([])
        setSelectionAnchorId(null)
      } else if (event.key === "Delete" && selectedIds.length) {
        event.preventDefault()
        handleBatchAction("remove")
      } else if (!event.ctrlKey && !event.metaKey && key === "s" && selectedIds.length) {
        event.preventDefault()
        handleBatchAction("start")
      } else if (!event.ctrlKey && !event.metaKey && key === "p" && selectedIds.length) {
        event.preventDefault()
        handleBatchAction("stop")
      } else if (!event.ctrlKey && !event.metaKey && key === "r") {
        event.preventDefault()
        void fetchData()
      } else if (event.key === "?") {
        event.preventDefault()
        setIsShortcutsOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [fetchData, handleBatchAction, selectedIds.length, sortedTorrents])

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  return (
    <div key={statusFilter ?? "all"} className="flex flex-col gap-4 md:gap-6">
      {showStats && (
        stats && !isInitialLoading ? (
          <div className="flex flex-col gap-3 transition-none animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none" style={{ animationFillMode: "both" }}>
            <TorrentStatsBar
              stats={stats}
              freeSpace={freeSpace}
              downloadSpeed={totalDownloadSpeed}
              uploadSpeed={totalUploadSpeed}
              history={speedHistory}
              chartExpanded={showSpeedChart}
              onToggleChart={() => setShowSpeedChart(!showSpeedChart)}
            />
            {showSpeedChart && (
              <div className="transition-none animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none" style={{ animationFillMode: "both" }}>
                <SpeedHistoryChart stats={stats} history={speedHistory} />
              </div>
            )}
          </div>
        ) : (
          <div className="skeleton-gradient h-[84px] rounded-2xl border border-muted/30 bg-muted/20" />
        )
      )}

      <div className="flex flex-col gap-4">
        <div>
          <TorrentToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            trackers={trackers}
            downloadDirs={downloadDirs}
            availableLabels={availableLabels}
            trackerFilter={trackerFilter}
            dirFilter={dirFilter}
            labelFilter={labelFilter}
            toggleTracker={toggleTracker}
            toggleDir={toggleDir}
            toggleLabel={toggleLabel}
            clearFilters={clearFilters}
            orderedVisibleColumnConfigs={orderedVisibleColumnConfigs}
            visibleColumns={visibleColumns}
            hiddenColumns={hiddenColumns}
            isMobile={isMobile}
            columnDnDSensors={columnDnDSensors}
            toggleColumn={toggleColumn}
            resetVisibleColumns={resetVisibleColumns}
            handleColumnDragEnd={handleColumnDragEnd}
            actionsColumnPinned={actionsColumnPinned}
            onActionsColumnPinnedChange={setActionsColumnPinned}
            onBatchReplaceOpen={() => setIsBatchReplaceOpen(true)}
            onBatchMoveOpen={() => setIsBatchMoveOpen(true)}
            onShortcutsOpen={() => setIsShortcutsOpen(true)}
            fetchData={fetchData}
            onGlobalAction={handleGlobalAction}
          />
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map(({ kind, value }) => (
              <button
                key={`${kind}:${value}`}
                type="button"
                onClick={() => toggleFacet(kind, value)}
                className="flex max-w-60 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <span className="truncate">{value}</span>
                <X className="h-3 w-3 shrink-0" aria-hidden />
                <span className="sr-only">{t("filters.remove", "移除筛选")}</span>
              </button>
            ))}
            <button type="button" onClick={clearFilters} className="px-1 text-xs text-muted-foreground hover:text-foreground">
              {t("common.clear_filters", "清除筛选")}
            </button>
          </div>
        )}

        {isInitialLoading ? (
          <div className="overflow-hidden rounded-2xl bg-card/40">
            <div className="h-12 bg-muted/40" />
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton-gradient h-14 border-t border-muted/30 bg-muted/15" />
            ))}
          </div>
        ) : sortedTorrents.length === 0 ? (
          <TorrentEmptyState
            hasTorrents={torrents.length > 0}
            isFiltered={activeFilters.length > 0 || searchQuery.trim().length > 0}
            onAdd={() => window.dispatchEvent(new Event(APP_CONFIG.events.addTorrent))}
            onClearFilters={() => { clearFilters(); setSearchQuery("") }}
          />
        ) : (
          <div>
            {viewMode === "list" ? (
              <TorrentListView
                enableRowEntrance
                listTransitionKey={deferredStatusFilter ?? "all"}
                paginatedTorrents={sortedTorrents}
                visibleColumns={visibleColumns}
                allColumns={allColumns}
                selectedIds={selectedIds}
                selectedIdSet={selectedIdSet}
                filteredCount={filteredTorrents.length}
                sortConfig={sortConfig}
                animateSortTransitions={animateTorrentSorting}
                tableMinWidth={tableMinWidth}
                columnWidths={columnWidths}
                actionsColumnPinned={actionsColumnPinned}
                density={torrentListDensity}
                locale={locale}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onSort={handleSort}
                onColumnWidthChange={setColumnWidth}
                onSingleAction={handleSingleAction}
                onAdvancedSuccess={fetchData}
              />
            ) : (
              <TorrentGridView
                paginatedTorrents={sortedTorrents}
                onSingleAction={handleSingleAction}
                onAdvancedSuccess={fetchData}
              />
            )}
          </div>
        )}

        {!isInitialLoading && sortedTorrents.length > 0 && (
          <p className="text-numeric py-4 text-center text-xs text-muted-foreground">
            {t("common.total_items", { count: sortedTorrents.length })}
          </p>
        )}
      </div>

      {showSelectionToolbar && (
        <div
          data-state={selectedIds.length > 0 ? "open" : "closed"}
          style={{ animationFillMode: "both" }}
          aria-hidden={selectedIds.length === 0}
          inert={selectedIds.length === 0}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[calc(100%-2rem)] md:max-w-fit px-2 sm:px-0 data-[state=open]:transition-none animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-8 duration-200 motion-reduce:animate-none"
        >
          <div className="relative min-w-0 md:min-w-[400px] rounded-[2.5rem] border border-primary/20 shadow-[0_8px_40px_rgba(var(--primary),0.15)]">
            <div className="selected-toolbar-bg absolute inset-0 rounded-[2.5rem] bg-background/80" />
            <div className="relative flex items-center gap-2 md:gap-6 px-3 py-2.5 md:px-6 md:py-4 justify-between md:justify-start">
            <div className="flex items-center gap-2 border-r pr-3 md:pr-6 mr-1 md:mr-2 shrink-0">
              <div className="bg-primary text-primary-foreground text-[10px] md:text-xs font-bold h-5 w-5 md:h-6 md:w-6 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                {selectedIds.length || toolbarCount}
              </div>
              <span className="text-sm font-bold tracking-tight hidden lg:inline">{t('common.selected')}</span>
            </div>

            <div className="flex items-center gap-1.5 xl:gap-3 flex-1 min-w-0 overflow-x-auto no-scrollbar justify-center md:justify-start">
              <Button size="sm" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4" onClick={() => handleBatchAction("start")}>
                <Play className="h-4 w-4" />
                <span className="hidden xl:inline">{t('common.resume')}</span>
              </Button>
              <Button size="sm" variant="secondary" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4" onClick={() => handleBatchAction("stop")}>
                <Pause className="h-4 w-4" />
                <span className="hidden xl:inline">{t('common.pause')}</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleBatchAction("remove")}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden xl:inline">{t('common.remove')}</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4 bg-muted/50 hover:bg-muted/70">
                    <MoreVertical className="h-4 w-4" />
                    <span className="hidden xl:inline">{t('common.more', 'More')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className="w-[200px] rounded-2xl border border-muted/50 bg-card/95 backdrop-blur-xl shadow-2xl p-1">
                  <DropdownMenuItem
                    className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted"
                    onClick={() => handleBatchAction("verify")}
                  >
                    <ShieldCheck className="h-4 w-4 opacity-60" />
                    {t('common.verify', 'Verify')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted"
                    onClick={() => handleBatchAction("reannounce")}
                  >
                    <Radio className="h-4 w-4 opacity-60" />
                    {t('common.reannounce', 'Reannounce')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted"
                    onClick={() => setIsBatchSetLabelsOpen(true)}
                  >
                    <Tag className="h-4 w-4 opacity-60" />
                    {t('common.set_torrent_labels')}
                  </DropdownMenuItem>
                  <AdvancedTorrentMenu
                    ids={selectedIds}
                    onSuccess={fetchData}
                    onExport={exportSelectedTorrents}
                    trigger={
                      <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="rounded-xl py-2.5 px-3 cursor-pointer gap-3 font-medium focus:bg-muted">
                        <MoreVertical className="h-4 w-4 opacity-60" />
                        高级任务操作
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 md:h-9 md:w-9 rounded-full shrink-0 hover:bg-muted/50"
              onClick={() => { setSelectedIds([]); setSelectionAnchorId(null) }}
            >
              <X className="h-4 w-4 opacity-50" />
            </Button>
            </div>
          </div>
        </div>
      )}

      <RemoveTorrentDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        onCloseComplete={() => setIdsToDelete([])}
        count={idsToDelete.length}
      />

      <BatchReplaceTrackerDialog
        open={isBatchReplaceOpen}
        onOpenChange={setIsBatchReplaceOpen}
        onSuccess={fetchData}
      />

      <BatchMoveDirectoryDialog
        open={isBatchMoveOpen}
        onOpenChange={setIsBatchMoveOpen}
        onSuccess={fetchData}
      />

      <BatchSetLabelsSelectedDialog
        open={isBatchSetLabelsOpen}
        onOpenChange={setIsBatchSetLabelsOpen}
        selectedIds={selectedIds}
        onSuccess={fetchData}
      />
      <KeyboardShortcutsDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
    </div>
  )
}
