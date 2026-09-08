import { sortTorrentEntries, type TorrentSortEntry } from "../lib/torrent-sort"

self.onmessage = (event: MessageEvent<{ entries: TorrentSortEntry[]; direction: "asc" | "desc" }>) => {
  self.postMessage(sortTorrentEntries(event.data.entries, event.data.direction).map(entry => entry.id))
}
