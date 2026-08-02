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
      toast.error("操作失败", { description: error instanceof Error ? error.message : "qBittorrent 拒绝了此操作" })
    }
  }

  const setBoolean = (action: BooleanAction, value: boolean) => run(() => {
    if (action === "force") return rpc.setForceStart(ids, value)
    if (action === "super") return rpc.setSuperSeeding(ids, value)
    return rpc.setAutoManagement(ids, value)
  }, value ? "已启用所选功能" : "已关闭所选功能")

  const BooleanSubmenu = ({ label, action }: { label: string; action: BooleanAction }) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => void setBoolean(action, true)}>启用</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void setBoolean(action, false)}>关闭</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )

  const savePaths = async () => {
    if (!savePath.trim()) {
      toast.error("完成保存路径不能为空")
      return
    }
    setBusy(true)
    try {
      await rpc.setTorrentSavePath(ids, savePath.trim())
      await rpc.setTorrentDownloadPath(ids, downloadPath.trim())
      toast.success("任务路径已更新")
      setPathOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error("路径更新失败", { description: error instanceof Error ? error.message : undefined })
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
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" title="高级任务操作">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>高级任务控制</DropdownMenuLabel>
          {torrent ? (
            <>
              <DropdownMenuCheckboxItem checked={torrent.forceStart} onCheckedChange={(value) => void setBoolean("force", value)}>强制启动</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.sequentialDownload} onCheckedChange={() => void run(() => rpc.toggleSequentialDownload(ids), "顺序下载状态已切换")}>顺序下载</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.firstLastPiecePriority} onCheckedChange={() => void run(() => rpc.toggleFirstLastPiecePriority(ids), "首尾区块优先状态已切换")}>优先下载首尾区块</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.superSeeding} onCheckedChange={(value) => void setBoolean("super", value)}>超级做种</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={torrent.autoManagement} onCheckedChange={(value) => void setBoolean("auto", value)}>自动种子管理</DropdownMenuCheckboxItem>
            </>
          ) : (
            <>
              <BooleanSubmenu label="强制启动" action="force" />
              <DropdownMenuItem onClick={() => void run(() => rpc.toggleSequentialDownload(ids), "已切换顺序下载状态")}>切换顺序下载</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void run(() => rpc.toggleFirstLastPiecePriority(ids), "已切换首尾区块优先状态")}>切换首尾区块优先</DropdownMenuItem>
              <BooleanSubmenu label="超级做种" action="super" />
              <BooleanSubmenu label="自动种子管理" action="auto" />
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>队列位置</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "top"), "已移至队列顶部")}><ArrowUpToLine />置顶</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "up"), "已在队列中上移")}><ArrowUp />上移</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "down"), "已在队列中下移")}><ArrowDown />下移</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run(() => rpc.changeQueuePriority(ids, "bottom"), "已移至队列底部")}><ArrowDownToLine />置底</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPathOpen(true)}><FolderCog />修改下载与保存路径</DropdownMenuItem>
          <DropdownMenuItem disabled={!onExport && (!torrent || ids.length !== 1)} onClick={() => void exportTorrents()}><Upload />{t("export.action", "导出 .torrent 文件")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pathOpen} onOpenChange={setPathOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />任务路径</DialogTitle>
            <DialogDescription>完成保存路径用于最终文件；下载路径用于未完成文件，留空可关闭临时路径。</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">完成保存路径</label>
              <LocationInput value={savePath} onChange={setSavePath} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">未完成文件下载路径</label>
              <LocationInput value={downloadPath} onChange={setDownloadPath} placeholder="留空表示不使用临时下载路径" />
            </div>
            {ids.length > 1 && <p className="text-xs text-amber-600 dark:text-amber-400">将把相同路径应用到已选的 {ids.length} 个任务。开启自动种子管理的任务可能由分类规则覆盖路径。</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPathOpen(false)}>取消</Button>
            <Button disabled={busy} onClick={() => void savePaths()}>{busy ? "正在保存…" : "保存路径"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
