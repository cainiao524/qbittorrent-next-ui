import { HashRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout"
import { TorrentView } from "@/components/torrents/torrent-view"
import TorrentDetailsPage from "@/app/torrents/detail/page"
import SettingsPage from "@/app/settings/page"
import { AuthGate } from "@/components/auth-gate"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TorrentView />} />
      <Route path="/active" element={<TorrentView statusFilter="active" showStats={false} />} />
      <Route path="/downloading" element={<TorrentView statusFilter="downloading" showStats={false} />} />
      <Route path="/paused" element={<TorrentView statusFilter="Paused" showStats={false} />} />
      <Route path="/seeding" element={<TorrentView statusFilter="Seeding" showStats={false} />} />
      <Route path="/settings" element={<SettingsPage key="settings" />} />
      <Route path="/torrents/detail" element={<TorrentDetailsPage key="detail" />} />
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <AuthGate>
        <Layout>
          <AppRoutes />
        </Layout>
      </AuthGate>
    </HashRouter>
  )
}

export default App
