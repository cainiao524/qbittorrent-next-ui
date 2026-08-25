import { parseTorrentMetainfo } from "../lib/torrent-metainfo"

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const result = parseTorrentMetainfo(new Uint8Array(event.data))
    self.postMessage({ ok: true, result })
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : "Invalid torrent metadata" })
  }
}
