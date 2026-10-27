/**
 * Contract every backend's `@backend/config` must satisfy. Values that end up in
 * localStorage, exported files or DOM events stay per-backend so existing users
 * keep their saved locale and settings backups.
 */
export interface BackendConfig {
  version: string
  githubUrl: string
  name: string
  backendName: string
  storageKeys: {
    locale: string
  }
  events: {
    addTorrent: string
    authLogout: string
  }
  settingsBackup: {
    format: string
    key: string
  }
  /** Features the shared UI only offers when the backend actually supports them. */
  capabilities: BackendCapabilities
}

export interface BackendCapabilities {
  /** Automatic torrent management (qBittorrent autoTMM). */
  autoManagement: boolean
  /** Sequential download and first/last piece priority toggles. */
  piecePriorityToggles: boolean
  superSeeding: boolean
  /** A separate path for incomplete downloads, per torrent. */
  separateDownloadPath: boolean
  categories: boolean
  /** Add-torrent options: skip hash check, content layout, rename, seeding time, share action, stop condition, SSL. */
  advancedAddOptions: boolean
}
