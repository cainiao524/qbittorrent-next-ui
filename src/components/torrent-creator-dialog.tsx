"use client"

import * as React from "react"
import { FileArchive, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { downloadBlob } from "@/lib/download"
import { useI18n } from "@/lib/i18n-context"
import { rpc } from "@/lib/rpc-client"
import type { TorrentCreatorArgs } from "@/lib/rpc-types"

const PIECE_SIZES = [0, ...Array.from({ length: 14 }, (_, index) => 16 * 1024 * (2 ** index))]

function pieceSizeLabel(value: number, automatic: string) {
  if (value === 0) return automatic
  if (value < 1024 * 1024) return `${value / 1024} KiB`
  return `${value / 1024 / 1024} MiB`
}

const initialForm: TorrentCreatorArgs = {
  sourcePath: "",
  format: "hybrid",
  pieceSize: 0,
  private: false,
  startSeeding: false,
  trackers: "",
  urlSeeds: "",
  comment: "",
  source: "",
}

export function TorrentCreatorDialog({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<TorrentCreatorArgs>(initialForm)
  const [creating, setCreating] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const update = <K extends keyof TorrentCreatorArgs>(key: K, value: TorrentCreatorArgs[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleCreate = async () => {
    if (!form.sourcePath.trim()) {
      toast.error(t("creator.source_required", "请选择服务器上的源文件或文件夹"))
      return
    }

    setCreating(true)
    setProgress(0)
    let taskID = ""
    try {
      const created = await rpc.createTorrent({ ...form, sourcePath: form.sourcePath.trim() })
      taskID = created.taskID
      for (;;) {
        const task = await rpc.getTorrentCreatorTask(taskID)
        const nextProgress = task.status === "Finished" ? 100 : Math.round(Math.min(1, Math.max(0, task.progress ?? 0)) * 100)
        setProgress(nextProgress)
        if (task.status === "Failed") throw new Error(task.errorMessage || t("creator.create_failed", "创建种子失败"))
        if (task.status === "Finished") break
        await new Promise((resolve) => window.setTimeout(resolve, 800))
      }

      const result = await rpc.downloadCreatedTorrent(taskID)
      downloadBlob(result.blob, result.filename)
      toast.success(t("creator.create_success", "种子创建完成并已下载"))
      setOpen(false)
      setForm(initialForm)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("creator.create_failed", "创建种子失败"))
    } finally {
      if (taskID) await rpc.deleteTorrentCreatorTask(taskID).catch(() => undefined)
      setCreating(false)
      setProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !creating && setOpen(nextOpen)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto border-none bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader className="border-b border-muted/30 px-6 pb-5 pt-6">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><FileArchive className="h-5 w-5" /></span>
            {t("creator.title", "种子创建器")}
          </DialogTitle>
          <DialogDescription>{t("creator.description", "使用 NAS 上已有的文件或文件夹创建 .torrent 文件。路径必须是 qBittorrent 容器内可访问的路径。")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 px-6 py-5">
          <label className="grid gap-2 text-sm font-medium">
            {t("creator.source_path", "源文件或文件夹路径")}
            <Input value={form.sourcePath} onChange={(event) => update("sourcePath", event.target.value)} placeholder="/downloads/example" disabled={creating} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {t("creator.format", "种子格式")}
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.format} onChange={(event) => update("format", event.target.value as TorrentCreatorArgs["format"])} disabled={creating}>
                <option value="v1">V1</option>
                <option value="hybrid">{t("creator.hybrid", "混合格式")}</option>
                <option value="v2">V2</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t("creator.piece_size", "分块大小")}
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.pieceSize} onChange={(event) => update("pieceSize", Number(event.target.value))} disabled={creating}>
                {PIECE_SIZES.map((size) => <option key={size} value={size}>{pieceSizeLabel(size, t("creator.automatic", "自动"))}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl bg-muted/30 p-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-0.5 h-4 w-4 accent-green-500" type="checkbox" checked={form.private} onChange={(event) => update("private", event.target.checked)} disabled={creating} />
              <span><strong className="block">{t("creator.private", "私有种子")}</strong><span className="text-xs text-muted-foreground">{t("creator.private_desc", "不会通过 DHT 分发")}</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-0.5 h-4 w-4 accent-green-500" type="checkbox" checked={form.startSeeding} onChange={(event) => update("startSeeding", event.target.checked)} disabled={creating} />
              <span><strong className="block">{t("creator.start_seeding", "立即开始做种")}</strong><span className="text-xs text-muted-foreground">{t("creator.start_seeding_desc", "创建后加入当前 qBittorrent")}</span></span>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            {t("creator.trackers", "Tracker 地址")}
            <Textarea rows={4} value={form.trackers} onChange={(event) => update("trackers", event.target.value)} placeholder={t("creator.one_url_per_line", "每行一个地址，空行分隔层级")} disabled={creating} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t("creator.web_seeds", "网络种子地址")}
            <Textarea rows={3} value={form.urlSeeds} onChange={(event) => update("urlSeeds", event.target.value)} placeholder={t("creator.one_url_per_line", "每行一个地址，空行分隔层级")} disabled={creating} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">{t("creator.source", "来源")}<Input value={form.source} onChange={(event) => update("source", event.target.value)} disabled={creating} /></label>
            <label className="grid gap-2 text-sm font-medium">{t("creator.comment", "备注")}<Input value={form.comment} onChange={(event) => update("comment", event.target.value)} disabled={creating} /></label>
          </div>

          {creating && (
            <div className="space-y-2 rounded-2xl bg-primary/5 p-4">
              <div className="flex justify-between text-sm font-medium"><span>{t("creator.creating", "正在创建种子…")}</span><span>{progress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} /></div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-muted/30 px-6 py-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={creating}>{t("common.cancel", "取消")}</Button>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
            {t("creator.create", "创建并下载")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
