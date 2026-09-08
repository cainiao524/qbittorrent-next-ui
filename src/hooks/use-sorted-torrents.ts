import { useEffect, useMemo, useState } from "react"
import { getTorrentSortValue, sortTorrents, type SortConfig } from "@/lib/torrent-list-utils"
import type { Torrent } from "@/lib/rpc-types"

// 大列表只向后台线程发送排序键，完整对象留在主线程。
export function useSortedTorrents(torrents: Torrent[], config: SortConfig | null) {
  const [result, setResult] = useState<Torrent[]>([])
  const asynchronous = torrents.length >= 2000 && config !== null && typeof Worker !== "undefined"
  const immediate = useMemo(() => asynchronous ? null : sortTorrents(torrents, config), [asynchronous, torrents, config])

  useEffect(() => {
    if (!asynchronous || !config) return
    let cancelled = false
    let worker: Worker | undefined
    const fallback = () => {
      if (!cancelled) setResult(sortTorrents(torrents, config))
      worker?.terminate()
    }
    try {
      worker = new Worker(new URL("../workers/torrent-sort.worker.ts", import.meta.url), { type: "module" })
      worker.onmessage = (event: MessageEvent<string[]>) => {
        if (cancelled) return
        const byId = new Map(torrents.map(torrent => [torrent.id, torrent]))
        setResult(event.data.map(id => byId.get(id)!))
        worker?.terminate()
      }
      worker.onerror = fallback
      worker.postMessage({
        direction: config.direction,
        entries: torrents.map(torrent => ({ id: torrent.id, value: getTorrentSortValue(torrent, config.key) })),
      })
    } catch {
      fallback()
    }
    return () => { cancelled = true; worker?.terminate() }
  }, [asynchronous, torrents, config])

  return immediate ?? result
}
