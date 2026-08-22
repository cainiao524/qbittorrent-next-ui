"use client"
import { startTransition, useState, useCallback, useEffect, useRef } from "react"
import { rpc } from "@/lib/rpc-client"
import { useAppSettings } from "@/lib/app-settings-context"
import { getRequiredRpcFields } from "@/lib/columns"
import { reuseTorrentReferences } from "@/lib/torrent-reference"
import type { Torrent, SessionStats } from "@/lib/rpc-types"

type FreeSpace = { path: string; "size-bytes": number; total_size: number } | null

interface TorrentDataSnapshot {
  torrents: Torrent[]
  stats: SessionStats
  freeSpace: FreeSpace
}

export function useTorrentData(
  viewMode: "list" | "grid",
  visibleColumns: string[],
  enabled = true
) {
  const [torrents, setTorrents] = useState<Torrent[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [freeSpace, setFreeSpace] = useState<FreeSpace>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { refreshInterval, autoRefresh } = useAppSettings()
  const hasLoadedRef = useRef(false)
  const isScrollingRef = useRef(false)
  const pendingSnapshotRef = useRef<TorrentDataSnapshot | null>(null)

  const commitSnapshot = useCallback((snapshot: TorrentDataSnapshot) => {
    const commit = () => {
      setTorrents((current) => reuseTorrentReferences(current, snapshot.torrents))
      setStats(snapshot.stats)
      setFreeSpace(snapshot.freeSpace)
      setIsInitialLoading(false)
    }

    if (hasLoadedRef.current) startTransition(commit)
    else commit()
    hasLoadedRef.current = true
  }, [])

  useEffect(() => {
    let scrollEndTimer: ReturnType<typeof setTimeout> | undefined

    const flushPendingSnapshot = () => {
      isScrollingRef.current = false
      const snapshot = pendingSnapshotRef.current
      pendingSnapshotRef.current = null
      if (snapshot) commitSnapshot(snapshot)
    }

    const handleScroll = () => {
      isScrollingRef.current = true
      if (scrollEndTimer) clearTimeout(scrollEndTimer)
      scrollEndTimer = setTimeout(flushPendingSnapshot, 120)
    }

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true })
      if (scrollEndTimer) clearTimeout(scrollEndTimer)
    }
  }, [commitSnapshot])

  const fetchData = useCallback(async () => {
    try {
      const torrentFields = getRequiredRpcFields(visibleColumns, viewMode)
      const [torrentsData, statsData, sessionData] = await Promise.all([
        rpc.getTorrents(torrentFields),
        rpc.getStats(),
        rpc.getSession()
      ])

      let freeData: FreeSpace = null

      if (sessionData["download-dir"]) {
        try {
          freeData = await rpc.freeSpace(sessionData["download-dir"])
        } catch (e) {
          console.error("Failed to fetch free space:", e)
        }
      }

      const snapshot = { torrents: torrentsData.torrents, stats: statsData, freeSpace: freeData }
      if (isScrollingRef.current && hasLoadedRef.current) pendingSnapshotRef.current = snapshot
      else commitSnapshot(snapshot)
    } catch (err) {
      console.error("Failed to fetch qBittorrent data:", err)
      setIsInitialLoading(false)
    }
  }, [commitSnapshot, viewMode, visibleColumns])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      await fetchData()
      if (!cancelled && autoRefresh) {
        timer = setTimeout(poll, refreshInterval)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [fetchData, refreshInterval, autoRefresh, enabled])

  return { torrents, stats, freeSpace, isInitialLoading, fetchData }
}
