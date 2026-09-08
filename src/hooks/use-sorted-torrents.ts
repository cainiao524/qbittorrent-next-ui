import { useEffect, useMemo, useRef, useState } from "react"
import { getTorrentSortValue, sortTorrents, type SortConfig } from "@/lib/torrent-list-utils"
import type { TorrentSortResponse } from "@/lib/torrent-sort"
import type { Torrent } from "@/lib/rpc-types"

type SortJob = { requestId: number; torrents: Torrent[]; config: SortConfig }

// 复用线程，繁忙时只保留最新待排快照；不堆积刷新任务，始终排序全量输入。
export function useSortedTorrents(torrents: Torrent[], config: SortConfig | null) {
  const [result, setResult] = useState<Torrent[]>([])
  const workerRef = useRef<Worker | null>(null)
  const sequence = useRef(0)
  const latest = useRef<SortJob | null>(null)
  const queued = useRef<SortJob | null>(null)
  const running = useRef<SortJob | null>(null)
  const asynchronous = torrents.length >= 2000 && config !== null && typeof Worker !== "undefined"
  const immediate = useMemo(() => asynchronous ? null : sortTorrents(torrents, config), [asynchronous, torrents, config])

  useEffect(() => {
    const requestId = ++sequence.current
    if (!asynchronous || !config) {
      workerRef.current?.terminate()
      workerRef.current = null
      latest.current = queued.current = running.current = null
      return
    }
    const job = { requestId, torrents, config }
    latest.current = queued.current = job

    const fallback = () => {
      const current = latest.current
      workerRef.current?.terminate()
      workerRef.current = null
      queued.current = running.current = null
      if (current) setResult(sortTorrents(current.torrents, current.config))
    }
    const dispatch = () => {
      const current = queued.current
      if (!current || running.current || !workerRef.current) return
      queued.current = null
      running.current = current
      try {
        workerRef.current.postMessage({
          requestId: current.requestId,
          direction: current.config.direction,
          entries: current.torrents.map(torrent => ({ id: torrent.id, value: getTorrentSortValue(torrent, current.config.key) })),
        })
      } catch {
        fallback()
      }
    }
    if (!workerRef.current) {
      try {
        const worker = new Worker(new URL("../workers/torrent-sort.worker.ts", import.meta.url), { type: "module" })
        workerRef.current = worker
        worker.onmessage = (event: MessageEvent<TorrentSortResponse>) => {
          if (workerRef.current !== worker) return
          const completed = running.current
          if (!completed || event.data.requestId !== completed.requestId) return
          running.current = null
          if (completed.requestId === sequence.current) {
            const byId = new Map(completed.torrents.map(torrent => [torrent.id, torrent]))
            setResult(event.data.ids.map(id => byId.get(id)!))
          }
          dispatch()
        }
        worker.onerror = () => { if (workerRef.current === worker) fallback() }
      } catch {
        fallback()
      }
    }
    dispatch()
  }, [asynchronous, torrents, config])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
    latest.current = queued.current = running.current = null
  }, [])

  return immediate ?? result
}
