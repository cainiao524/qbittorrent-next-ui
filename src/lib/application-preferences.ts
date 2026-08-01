import type { ApplicationPreferences, ApplicationPreferenceValue } from "./rpc-types"

export type PreferenceCategory =
  | "downloads"
  | "speed"
  | "connection"
  | "queue"
  | "bittorrent"
  | "webui"
  | "rss"
  | "automation"
  | "advanced"

export const PREFERENCE_CATEGORY_ORDER: PreferenceCategory[] = [
  "downloads",
  "speed",
  "connection",
  "queue",
  "bittorrent",
  "webui",
  "rss",
  "automation",
  "advanced",
]

export function getPreferenceCategory(key: string): PreferenceCategory {
  if (/^(save_path|temp_path|scan_dirs|export_dir|create_subfolder|preallocate|incomplete_files|auto_tmm|torrent_changed|save_path_changed|category_changed)/.test(key)) return "downloads"
  if (/^(dl_limit|up_limit|alt_dl|alt_up|scheduler|schedule_|limit_utp|limit_tcp|limit_lan)/.test(key)) return "speed"
  if (/^(listen_port|upnp|random_port|max_connec|max_uploads|proxy_|ip_filter|announce_|bittorrent_protocol|network_)/.test(key)) return "connection"
  if (/^(queueing|max_active|dont_count_slow|slow_torrent|max_ratio|max_seeding|seed_choking)/.test(key)) return "queue"
  if (/^(dht|pex|lsd|encryption|anonymous_mode|add_trackers|banned_IPs|stop_tracker|enable_piece)/.test(key)) return "bittorrent"
  if (/^(web_ui|alternative_webui|bypass_|use_https|ssl_|dyndns)/.test(key)) return "webui"
  if (/^rss_/.test(key)) return "rss"
  if (/^(mail_notification|autorun_)/.test(key)) return "automation"
  return "advanced"
}

export function isSensitivePreference(key: string): boolean {
  return /(password|token|secret|cookie|ssl_key)/i.test(key)
}

export function isConnectionCriticalPreference(key: string): boolean {
  return /^(web_ui_|alternative_webui_|use_https|ssl_|bypass_|proxy_)/.test(key)
}

export function isStructuredPreference(value: ApplicationPreferenceValue): boolean {
  return value !== null && typeof value === "object"
}

export function getPreferenceValueType(value: ApplicationPreferenceValue): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

function serialize(value: ApplicationPreferenceValue | undefined): string {
  return JSON.stringify(value)
}

export function getPreferenceChanges(
  original: ApplicationPreferences,
  draft: ApplicationPreferences,
): Partial<ApplicationPreferences> {
  return Object.fromEntries(
    Object.entries(draft).filter(([key, value]) => serialize(value) !== serialize(original[key])),
  )
}
