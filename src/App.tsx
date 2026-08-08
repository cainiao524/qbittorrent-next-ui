import { useEffect, useLayoutEffect, useRef } from "react"
import { HashRouter, useLocation } from "react-router-dom"
import { Layout } from "@/components/layout"
import { TorrentView } from "@/components/torrents/torrent-view"
import TorrentDetailsPage from "@/app/torrents/detail/page"
import SettingsPage from "@/app/settings/page"
import { AuthGate } from "@/components/auth-gate"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/lib/i18n-context"

interface TorrentRouteConfig {
  statusFilter?: string
  showStats: boolean
}

const TORRENT_ROUTE_CONFIGS: Record<string, TorrentRouteConfig> = {
  "/": { showStats: true },
  "/active": { statusFilter: "active", showStats: false },
  "/downloading": { statusFilter: "downloading", showStats: false },
  "/paused": { statusFilter: "Paused", showStats: false },
  "/seeding": { statusFilter: "Seeding", showStats: false },
}

function AppRoutes() {
  const location = useLocation()
  const currentListRoute = TORRENT_ROUTE_CONFIGS[location.pathname]
  const isDetailRoute = location.pathname === "/torrents/detail"
  const navigationState = location.state as { fromListPath?: string } | null
  const lastListPath = useRef("/")
  const detailListRoute = navigationState?.fromListPath
    ? TORRENT_ROUTE_CONFIGS[navigationState.fromListPath]
    : TORRENT_ROUTE_CONFIGS[lastListPath.current]
  const listScrollPosition = useRef(0)
  const wasDetailRoute = useRef(false)

  useEffect(() => {
    if (isDetailRoute) return
    lastListPath.current = location.pathname
    const saveScrollPosition = () => { listScrollPosition.current = window.scrollY }
    saveScrollPosition()
    window.addEventListener("scroll", saveScrollPosition, { passive: true })
    return () => window.removeEventListener("scroll", saveScrollPosition)
  }, [isDetailRoute])

  useLayoutEffect(() => {
    const wasDetail = wasDetailRoute.current
    wasDetailRoute.current = isDetailRoute
    if (isDetailRoute && !wasDetail) window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    if (!isDetailRoute && wasDetail) window.scrollTo({ top: listScrollPosition.current, left: 0, behavior: "auto" })
  }, [isDetailRoute])

  if (location.pathname === "/settings") return <SettingsPage key="settings" />

  const isTorrentRoute = Boolean(currentListRoute) || isDetailRoute
  if (!isTorrentRoute) return <TorrentView />

  const activeListRoute = currentListRoute ?? detailListRoute ?? TORRENT_ROUTE_CONFIGS["/"]
  return (
    <>
      <div className={isDetailRoute ? "hidden" : undefined} aria-hidden={isDetailRoute}>
        <TorrentView {...activeListRoute} isActive={!isDetailRoute} />
      </div>
      {isDetailRoute && <TorrentDetailsPage key={location.search} />}
    </>
  )
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthGate>
            <Layout>
              <AppRoutes />
            </Layout>
          </AuthGate>
        </I18nProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
