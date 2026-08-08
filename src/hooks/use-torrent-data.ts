"use client"
import { useState, useCallback, useEffect } from "react"
import { rpc } from "@/lib/rpc-client"
import { useAppSettings } from "@/lib/app-settings-context"
import { getRequiredRpcFields } from "@/lib/columns"
import { reuseTorrentReferences } from "@/lib/torrent-reference"
import type { Torrent, SessionStats } from "@/lib/rpc-types"

export function useTorrentData(
  viewMode: "list" | "grid",
  visibleColumns: string[]
) {
  const [torrents, setTorrents] = useState<Torrent[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [freeSpace, setFreeSpace] = useState<{ path: string; "size-bytes": number; total_size: number } | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { refreshInterval, autoRefresh } = useAppSettings()

  const fetchData = useCallback(async () => {
    try {
      const torrentFields = getRequiredRpcFields(visibleColumns, viewMode)
      const [torrentsData, statsData, sessionData] = await Promise.all([
        rpc.getTorrents(torrentFields),
        rpc.getStats(),
        rpc.getSession()
      ])

      setTorrents((current) => reuseTorrentReferences(current, torrentsData.torrents))

      let freeData = null

      if (sessionData["download-dir"]) {
        try {
          freeData = await rpc.freeSpace(sessionData["download-dir"])
        } catch (e) {
          console.error("Failed to fetch free space:", e)
        }
      }

      setStats(statsData)
      setFreeSpace(freeData)
      setIsInitialLoading(false)
    } catch (err) {
      console.error("Failed to fetch qBittorrent data:", err)
      setIsInitialLoading(false)
    }
  }, [viewMode, visibleColumns])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    if (!autoRefresh) return

    const timer = setInterval(fetchData, refreshInterval)
    return () => clearInterval(timer)
  }, [fetchData, refreshInterval, autoRefresh])

  return { torrents, stats, freeSpace, isInitialLoading, fetchData }
}
