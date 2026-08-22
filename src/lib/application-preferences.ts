import type { ApplicationPreferences, ApplicationPreferenceValue } from "./rpc-types"

export type PreferenceCategory =
  | "behavior"
  | "downloads"
  | "speed"
  | "connection"
  | "bittorrent"
  | "webui"
  | "rss"
  | "advanced"

export const PREFERENCE_CATEGORY_ORDER: PreferenceCategory[] = [
  "behavior",
  "downloads",
  "connection",
  "speed",
  "bittorrent",
  "rss",
  "webui",
  "advanced",
]

// Follows qBittorrent 5.2's WebUI preferences dialog, including fieldset order.
const OFFICIAL_PREFERENCE_ORDER = [
  "locale", "status_bar_external_ip", "performance_warning", "confirm_torrent_deletion",
  "file_log_enabled", "file_log_path", "file_log_backup_enabled", "file_log_max_size",
  "file_log_delete_old", "file_log_age", "file_log_age_type", "delete_torrent_content_files",
  "torrent_content_layout", "add_to_top_of_queue", "add_stopped_enabled", "torrent_stop_condition",
  "merge_trackers", "auto_delete_mode", "preallocate_all", "incomplete_files_ext", "use_unwanted_folder",
  "auto_tmm_enabled", "torrent_changed_tmm_enabled", "save_path_changed_tmm_enabled",
  "category_changed_tmm_enabled", "save_path", "temp_path_enabled", "temp_path",
  "use_category_paths_in_manual_mode", "export_dir", "export_dir_fin", "scan_dirs",
  "excluded_file_names_enabled", "excluded_file_names", "mail_notification_enabled",
  "mail_notification_sender", "mail_notification_email", "mail_notification_smtp",
  "mail_notification_ssl_enabled", "mail_notification_auth_enabled", "mail_notification_username",
  "mail_notification_password", "autorun_on_torrent_added_enabled", "autorun_on_torrent_added_program",
  "autorun_enabled", "autorun_program",
  "listen_port", "ssl_enabled", "ssl_listen_port", "upnp", "max_connec", "max_connec_per_torrent",
  "max_uploads", "max_uploads_per_torrent", "i2p_enabled", "i2p_address", "i2p_port", "i2p_mixed_mode",
  "i2p_inbound_quantity", "i2p_outbound_quantity", "i2p_inbound_length", "i2p_outbound_length",
  "proxy_type", "proxy_ip", "proxy_port", "proxy_auth_enabled", "proxy_username", "proxy_password",
  "proxy_hostname_lookup", "proxy_bittorrent", "proxy_peer_connections", "proxy_rss", "proxy_misc",
  "ip_filter_enabled", "ip_filter_path", "ip_filter_trackers", "banned_IPs",
  "dl_limit", "up_limit", "alt_dl_limit", "alt_up_limit", "bittorrent_protocol", "limit_utp_rate",
  "limit_tcp_overhead", "limit_lan_peers", "scheduler_enabled", "schedule_from_hour",
  "schedule_from_min", "schedule_to_hour", "schedule_to_min", "scheduler_days",
  "dht", "pex", "lsd", "encryption", "anonymous_mode", "max_active_checking_torrents",
  "queueing_enabled", "max_active_downloads", "max_active_torrents", "max_active_uploads",
  "dont_count_slow_torrents", "slow_torrent_dl_rate_threshold", "slow_torrent_ul_rate_threshold",
  "slow_torrent_inactive_timer", "max_ratio_enabled", "max_ratio", "max_seeding_time_enabled",
  "max_seeding_time", "max_inactive_seeding_time_enabled", "max_inactive_seeding_time", "max_ratio_act",
  "add_trackers_enabled", "add_trackers", "add_trackers_from_url_enabled", "add_trackers_url",
  "rss_refresh_interval", "rss_fetch_delay", "rss_max_articles_per_feed", "rss_processing_enabled",
  "rss_auto_downloading_enabled", "rss_download_repack_proper_episodes", "rss_smart_episode_filters",
  "web_ui_domain_list", "web_ui_address", "web_ui_port", "web_ui_upnp", "use_https",
  "web_ui_https_cert_path", "web_ui_https_key_path", "web_ui_username", "web_ui_password",
  "bypass_local_auth", "bypass_auth_subnet_whitelist_enabled", "bypass_auth_subnet_whitelist",
  "web_ui_max_auth_fail_count", "web_ui_ban_duration", "web_ui_session_timeout",
  "alternative_webui_enabled", "alternative_webui_path", "web_ui_clickjacking_protection_enabled",
  "web_ui_csrf_protection_enabled", "web_ui_secure_cookie_enabled",
  "web_ui_host_header_validation_enabled", "web_ui_use_custom_http_headers_enabled",
  "web_ui_custom_http_headers", "web_ui_reverse_proxy_enabled", "web_ui_reverse_proxies_list",
  "dyndns_enabled", "dyndns_service", "dyndns_username", "dyndns_password", "dyndns_domain",
  "resume_data_storage_type", "torrent_content_remove_option", "memory_working_set_limit",
  "current_network_interface", "current_interface_address", "save_resume_data_interval",
  "save_statistics_interval", "torrent_file_size_limit", "confirm_torrent_recheck",
  "recheck_completed_torrents", "app_instance_name", "refresh_interval", "resolve_peer_host_names",
  "resolve_peer_countries", "reannounce_when_address_changed", "enable_embedded_tracker",
  "embedded_tracker_port", "embedded_tracker_port_forwarding", "mark_of_the_web", "ignore_ssl_errors",
  "python_executable_path", "bdecode_depth_limit", "bdecode_token_limit", "async_io_threads",
  "hashing_threads", "file_pool_size", "checking_memory_use", "disk_cache", "disk_cache_ttl",
  "disk_queue_size", "disk_io_type", "disk_io_read_mode", "disk_io_write_mode",
  "enable_coalesce_read_write", "enable_piece_extent_affinity", "enable_upload_suggestions",
  "socket_backlog_size", "socket_receive_buffer_size", "socket_send_buffer_size", "send_buffer_watermark",
  "send_buffer_low_watermark", "send_buffer_watermark_factor", "request_queue_size", "peer_tos",
  "peer_turnover", "peer_turnover_cutoff", "peer_turnover_interval", "connection_speed",
  "hostname_cache_ttl", "idn_support_enabled", "enable_multi_connections_from_same_ip",
  "enable_multi_connections_from_same_peer_id", "seeding_outgoing_connections", "utp_tcp_mixed_mode",
  "upload_choking_algorithm", "upload_slots_behavior", "stop_tracker_timeout",
] as const

const PREFERENCE_ORDER = new Map<string, number>(
  OFFICIAL_PREFERENCE_ORDER.map((key, index) => [key, index]),
)

const PREFERENCE_DEPENDENCIES: Record<string, readonly string[]> = {
  file_log_path: ["file_log_enabled"],
  file_log_backup_enabled: ["file_log_enabled"],
  file_log_max_size: ["file_log_enabled", "file_log_backup_enabled"],
  file_log_delete_old: ["file_log_enabled"],
  file_log_age: ["file_log_enabled", "file_log_delete_old"],
  file_log_age_type: ["file_log_enabled", "file_log_delete_old"],
  temp_path: ["temp_path_enabled"],
  excluded_file_names: ["excluded_file_names_enabled"],
  mail_notification_sender: ["mail_notification_enabled"],
  mail_notification_email: ["mail_notification_enabled"],
  mail_notification_smtp: ["mail_notification_enabled"],
  mail_notification_ssl_enabled: ["mail_notification_enabled"],
  mail_notification_auth_enabled: ["mail_notification_enabled"],
  mail_notification_username: ["mail_notification_enabled", "mail_notification_auth_enabled"],
  mail_notification_password: ["mail_notification_enabled", "mail_notification_auth_enabled"],
  autorun_on_torrent_added_program: ["autorun_on_torrent_added_enabled"],
  autorun_program: ["autorun_enabled"],
  ssl_listen_port: ["ssl_enabled"],
  i2p_address: ["i2p_enabled"],
  i2p_port: ["i2p_enabled"],
  i2p_mixed_mode: ["i2p_enabled"],
  i2p_inbound_quantity: ["i2p_enabled"],
  i2p_outbound_quantity: ["i2p_enabled"],
  i2p_inbound_length: ["i2p_enabled"],
  i2p_outbound_length: ["i2p_enabled"],
  proxy_username: ["proxy_auth_enabled"],
  proxy_password: ["proxy_auth_enabled"],
  ip_filter_path: ["ip_filter_enabled"],
  ip_filter_trackers: ["ip_filter_enabled"],
  schedule_from_hour: ["scheduler_enabled"],
  schedule_from_min: ["scheduler_enabled"],
  schedule_to_hour: ["scheduler_enabled"],
  schedule_to_min: ["scheduler_enabled"],
  scheduler_days: ["scheduler_enabled"],
  max_active_downloads: ["queueing_enabled"],
  max_active_torrents: ["queueing_enabled"],
  max_active_uploads: ["queueing_enabled"],
  slow_torrent_dl_rate_threshold: ["dont_count_slow_torrents"],
  slow_torrent_ul_rate_threshold: ["dont_count_slow_torrents"],
  slow_torrent_inactive_timer: ["dont_count_slow_torrents"],
  max_ratio: ["max_ratio_enabled"],
  max_seeding_time: ["max_seeding_time_enabled"],
  max_inactive_seeding_time: ["max_inactive_seeding_time_enabled"],
  add_trackers: ["add_trackers_enabled"],
  add_trackers_url: ["add_trackers_from_url_enabled"],
  rss_auto_downloading_enabled: ["rss_processing_enabled"],
  rss_download_repack_proper_episodes: ["rss_processing_enabled"],
  rss_smart_episode_filters: ["rss_processing_enabled"],
  web_ui_https_cert_path: ["use_https"],
  web_ui_https_key_path: ["use_https"],
  bypass_auth_subnet_whitelist: ["bypass_auth_subnet_whitelist_enabled"],
  alternative_webui_path: ["alternative_webui_enabled"],
  web_ui_custom_http_headers: ["web_ui_use_custom_http_headers_enabled"],
  web_ui_reverse_proxies_list: ["web_ui_reverse_proxy_enabled"],
  dyndns_service: ["dyndns_enabled"],
  dyndns_username: ["dyndns_enabled"],
  dyndns_password: ["dyndns_enabled"],
  dyndns_domain: ["dyndns_enabled"],
  embedded_tracker_port: ["enable_embedded_tracker"],
  embedded_tracker_port_forwarding: ["enable_embedded_tracker"],
}

export function getPreferenceCategory(key: string): PreferenceCategory {
  if (/^(locale|confirm_torrent_deletion|delete_torrent_content_files|performance_warning|status_bar_external_ip|file_log_)/.test(key)) return "behavior"
  if (/^(save_path|temp_path|scan_dirs|export_dir|create_subfolder|preallocate|incomplete_files|auto_tmm|torrent_changed|save_path_changed|category_changed|use_category_paths|torrent_content_layout|torrent_stop_condition|torrent_files_|add_stopped|add_to_top|auto_delete|use_unwanted|excluded_file|merge_trackers|remove_torrent_file_backup|mail_notification|autorun_)/.test(key)) return "downloads"
  if (/^(dl_limit|up_limit|alt_dl|alt_up|scheduler|schedule_|limit_utp|limit_tcp|limit_lan|bittorrent_protocol)/.test(key)) return "speed"
  if (/^(listen_port|ssl_enabled|ssl_listen_port|upnp|random_port|max_connec|max_uploads|proxy_|ip_filter|banned_IPs|i2p_)/.test(key)) return "connection"
  if (/^(dht|pex|lsd|encryption|anonymous_mode|queueing|max_active|dont_count_slow|slow_torrent|max_ratio|max_seeding|max_inactive_seeding|share_limits_mode|seed_choking|add_trackers|announce_|stop_tracker|validate_https_tracker_certificate|ssrf_mitigation|block_peers_on_privileged_ports)/.test(key)) return "bittorrent"
  if (/^rss_/.test(key)) return "rss"
  if (/^(web_ui|alternative_webui|bypass_|use_https|dyndns)/.test(key)) return "webui"
  return "advanced"
}

export function comparePreferenceKeys(left: string, right: string): number {
  const leftOrder = PREFERENCE_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER
  const rightOrder = PREFERENCE_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER
  return leftOrder - rightOrder || left.localeCompare(right)
}

export function getPreferenceDependencyKeys(key: string): readonly string[] {
  return PREFERENCE_DEPENDENCIES[key] ?? []
}

export function isPreferenceApplicable(key: string, preferences: ApplicationPreferences): boolean {
  return getPreferenceDependencyKeys(key).every((dependency) => preferences[dependency] === true)
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
