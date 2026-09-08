import { sortTorrentEntries, type TorrentSortRequest, type TorrentSortResponse } from "../lib/torrent-sort"

self.onmessage = (event: MessageEvent<TorrentSortRequest>) => {
  self.postMessage({
    requestId: event.data.requestId,
    ids: sortTorrentEntries(event.data.entries, event.data.direction).map(entry => entry.id),
  } satisfies TorrentSortResponse)
}
