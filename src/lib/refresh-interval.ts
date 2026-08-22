export const MIN_REFRESH_INTERVAL = 500

export function normalizeRefreshInterval(value: number, fallback = 3000) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(MIN_REFRESH_INTERVAL, Math.round(value))
}
