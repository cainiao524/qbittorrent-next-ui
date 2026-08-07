"use client"

import * as React from "react"
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, FolderCog, MoreHorizontal, Settings2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LocationInput } from "@/components/location-input"
import { rpc } from "@/lib/rpc-client"
import { exportTorrentFile } from "@/lib/torrent-export"
import { useI18n } from "@/lib/i18n-context"
import type { Torrent, TorrentId } from "@/lib/rpc-types"

interface AdvancedTorrentMenuProps {
  ids: TorrentId[]
  torrent?: Torrent
  onSuccess?: () => void
  onExport?: () => Promise<void> | void
  trigger?: React.ReactNode
}

type BooleanAction = "force" | "super" | "auto"

export function AdvancedTorrentMenu({ ids, torrent, onSuccess, onExport, trigger }: AdvancedTorrentMenuProps) {
  const { t } = useI18n()
  const [pathOpen, setPathOpen] = React.useState(false)
  const [savePath, setSavePath] = React.useState(torrent?.downloadDir ?? "")
  const [downloadPath, setDownloadPath] = React.useState(torrent?.downloadPath ?? "")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!pathOpen) return
    setSavePath(torrent?.downloadDir ?? "")
    setDownloadPath(torrent?.downloadPath ?? "")
  }, [pathOpen, torrent])

  const run = async (work: () => Promise<unknown>, message: string) => {
    try {
      await work()
      toast.success(message)
      onSuccess?.()
    } catch (error) {
      toast.error(t("advanced_menu.action_failed"), { description: error instanceof Error ? error.message : t("advanced_menu.action_rejected") })
    }
  }

  const setBoolean = (action: BooleanAction, value: boolean) => run(() => {
    if (action === "force") return rpc.setForceStart(ids, value)
    if (action === "super") return rpc.setSuperSeeding(ids, value)
    return rpc.setAutoManagement(ids, value)
  }, value ? t("advanced_menu.enabled") : t("advanced_menu.disabled"))

  const BooleanSubmenu = ({ label, action }: { label: string; action: BooleanAction }) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => void setBoolean(action, true)}>{t("advanced_menu.enable")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void setBoolean(action, false)}>{t("advanced_menu.disable")}</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )

  const savePaths = async () => {
    if (!savePath.trim()) {
      toast.error(t("advanced_menu.save_path_required"))
      return
    }
    setBusy(true)
    try {
      await rpc.setTorrentSavePath(ids, savePath.trim())
      await rpc.setTorrentDownloadPath(ids, downloadPath.trim())
      toast.success(t("advanced_menu.paths_updated"))
      setPathOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error(t("advanced_menu.paths_failed"), { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const exportTorrents = async () => {
    if (onExport) {
      await onExport()
      return
    }
    if (!torrent || ids.length !== 1) return
    try {
      await exportTorrentFile(ids[0], torrent.name)
      toast.success(t("export.success", "种子文件已导出"))
    } catch {
      toast.error(t("export.failed", "无法导出种子文件"))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" title={t("advanced_menu.title")}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("advanced_menu.title")}</DropdownMenuLabel>
          {torrent ? (
            <>
              <DropdownMenuCheckboxItem checked={torrent.forceStart} onCheckedChange={(value) => void setBoolean("force", value)}>{t("advanced_menu.force_start")}</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.sequentialDownload} onCheckedChange={() => void run(() => rpc.toggleSequentialDownload(ids), t("advanced_menu.sequential_changed"))}>{t("advanced_menu.sequential")}</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.firstLastPiecePriority} onCheckedChange={() => void run(() => rpc.toggleFirstLastPiecePriority(ids), t("advanced_menu.first_last_changed"))}>{t("advanced_menu.first_last")}</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.superSeeding} onCheckedChange={(value) => void setBoolean("super", value)}>{t("advanced_menu.super_seeding")}</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.autoManagement} onCheckedChange={(value) => void setBoolean("auto", value)}>{t("advanced_menu.auto_management")}</DropdownMenuCheckboxItem>
            </>
          ) : (
            <>
              <BooleanSubmenu label={t("advanced_menu.force_start")} action="force" />
              <DropdownMenuItem onClick={() => void run(() => rpc.toggleSequentialDownload(ids), t("advanced_menu.sequential_changed"))}>{t("advanced_menu.toggle_sequential")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void run(() => rpc.toggleFirstLastPiecePriority(ids), t("advanced_menu.first_last_changed"))}>{t("advanced_menu.toggle_first_last")}</DropdownMenuItem>
              <BooleanSubmenu label={t("advanced_menu.super_seeding")} action="super" />
              <BooleanSubmenu label={t("advanced_menu.auto_management")} action="auto" />
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("advanced_menu.queue_position")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "top"), t("advanced_menu.moved_top"))}><ArrowUpToLine />{t("advanced_menu.top")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "up"), t("advanced_menu.moved_up"))}><ArrowUp />{t("advanced_menu.up")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "down"), t("advanced_menu.moved_down"))}><ArrowDown />{t("advanced_menu.down")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "bottom"), t("advanced_menu.moved_bottom"))}><ArrowDownToLine />{t("advanced_menu.bottom")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPathOpen(true)}><FolderCog />{t("advanced_menu.edit_paths")}</DropdownMenuItem>
          <DropdownMenuItem disabled={!onExport && (!torrent || ids.length !== 1)} onClick={() => void exportTorrents()}><Upload />{t("export.action", "导出 .torrent 文件")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pathOpen} onOpenChange={setPathOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />{t("advanced_menu.path_title")}</DialogTitle>
            <DialogDescription>{t("advanced_menu.path_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("advanced_menu.save_path")}</label>
              <LocationInput value={savePath} onChange={setSavePath} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("advanced_menu.download_path")}</label>
              <LocationInput value={downloadPath} onChange={setDownloadPath} placeholder={t("advanced_menu.download_path_placeholder")} />
            </div>
            {ids.length > 1 && <p className="text-xs text-amber-600 dark:text-amber-400">{t("advanced_menu.batch_path_warning", { count: ids.length })}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPathOpen(false)}>{t("common.cancel")}</Button>
            <Button disabled={busy} onClick={() => void savePaths()}>{busy ? t("advanced_menu.saving") : t("advanced_menu.save_paths")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
