"use client"

import * as React from "react"
import { ArrowUpDown, Download, History, LayoutPanelLeft, RotateCcw, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { rpc } from "@/lib/rpc-client"
import { useI18n } from "@/lib/i18n-context"
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
    animateTorrentSorting?: boolean
  }
}

const SIDEBAR_OPTIONS: Array<{ id: SidebarItemId; labelKey: string }> = [
  { id: "all", labelKey: "interface_settings.sidebar_all" },
  { id: "active", labelKey: "interface_settings.sidebar_active" },
  { id: "downloading", labelKey: "interface_settings.sidebar_downloading" },
  { id: "seeding", labelKey: "interface_settings.sidebar_seeding" },
  { id: "paused", labelKey: "interface_settings.sidebar_paused" },
  { id: "settings", labelKey: "interface_settings.sidebar_settings" },
]

export function InterfaceSettingsPanel() {
  const settings = useAppSettings()
  const { t } = useI18n()
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
      animateTorrentSorting: settings.animateTorrentSorting,
    },
  })

  const applyBackup = async (backup: SettingsBackup) => {
    if (backup.format !== "qbittorrent-next-ui-settings" || backup.version !== 1) throw new Error(t("interface_settings.unsupported_backup"))
    await rpc.setApplicationPreferences(backup.qbittorrent)
    settings.setRefreshInterval(backup.interface.refreshInterval)
    settings.setAutoRefresh(backup.interface.autoRefresh)
    settings.setSidebarItems(backup.interface.sidebarItems)
    settings.setShowSpeedChart(backup.interface.showSpeedChart)
    settings.setAnimateTorrentSorting(backup.interface.animateTorrentSorting ?? true)
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
      toast.success(t("interface_settings.exported"))
    } catch (error) {
      toast.error(t("interface_settings.export_failed"), { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const importSettings = async (file: File) => {
    if (!window.confirm(t("interface_settings.import_confirm"))) return
    setBusy(true)
    try {
      const incoming = JSON.parse(await file.text()) as SettingsBackup
      const restorePoint = await createBackup()
      localStorage.setItem("settings_restore_point", JSON.stringify(restorePoint))
      setHasRestorePoint(true)
      await applyBackup(incoming)
      toast.success(t("interface_settings.imported"), { description: t("interface_settings.restore_point_created") })
    } catch (error) {
      toast.error(t("interface_settings.import_failed"), { description: error instanceof Error ? error.message : t("interface_settings.invalid_file") })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const restoreSettings = async () => {
    const raw = localStorage.getItem("settings_restore_point")
    if (!raw || !window.confirm(t("interface_settings.restore_confirm"))) return
    setBusy(true)
    try {
      await applyBackup(JSON.parse(raw) as SettingsBackup)
      toast.success(t("interface_settings.restored"))
    } catch (error) {
      toast.error(t("interface_settings.restore_failed"), { description: error instanceof Error ? error.message : undefined })
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
          <CardTitle className="flex items-center gap-2"><LayoutPanelLeft className="h-5 w-5 text-green-500" />{t("interface_settings.sidebar_title")}</CardTitle>
          <CardDescription>{t("interface_settings.sidebar_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SIDEBAR_OPTIONS.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-muted/30 p-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-green-500" checked={settings.sidebarItems.includes(item.id)} onChange={() => toggleSidebarItem(item.id)} />{t(item.labelKey)}</label>)}
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 p-4">
            <span><span className="flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4 text-green-500" />{t("interface_settings.speed_chart")}</span><span className="mt-1 block text-xs text-muted-foreground">{t("interface_settings.speed_chart_desc")}</span></span>
            <input type="checkbox" className="h-5 w-5 accent-green-500" checked={settings.showSpeedChart} onChange={(event) => settings.setShowSpeedChart(event.target.checked)} />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 p-4">
            <span><span className="flex items-center gap-2 text-sm font-medium"><ArrowUpDown className="h-4 w-4 text-blue-500" />{t("interface_settings.sort_animation")}</span><span className="mt-1 block text-xs text-muted-foreground">{t("interface_settings.sort_animation_desc")}</span></span>
            <input type="checkbox" className="h-5 w-5 accent-green-500" checked={settings.animateTorrentSorting} onChange={(event) => settings.setAnimateTorrentSorting(event.target.checked)} />
          </label>
          <Button variant="outline" size="sm" onClick={() => { settings.setSidebarItems(DEFAULT_SIDEBAR_ITEMS); settings.setShowSpeedChart(true); settings.setAnimateTorrentSorting(true) }}><RotateCcw className="mr-2 h-4 w-4" />{t("interface_settings.reset_interface")}</Button>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/60 shadow-xl">
        <CardHeader>
          <CardTitle>{t("interface_settings.backup_title")}</CardTitle>
          <CardDescription>{t("interface_settings.backup_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSettings(file) }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button disabled={busy} onClick={() => void exportSettings()}><Download className="mr-2 h-4 w-4" />{t("interface_settings.export")}</Button>
            <Button disabled={busy} variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{t("interface_settings.import")}</Button>
          </div>
          <Button disabled={busy || !hasRestorePoint} variant="secondary" className="w-full" onClick={() => void restoreSettings()}><RotateCcw className="mr-2 h-4 w-4" />{t("interface_settings.restore")}</Button>
          <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">{t("interface_settings.warning")}</p>
        </CardContent>
      </Card>
    </div>
  )
}
