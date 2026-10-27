import * as React from "react"
import type { SessionStats } from "@/lib/rpc-types"

export interface SpeedPoint { time: number; download: number; upload: number }

const STORAGE_KEY = "speed_history"
const MAX_POINTS = 60

/** Keeps the last 60 speed samples for the session (survives route changes via sessionStorage). */
export function useSpeedHistory(stats: SessionStats | null) {
  const [history, setHistory] = React.useState<SpeedPoint[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as SpeedPoint[] } catch { return [] }
  })
  const downloadSpeed = stats?.downloadSpeed
  const uploadSpeed = stats?.uploadSpeed

  React.useEffect(() => {
    if (downloadSpeed === undefined || uploadSpeed === undefined) return
    const point = { time: Date.now(), download: downloadSpeed, upload: uploadSpeed }
    setHistory((current) => {
      const next = [...current, point].slice(-MAX_POINTS)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [downloadSpeed, uploadSpeed])

  return history
}
