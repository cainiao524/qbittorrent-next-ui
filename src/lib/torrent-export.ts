import { downloadBlob } from "./download"
import { rpc } from "./rpc-client"
import type { TorrentId } from "./rpc-types"

export function torrentExportFilename(name: string, fallback: string) {
  const safe = name.replace(/[\\/:*?"<>|]+/g, "_").trim()
  return `${safe || fallback}.torrent`
}

export async function exportTorrentFile(id: TorrentId, name: string) {
  const result = await rpc.exportTorrent(id)
  downloadBlob(result.blob, torrentExportFilename(name, id))
}
