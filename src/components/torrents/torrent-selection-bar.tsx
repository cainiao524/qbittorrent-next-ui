"use client"

import { CheckSquare, MoreHorizontal, Pause, Play, Radio, ShieldCheck, Tag, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { AdvancedTorrentMenu } from "@/components/torrents/advanced-torrent-menu"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"
import type { BatchTorrentAction } from "@/lib/torrent-actions"
import type { TorrentId } from "@/lib/rpc-types"

interface TorrentSelectionBarProps {
  selectedIds: TorrentId[]
  totalCount: number
  onBatchAction: (action: BatchTorrentAction) => void
  onSelectAll: () => void
  onClear: () => void
  onSetLabels: () => void
  onExport: () => Promise<void>
  onAdvancedSuccess: () => void
  /** false while the bar plays its exit animation after the selection was cleared. */
  open?: boolean
  className?: string
}

/**
 * Overlays the list toolbar while torrents are selected, so the list never shifts. Order follows frequency:
 * start / stop, organise (labels, advanced: location, queue, limits), then the
 * destructive remove action last, separated and in red.
 */
export function TorrentSelectionBar({
  selectedIds,
  totalCount,
  onBatchAction,
  onSelectAll,
  onClear,
  onSetLabels,
  onExport,
  onAdvancedSuccess,
  open = true,
  className,
}: TorrentSelectionBarProps) {
  const { t } = useI18n()
  const count = selectedIds.length
  const buttonClass = "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"

  return (
    <div
      role="toolbar"
      aria-label={t("common.selected")}
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
      inert={!open}
      style={{ animationFillMode: "both" }}
      className={cn(
        "flex items-center gap-1 rounded-xl border border-primary/20 bg-background px-2 py-1.5 shadow-sm transition-none duration-150 motion-reduce:animate-none sm:gap-2 sm:px-3",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:pointer-events-none",
        className,
      )}
    >
      <span className="flex shrink-0 items-center gap-1.5 pr-1 text-xs font-semibold text-primary sm:pr-2">
        <CheckSquare className="h-4 w-4" />
        <span className="text-numeric">{t("selection.count", { count })}</span>
      </span>
      {count < totalCount && (
        <Button variant="ghost" size="sm" className="hidden h-8 rounded-lg px-2 text-xs text-muted-foreground sm:inline-flex" onClick={onSelectAll}>
          {t("selection.select_all", { count: totalCount })}
        </Button>
      )}

      <div className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
        <Button size="sm" className={buttonClass} onClick={() => onBatchAction("start")} title="S">
          <Play className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{t("common.resume")}</span>
        </Button>
        <Button size="sm" variant="secondary" className={buttonClass} onClick={() => onBatchAction("stop")} title="P">
          <Pause className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{t("common.pause")}</span>
        </Button>
        <Button size="sm" variant="ghost" className={buttonClass} onClick={onSetLabels}>
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{t("common.set_torrent_labels")}</span>
        </Button>
        <AdvancedTorrentMenu
          ids={selectedIds}
          onSuccess={onAdvancedSuccess}
          onExport={onExport}
          trigger={(
            <Button size="sm" variant="ghost" className={buttonClass}>
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t("common.more", "更多")}</span>
            </Button>
          )}
          extraItems={(
            <>
              <DropdownMenuItem onClick={() => onBatchAction("verify")}><ShieldCheck />{t("common.verify", "Verify")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBatchAction("reannounce")}><Radio />{t("common.reannounce", "Reannounce")}</DropdownMenuItem>
            </>
          )}
        />
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
        <Button size="sm" variant="ghost" className={`${buttonClass} text-destructive hover:bg-destructive/10 hover:text-destructive`} onClick={() => onBatchAction("remove")} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{t("common.remove")}</span>
        </Button>
      </div>

      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-lg" onClick={onClear} aria-label={t("selection.clear", "清除选择")} title="Esc">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
