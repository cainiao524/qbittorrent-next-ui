import type { BackendConfig } from "@/lib/backend-config"

export const APP_CONFIG = {
  version: "v1.20.1-funky⑨",
  githubUrl: "https://github.com/cainiao524/qbittorrent-next-ui",
  name: "qBittorrent Next",
  backendName: "qBittorrent",
  storageKeys: {
    locale: "qbittorrent-next-locale",
  },
  events: {
    addTorrent: "qbittorrent:add-torrent",
    authLogout: "qbittorrent-auth-logout",
  },
  settingsBackup: {
    format: "qbittorrent-next-ui-settings",
    key: "qbittorrent",
  },
  capabilities: {
    autoManagement: true,
    piecePriorityToggles: true,
    superSeeding: true,
    separateDownloadPath: true,
    categories: true,
    advancedAddOptions: true,
  },
} satisfies BackendConfig
