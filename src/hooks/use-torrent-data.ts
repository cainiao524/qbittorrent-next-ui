"use client"
import { startTransition, useState, useCallback, useEffect, useRef } from "react"
import { useRefreshScheduler } from "./use-refresh-scheduler"
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
      setStats(current => JSON.stringify(current) === JSON.stringify(snapshot.stats) ? current : snapshot.stats)
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
      if (snapshot && enabled && !document.hidden) commitSnapshot(snapshot)
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
      pendingSnapshotRef.current = null
      isScrollingRef.current = false
    }
  }, [commitSnapshot, enabled])

  const metadata = useRef<{ session: Awaited<ReturnType<typeof rpc.getSession>> | null; free: FreeSpace; at: number }>({ session: null, free: null, at: 0 })
  const load = useCallback(async (signal: AbortSignal) => {
    const client = rpc.withSignal?.(signal) ?? rpc
    try {
      const torrentFields = getRequiredRpcFields(visibleColumns, viewMode)
      const torrentsData = await client.getTorrents(torrentFields)
      const statsData = await client.getStats(torrentsData.torrents)
      if (signal.aborted) return
      const freeData = metadata.current.free
      const snapshot = { torrents: torrentsData.torrents, stats: statsData, freeSpace: freeData }
      if (isScrollingRef.current && hasLoadedRef.current) pendingSnapshotRef.current = snapshot
      else commitSnapshot(snapshot)
    } catch (err) {
      if (!signal.aborted) setIsInitialLoading(false)
      throw err
    }
  }, [commitSnapshot, viewMode, visibleColumns])

  const refreshCore = useRefreshScheduler(load, refreshInterval, autoRefresh, enabled)
  const loadMetadata = useCallback(async (signal: AbortSignal, manual: boolean) => {
    const client = rpc.withSignal?.(signal) ?? rpc
    const session = manual || !metadata.current.session ? await client.getSession() : metadata.current.session
    const free = session["download-dir"] ? await client.freeSpace(session["download-dir"]) : null
    if (signal.aborted) return
    metadata.current = { session, free, at: Date.now() }
    setFreeSpace(current => JSON.stringify(current) === JSON.stringify(free) ? current : free)
  }, [])
  const refreshMetadata = useRefreshScheduler(loadMetadata, Math.max(30000, refreshInterval * 10), autoRefresh, enabled)
  const fetchData = useCallback(async () => { await Promise.all([refreshCore(), refreshMetadata()]) }, [refreshCore, refreshMetadata])

  return { torrents, stats, freeSpace, isInitialLoading, fetchData }
}
