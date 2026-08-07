import * as React from "react"

export type SidebarItemId = "all" | "active" | "downloading" | "seeding" | "paused" | "settings"

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_SIDEBAR_ITEMS: SidebarItemId[] = ["all", "active", "downloading", "seeding", "paused", "settings"]

interface AppSettings {
  refreshInterval: number
  autoRefresh: boolean
  sidebarItems: SidebarItemId[]
  showSpeedChart: boolean
  animateTorrentSorting: boolean
}

interface AppSettingsContextType extends AppSettings {
  setRefreshInterval: (interval: number) => void
  setAutoRefresh: (enabled: boolean) => void
  setSidebarItems: (items: SidebarItemId[]) => void
  setShowSpeedChart: (enabled: boolean) => void
  setAnimateTorrentSorting: (enabled: boolean) => void
}

const AppSettingsContext = React.createContext<AppSettingsContextType | undefined>(undefined)

function readStoredNumber(key: string, fallback: number) {
  const value = localStorage.getItem(key)
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) || parsed < 500 ? fallback : parsed
}

function readStoredBoolean(key: string, fallback: boolean) {
  const value = localStorage.getItem(key)
  return value === null ? fallback : value === "true"
}

function readStoredSidebarItems() {
  const value = localStorage.getItem("app_sidebar_items")
  if (!value) return DEFAULT_SIDEBAR_ITEMS

  try {
    const parsed = JSON.parse(value) as SidebarItemId[]
    return Array.isArray(parsed) ? parsed : DEFAULT_SIDEBAR_ITEMS
  } catch {
    return DEFAULT_SIDEBAR_ITEMS
  }
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [refreshInterval, setRefreshIntervalState] = React.useState(() => readStoredNumber("app_refresh_interval", 3000))
  const [autoRefresh, setAutoRefreshState] = React.useState(() => readStoredBoolean("app_auto_refresh", true))
  const [sidebarItems, setSidebarItemsState] = React.useState(readStoredSidebarItems)
  const [showSpeedChart, setShowSpeedChartState] = React.useState(() => readStoredBoolean("app_show_speed_chart", true))
  const [animateTorrentSorting, setAnimateTorrentSortingState] = React.useState(() => readStoredBoolean("app_animate_torrent_sorting", true))

  // Load from localStorage on mount
  React.useEffect(() => {
    const savedInterval = localStorage.getItem("app_refresh_interval")
    if (savedInterval) {
      const val = parseInt(savedInterval, 10)
      if (!isNaN(val) && val >= 500) setRefreshIntervalState(val)
    }

    const savedAuto = localStorage.getItem("app_auto_refresh")
    if (savedAuto !== null) {
      setAutoRefreshState(savedAuto === "true")
    }
    const savedSidebar = localStorage.getItem("app_sidebar_items")
    if (savedSidebar) {
      try {
        const parsed = JSON.parse(savedSidebar) as SidebarItemId[]
        if (Array.isArray(parsed)) setSidebarItemsState(parsed)
      } catch { /* 保留默认配置 */ }
    }
    const savedChart = localStorage.getItem("app_show_speed_chart")
    if (savedChart !== null) setShowSpeedChartState(savedChart === "true")
    const savedSortAnimation = localStorage.getItem("app_animate_torrent_sorting")
    if (savedSortAnimation !== null) setAnimateTorrentSortingState(savedSortAnimation === "true")
  }, [])

  const setRefreshInterval = (val: number) => {
    setRefreshIntervalState(val)
    localStorage.setItem("app_refresh_interval", val.toString())
  }

  const setAutoRefresh = (val: boolean) => {
    setAutoRefreshState(val)
    localStorage.setItem("app_auto_refresh", val.toString())
  }

  const setSidebarItems = (items: SidebarItemId[]) => {
    const unique = [...new Set(items)]
    setSidebarItemsState(unique)
    localStorage.setItem("app_sidebar_items", JSON.stringify(unique))
  }

  const setShowSpeedChart = (enabled: boolean) => {
    setShowSpeedChartState(enabled)
    localStorage.setItem("app_show_speed_chart", String(enabled))
  }

  const setAnimateTorrentSorting = (enabled: boolean) => {
    setAnimateTorrentSortingState(enabled)
    localStorage.setItem("app_animate_torrent_sorting", String(enabled))
  }

  return (
    <AppSettingsContext.Provider value={{ refreshInterval, setRefreshInterval, autoRefresh, setAutoRefresh, sidebarItems, setSidebarItems, showSpeedChart, setShowSpeedChart, animateTorrentSorting, setAnimateTorrentSorting }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppSettings() {
  const context = React.useContext(AppSettingsContext)
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider")
  }
  return context
}
