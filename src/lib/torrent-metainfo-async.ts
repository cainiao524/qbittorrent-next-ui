import type { TorrentMetainfo } from "./torrent-metainfo"

export function parseTorrentMetainfoAsync(data: ArrayBuffer): Promise<TorrentMetainfo> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/torrent-metainfo.worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event: MessageEvent<{ ok: boolean; result?: TorrentMetainfo; error?: string }>) => {
      worker.terminate()
      if (event.data.ok && event.data.result) resolve(event.data.result)
      else reject(new Error(event.data.error ?? "Invalid torrent metadata"))
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || "Unable to parse torrent metadata"))
    }
    worker.postMessage(data, [data])
  })
}
