"use client"

import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"
import type { TorrentId } from "@/lib/rpc-types"
import { exportTorrentFile } from "@/lib/torrent-export"

export function ExportTorrentButton({ id, name }: { id: TorrentId; name: string }) {
  const { t } = useI18n()

  const handleExport = async () => {
    try {
      await exportTorrentFile(id, name)
      toast.success(t("export.success", "种子文件已导出"))
    } catch {
      toast.error(t("export.failed", "无法导出种子文件"))
    }
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-500/10 hover:text-green-500" onClick={handleExport} title={t("export.action", "导出 .torrent 文件")}>
      <Download className="h-4 w-4" />
    </Button>
  )
}
