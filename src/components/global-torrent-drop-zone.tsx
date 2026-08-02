"use client"

import * as React from "react"
import { FileUp } from "lucide-react"
import { toast } from "sonner"

import { AddTorrentDialog } from "@/components/add-torrent-dialog"
import { useI18n } from "@/lib/i18n-context"

function containsFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files")
}

export function GlobalTorrentDropZone() {
  const { t } = useI18n()
  const [dragging, setDragging] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const dragDepth = React.useRef(0)

  React.useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    }
    const onDragOver = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"
    }
    const onDragLeave = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    }
    const onDrop = (event: DragEvent) => {
      if (!containsFiles(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const torrentFiles = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".torrent"))
      if (!torrentFiles.length) {
        toast.error(t("drop.invalid", "只能添加 .torrent 文件"))
        return
      }
      setFiles(torrentFiles)
      setDialogOpen(true)
    }
    const onOpenDialog = () => {
      setFiles([])
      setDialogOpen(true)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)
    window.addEventListener("qbittorrent:add-torrent", onOpenDialog)
    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("qbittorrent:add-torrent", onOpenDialog)
    }
  }, [t])

  return (
    <>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-background/80 p-6 backdrop-blur-md">
          <div className="flex w-full max-w-xl flex-col items-center gap-5 rounded-[2rem] border-2 border-dashed border-green-500 bg-green-500/10 px-8 py-16 text-center shadow-2xl">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30"><FileUp className="h-10 w-10" /></span>
            <div><p className="text-2xl font-bold">{t("drop.title", "松开以添加种子")}</p><p className="mt-2 text-sm text-muted-foreground">{t("drop.description", "可一次拖入多个 .torrent 文件")}</p></div>
          </div>
        </div>
      )}
      <AddTorrentDialog open={dialogOpen} onOpenChange={setDialogOpen} initialFiles={files} />
    </>
  )
}
