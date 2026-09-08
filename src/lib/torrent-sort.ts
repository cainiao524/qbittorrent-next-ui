export interface TorrentSortEntry { id: string; value: number | string }

export function sortTorrentEntries<T extends TorrentSortEntry>(entries: T[], direction: "asc" | "desc"): T[] {
  return [...entries].sort((a, b) => {
    if (a.value < b.value) return direction === "asc" ? -1 : 1
    if (a.value > b.value) return direction === "asc" ? 1 : -1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}
