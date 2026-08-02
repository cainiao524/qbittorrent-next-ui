"use client"

import * as React from "react"
import { Download, History, LayoutPanelLeft, RotateCcw, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { rpc } from "@/lib/rpc-client"
import { DEFAULT_SIDEBAR_ITEMS, useAppSettings, type SidebarItemId } from "@/lib/app-settings-context"
import type { ApplicationPreferences } from "@/lib/rpc-types"

interface SettingsBackup {
  format: "qbittorrent-next-ui-settings"
  version: 1
  createdAt: string
  qbittorrent: ApplicationPreferences
  interface: {
    refreshInterval: number
    autoRefresh: boolean
    sidebarItems: SidebarItemId[]
    showSpeedChart: boolean
  }
}

const SIDEBAR_OPTIONS: Array<{ id: SidebarItemId; label: string }> = [
  { id: "all", label: "全部任务" },
  { id: "active", label: "活动任务" },
  { id: "downloading", label: "下载中" },
  { id: "seeding", label: "做种中" },
  { id: "paused", label: "已暂停" },
  { id: "settings", label: "设置" },
]

export function InterfaceSettingsPanel() {
  const settings = useAppSettings()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [hasRestorePoint, setHasRestorePoint] = React.useState(() => Boolean(localStorage.getItem("settings_restore_point")))

  const createBackup = async (): Promise<SettingsBackup> => ({
    format: "qbittorrent-next-ui-settings",
    version: 1,
    createdAt: new Date().toISOString(),
    qbittorrent: await rpc.getApplicationPreferences(),
    interface: {
      refreshInterval: settings.refreshInterval,
      autoRefresh: settings.autoRefresh,
      sidebarItems: settings.sidebarItems,
      showSpeedChart: settings.showSpeedChart,
    },
  })

  const applyBackup = async (backup: SettingsBackup) => {
    if (backup.format !== "qbittorrent-next-ui-settings" || backup.version !== 1) throw new Error("不支持的备份文件格式")
    await rpc.setApplicationPreferences(backup.qbittorrent)
    settings.setRefreshInterval(backup.interface.refreshInterval)
    settings.setAutoRefresh(backup.interface.autoRefresh)
    settings.setSidebarItems(backup.interface.sidebarItems)
    settings.setShowSpeedChart(backup.interface.showSpeedChart)
  }

  const exportSettings = async () => {
    setBusy(true)
    try {
      const backup = await createBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `qbittorrent-next-ui-settings-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("设置备份已导出")
    } catch (error) {
      toast.error("导出失败", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const importSettings = async (file: File) => {
    if (!window.confirm("导入会覆盖当前 qBittorrent 和界面设置，是否继续？")) return
    setBusy(true)
    try {
      const incoming = JSON.parse(await file.text()) as SettingsBackup
      const restorePoint = await createBackup()
      localStorage.setItem("settings_restore_point", JSON.stringify(restorePoint))
      setHasRestorePoint(true)
      await applyBackup(incoming)
      toast.success("设置已导入", { description: "导入前配置已保存为恢复点" })
    } catch (error) {
      toast.error("导入失败", { description: error instanceof Error ? error.message : "文件内容无效" })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const restoreSettings = async () => {
    const raw = localStorage.getItem("settings_restore_point")
    if (!raw || !window.confirm("确定恢复到最近一次导入前的设置吗？")) return
    setBusy(true)
    try {
      await applyBackup(JSON.parse(raw) as SettingsBackup)
      toast.success("已恢复导入前的设置")
    } catch (error) {
      toast.error("恢复失败", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const toggleSidebarItem = (id: SidebarItemId) => {
    const next = settings.sidebarItems.includes(id) ? settings.sidebarItems.filter((item) => item !== id) : [...settings.sidebarItems, id]
    settings.setSidebarItems(next)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-none bg-card/60 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LayoutPanelLeft className="h-5 w-5 text-green-500" />侧栏与仪表盘</CardTitle>
          <CardDescription>选择侧栏中显示的入口，以及是否展示速度历史图表。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SIDEBAR_OPTIONS.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-muted/30 p-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-green-500" checked={settings.sidebarItems.includes(item.id)} onChange={() => toggleSidebarItem(item.id)} />{item.label}</label>)}
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 p-4">
            <span><span className="flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4 text-green-500" />传输速度历史图表</span><span className="mt-1 block text-xs text-muted-foreground">在仪表盘保存并显示最近 60 次刷新数据</span></span>
            <input type="checkbox" className="h-5 w-5 accent-green-500" checked={settings.showSpeedChart} onChange={(event) => settings.setShowSpeedChart(event.target.checked)} />
          </label>
          <Button variant="outline" size="sm" onClick={() => { settings.setSidebarItems(DEFAULT_SIDEBAR_ITEMS); settings.setShowSpeedChart(true) }}><RotateCcw className="mr-2 h-4 w-4" />恢复界面默认配置</Button>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 shadow-xl">
        <CardHeader>
          <CardTitle>设置备份与恢复</CardTitle>
          <CardDescription>备份包含 qBittorrent 偏好设置和当前界面配置。导入前会自动建立恢复点。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSettings(file) }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button disabled={busy} onClick={() => void exportSettings()}><Download className="mr-2 h-4 w-4" />导出设置</Button>
            <Button disabled={busy} variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />导入设置</Button>
          </div>
          <Button disabled={busy || !hasRestorePoint} variant="secondary" className="w-full" onClick={() => void restoreSettings()}><RotateCcw className="mr-2 h-4 w-4" />恢复最近一次导入前设置</Button>
          <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">导入可能修改 WebUI、网络和认证相关配置。请只使用来自同一服务器或确认可信的备份文件。</p>
        </CardContent>
      </Card>
    </div>
  )
}
