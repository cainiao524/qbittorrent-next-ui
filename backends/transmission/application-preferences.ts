import type { ApplicationPreferences, ApplicationPreferenceValue } from "@/lib/rpc-types"

export type PreferenceCategory =
  | "torrents"
  | "speed"
  | "peers"
  | "network"
  | "automation"
  | "advanced"
  | "information"

export const PREFERENCE_CATEGORY_ORDER: PreferenceCategory[] = [
  "torrents",
  "speed",
  "peers",
  "network",
  "automation",
  "advanced",
  "information",
]

// Follows Transmission 4.1's official Web preferences, then its RPC-only fields.
const OFFICIAL_PREFERENCE_ORDER = [
  "download-dir", "incomplete-dir-enabled", "incomplete-dir", "start-added-torrents",
  "rename-partial-files", "download-queue-enabled", "download-queue-size", "seed-ratio-limited",
  "seed-ratio-limit", "idle-seeding-limit-enabled", "idle-seeding-limit", "seed-queue-enabled",
  "seed-queue-size", "queue-stalled-enabled", "queue-stalled-minutes", "trash-original-torrent-files",
  "sequential-download",
  "speed-limit-up-enabled", "speed-limit-up", "speed-limit-down-enabled", "speed-limit-down",
  "alt-speed-enabled", "alt-speed-up", "alt-speed-down", "alt-speed-time-enabled",
  "alt-speed-time-begin", "alt-speed-time-end", "alt-speed-time-day",
  "peer-limit-per-torrent", "peer-limit-global", "encryption", "pex-enabled", "dht-enabled",
  "lpd-enabled", "blocklist-enabled", "blocklist-url", "blocklist-size", "peer-congestion-algorithm",
  "peer-id-ttl-hours", "peer-socket-tos", "reqq",
  "peer-port", "peer-port-random-on-start", "port-forwarding-enabled", "preferred-transports",
  "utp-enabled", "tcp-enabled", "default-trackers",
  "script-torrent-added-enabled", "script-torrent-added-filename", "script-torrent-done-enabled",
  "script-torrent-done-filename", "script-torrent-done-seeding-enabled",
  "script-torrent-done-seeding-filename",
  "cache-size-mib", "cache-size-mb", "anti-brute-force-enabled",
  "config-dir", "download-dir-free-space", "rpc-version-semver", "rpc-version", "rpc-version-minimum",
  "session-id", "units", "version",
] as const

const PREFERENCE_ORDER = new Map<string, number>(
  OFFICIAL_PREFERENCE_ORDER.map((key, index) => [key, index]),
)

const READ_ONLY_PREFERENCES = new Set([
  "blocklist-size",
  "config-dir",
  "download-dir-free-space",
  "rpc-version-minimum",
  "rpc-version-semver",
  "rpc-version",
  "session-id",
  "tcp-enabled",
  "units",
  "version",
])

const PREFERENCE_DEPENDENCIES: Record<string, readonly string[]> = {
  "incomplete-dir": ["incomplete-dir-enabled"],
  "download-queue-size": ["download-queue-enabled"],
  "seed-ratio-limit": ["seed-ratio-limited"],
  "idle-seeding-limit": ["idle-seeding-limit-enabled"],
  "seed-queue-size": ["seed-queue-enabled"],
  "queue-stalled-minutes": ["queue-stalled-enabled"],
  "speed-limit-up": ["speed-limit-up-enabled"],
  "speed-limit-down": ["speed-limit-down-enabled"],
  "alt-speed-time-begin": ["alt-speed-time-enabled"],
  "alt-speed-time-end": ["alt-speed-time-enabled"],
  "alt-speed-time-day": ["alt-speed-time-enabled"],
  "blocklist-url": ["blocklist-enabled"],
  "script-torrent-added-filename": ["script-torrent-added-enabled"],
  "script-torrent-done-filename": ["script-torrent-done-enabled"],
  "script-torrent-done-seeding-filename": ["script-torrent-done-seeding-enabled"],
}

function canonicalPreferenceKey(key: string): string {
  return key.replaceAll("_", "-")
}

export function getPreferenceCategory(key: string): PreferenceCategory {
  const canonicalKey = canonicalPreferenceKey(key)
  if (/^(download-dir|incomplete-dir|start-added-torrents|trash-original-torrent-files|rename-partial-files|download-queue|seed-queue|seed-ratio|idle-seeding|queue-stalled|sequential-download)/.test(canonicalKey)) return "torrents"
  if (/^(speed-limit-|alt-speed-)/.test(canonicalKey)) return "speed"
  if (/^(peer-limit|peer-congestion|peer-id|peer-socket|encryption|blocklist-|dht-enabled|pex-enabled|lpd-enabled|reqq)/.test(canonicalKey)) return "peers"
  if (/^(peer-port|port-forwarding-enabled|preferred-transports|utp-enabled|tcp-enabled|default-trackers)/.test(canonicalKey)) return "network"
  if (/^script-torrent-/.test(canonicalKey)) return "automation"
  if (READ_ONLY_PREFERENCES.has(canonicalKey)) return "information"
  return "advanced"
}

export function comparePreferenceKeys(left: string, right: string): number {
  const leftKey = canonicalPreferenceKey(left)
  const rightKey = canonicalPreferenceKey(right)
  const leftOrder = PREFERENCE_ORDER.get(leftKey) ?? Number.MAX_SAFE_INTEGER
  const rightOrder = PREFERENCE_ORDER.get(rightKey) ?? Number.MAX_SAFE_INTEGER
  return leftOrder - rightOrder || leftKey.localeCompare(rightKey)
}

export function isWritablePreference(key: string): boolean {
  return !READ_ONLY_PREFERENCES.has(canonicalPreferenceKey(key))
}

export function getPreferenceDependencyKeys(key: string): readonly string[] {
  return PREFERENCE_DEPENDENCIES[canonicalPreferenceKey(key)] ?? []
}

export function isPreferenceDependencyMet(
  dependency: string,
  preferences: ApplicationPreferences,
): boolean {
  const canonicalKey = canonicalPreferenceKey(dependency)
  return preferences[canonicalKey] === true
    || preferences[canonicalKey.replaceAll("-", "_")] === true
}

export function isPreferenceApplicable(key: string, preferences: ApplicationPreferences): boolean {
  return getPreferenceDependencyKeys(key).every((dependency) => (
    isPreferenceDependencyMet(dependency, preferences)
  ))
}

export function isSensitivePreference(key: string): boolean {
  return /(password|token|secret|blocklist-url)/i.test(key)
}

export function isConnectionCriticalPreference(key: string): boolean {
  return /^(peer-port|port-forwarding-enabled|encryption|dht-enabled|pex-enabled|lpd-enabled|utp-enabled)/
    .test(canonicalPreferenceKey(key))
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
    Object.entries(draft).filter(([key, value]) => (
      isWritablePreference(key) && serialize(value) !== serialize(original[key])
    )),
  )
}
