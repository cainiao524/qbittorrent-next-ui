import type { BackendConfig } from "@/lib/backend-config"

export const APP_CONFIG = {
  version: "v1.20.2-baka⑨",
  githubUrl: "https://github.com/cainiao524/transmission-next-vibemod",
  name: "Transmission VibeMod",
  backendName: "Transmission",
  storageKeys: {
    locale: "transmission-vibemod-locale",
  },
  events: {
    addTorrent: "transmission:add-torrent",
    authLogout: "transmission-auth-logout",
  },
  settingsBackup: {
    format: "transmission-next-vibemod-settings",
    key: "transmission",
  },
  // Transmission RPC has no equivalent for these; the real client rejects or ignores them.
  capabilities: {
    autoManagement: false,
    piecePriorityToggles: false,
    superSeeding: false,
    separateDownloadPath: false,
    categories: false,
    advancedAddOptions: false,
  },
} satisfies BackendConfig
