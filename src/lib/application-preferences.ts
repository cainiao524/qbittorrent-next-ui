import type { ApplicationPreferences, ApplicationPreferenceValue } from "./rpc-types"

export type PreferenceCategory =
  | "behavior"
  | "downloads"
  | "speed"
  | "connection"
  | "queue"
  | "bittorrent"
  | "webui"
  | "rss"
  | "automation"
  | "logging"
  | "advanced"

export const PREFERENCE_CATEGORY_ORDER: PreferenceCategory[] = [
  "behavior",
  "downloads",
  "connection",
  "speed",
  "bittorrent",
  "queue",
  "webui",
  "rss",
  "automation",
  "logging",
  "advanced",
]

export function getPreferenceCategory(key: string): PreferenceCategory {
  if (/^(locale|app_instance_name|confirm_torrent_|delete_torrent_content_files|performance_warning|refresh_interval|resolve_peer_(countries|host_names)|status_bar_external_ip)$/.test(key)) return "behavior"
  if (/^(save_path|temp_path|scan_dirs|export_dir|create_subfolder|preallocate|incomplete_files|auto_tmm|torrent_changed|save_path_changed|category_changed|use_category_paths|torrent_content_|torrent_file_size_limit|torrent_files_|add_stopped|add_to_top|auto_delete|use_unwanted|excluded_file|merge_trackers|mark_of_the_web|remove_torrent_file_backup)/.test(key)) return "downloads"
  if (/^(dl_limit|up_limit|alt_dl|alt_up|scheduler|schedule_|limit_utp|limit_tcp|limit_lan|bittorrent_protocol)/.test(key)) return "speed"
  if (/^(listen_port|ssl_listen_port|upnp|random_port|max_connec|max_uploads|proxy_|outgoing_ports|current_(network_interface|interface_)|i2p_|seeding_outgoing_connections|socket_(receive|send)_buffer_size|peer_tos|reannounce_when_address_changed)/.test(key)) return "connection"
  if (/^(queueing|max_active|dont_count_slow|slow_torrent|max_ratio|max_seeding|max_inactive_seeding|share_limits_mode|seed_choking)/.test(key)) return "queue"
  if (/^(dht|pex|lsd|encryption|anonymous_mode|add_trackers|announce_|ip_filter|banned_IPs|stop_tracker|enable_embedded_tracker|embedded_tracker|validate_https_tracker_certificate|ssrf_mitigation|block_peers_on_privileged_ports)/.test(key)) return "bittorrent"
  if (/^(web_ui|alternative_webui|bypass_|use_https|ssl_|dyndns)/.test(key)) return "webui"
  if (/^rss_/.test(key)) return "rss"
  if (/^(mail_notification|autorun_)/.test(key)) return "automation"
  if (/^file_log_/.test(key)) return "logging"
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
