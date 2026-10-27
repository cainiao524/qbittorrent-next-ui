import { getStatusLabel } from "./formatters.ts"
import { sortTorrentEntries } from "./torrent-sort"
import type { Torrent } from "./rpc-types.ts"
import { getTorrentLabelsSortValue, parseTorrentLabel } from "./torrent-labels.ts"

export type SortKey =
  | "name"
  | "status"
  | "percentDone"
  | "size"
  | "totalSize"
  | "addedDate"
  | "editDate"
  | "uploadedEver"
  | "rateDownload"
  | "rateUpload"
  | "eta"
  | "uploadRatio"
  | "labels"
  | "seeds"
  | "peers"
  | "category"
  | "dateCreated"
  | "timeElapsed"
  | "lastSeenComplete"
  | "availability"
  | "tracker"
  | "downloadedEver"
  | "amountLeft"
  | "doneDate"
  | "downloadLimit"
  | "uploadLimit"
  | "downloadDir"

export type SortConfig = { key: SortKey; direction: "asc" | "desc" }

export interface TorrentFilterOptions {
  statusFilter?: string
  searchQuery?: string
  trackerFilter?: string[]
  dirFilter?: string[]
  labelFilter?: string[]
  categoryFilter?: string[]
  translateStatus: (statusKey: string) => string
}

export function getAvailableTrackers(torrents: Torrent[]): string[] {
  const hosts = new Set<string>()

  torrents.forEach((torrent) => {
    torrent.trackerStats?.forEach((stat) => {
      if (stat.host) hosts.add(stat.host)
    })
  })

  return Array.from(hosts).sort()
}

export function getAvailableDownloadDirs(torrents: Torrent[]): string[] {
  const dirs = new Set<string>()

  torrents.forEach((torrent) => {
    if (torrent.downloadDir) dirs.add(torrent.downloadDir)
  })

  return Array.from(dirs).sort()
}

export function getAvailableLabels(torrents: Torrent[]): string[] {
  const labels = new Set<string>()

  torrents.forEach((torrent) => {
    torrent.labels?.forEach((label) => {
      const text = parseTorrentLabel(label)
      if (text) labels.add(text)
    })
  })

  return Array.from(labels).sort()
}

export function hasTorrentError(torrent: Torrent): boolean {
  return torrent.error > 0 || Boolean(torrent.errorString)
}

export type StatusFilterId = "all" | "active" | "downloading" | "seeding" | "paused" | "error"

export interface FacetCount {
  value: string
  count: number
}

export interface TorrentOverview {
  statusCounts: Record<StatusFilterId, number>
  trackers: FacetCount[]
  downloadDirs: FacetCount[]
  labels: FacetCount[]
  categories: FacetCount[]
}

function toFacetCounts(counts: Map<string, number>): FacetCount[] {
  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
}

function increment(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

/** Counts per sidebar status and per tracker / directory / label, over the unfiltered list. */
export function getTorrentOverview(torrents: Torrent[]): TorrentOverview {
  const statusCounts: Record<StatusFilterId, number> = { all: torrents.length, active: 0, downloading: 0, seeding: 0, paused: 0, error: 0 }
  const trackers = new Map<string, number>()
  const downloadDirs = new Map<string, number>()
  const labels = new Map<string, number>()
  const categories = new Map<string, number>()

  for (const torrent of torrents) {
    if (torrent.rateDownload > 0 || torrent.rateUpload > 0) statusCounts.active += 1
    if ([4, 3, 2, 1].includes(torrent.status)) statusCounts.downloading += 1
    if ([6, 5].includes(torrent.status)) statusCounts.seeding += 1
    if (torrent.status === 0) statusCounts.paused += 1
    if (hasTorrentError(torrent)) statusCounts.error += 1

    new Set(torrent.trackerStats?.map((stat) => stat.host).filter(Boolean)).forEach((host) => increment(trackers, host))
    if (torrent.downloadDir) increment(downloadDirs, torrent.downloadDir)
    if (torrent.category) increment(categories, torrent.category)
    new Set(torrent.labels?.map(parseTorrentLabel).filter(Boolean)).forEach((label) => increment(labels, label))
  }

  return {
    statusCounts,
    trackers: toFacetCounts(trackers),
    downloadDirs: toFacetCounts(downloadDirs),
    labels: toFacetCounts(labels),
    categories: toFacetCounts(categories),
  }
}

export function filterTorrents(torrents: Torrent[], options: TorrentFilterOptions): Torrent[] {
  const {
    statusFilter,
    searchQuery,
    trackerFilter = [],
    dirFilter = [],
    labelFilter = [],
    categoryFilter = [],
    translateStatus,
  } = options
  const statusLower = statusFilter?.toLowerCase()
  const searchLower = searchQuery?.toLowerCase()

  return torrents.filter((torrent) => {
    if (statusLower) {
      if (statusLower === "active") {
        if (!(torrent.rateDownload > 0 || torrent.rateUpload > 0)) return false
      } else if (statusLower === "downloading") {
        if (![4, 3, 2, 1].includes(torrent.status)) return false
      } else if (statusLower === "seeding") {
        if (![6, 5].includes(torrent.status)) return false
      } else if (statusLower === "stopped" || statusLower === "paused") {
        if (torrent.status !== 0) return false
      } else if (statusLower === "error") {
        if (!hasTorrentError(torrent)) return false
      } else if (!translateStatus(getStatusLabel(torrent.status)).toLowerCase().includes(statusLower)) {
        return false
      }
    }

    if (trackerFilter.length > 0 && !torrent.trackerStats?.some((stat) => trackerFilter.includes(stat.host))) return false
    if (dirFilter.length > 0 && !dirFilter.includes(torrent.downloadDir)) return false
    if (categoryFilter.length > 0 && !categoryFilter.includes(torrent.category ?? "")) return false
    if (labelFilter.length > 0 && !torrent.labels?.some((label) => labelFilter.includes(parseTorrentLabel(label)))) return false
    if (searchLower && !torrent.name.toLowerCase().includes(searchLower)) return false

    return true
  })
}

export function getTorrentSortValue(torrent: Torrent, key: SortKey): number | string {
  switch (key) {
    case "labels":
      return getTorrentLabelsSortValue(torrent.labels)
    case "editDate":
      return torrent.editDate ?? 0
    case "seeds":
      return torrent.peersSendingToUs
    case "peers":
      return torrent.peersGettingFromUs
    case "tracker":
      return torrent.trackerStats?.[0]?.announce ?? torrent.trackers?.[0]?.announce ?? ""
    default: {
      const value = torrent[key as keyof Torrent]
      return (typeof value === "number" || typeof value === "string") ? value : 0
    }
  }
}

export function sortTorrents(torrents: Torrent[], sortConfig: SortConfig | null): Torrent[] {
  if (!sortConfig) return torrents

  const { key, direction } = sortConfig

  // 每条任务只计算一次派生排序键，避免标签等字段在比较中重复转换。
  return sortTorrentEntries(torrents.map(torrent => ({
    id: torrent.id, value: getTorrentSortValue(torrent, key), torrent,
  })), direction).map(entry => entry.torrent)
}

export function selectTorrentRange(
  orderedIds: string[],
  selectedIds: string[],
  anchorId: string | null,
  targetId: string,
): string[] {
  if (!anchorId) return selectedIds.includes(targetId) ? selectedIds : [...selectedIds, targetId]
  const anchorIndex = orderedIds.indexOf(anchorId)
  const targetIndex = orderedIds.indexOf(targetId)
  if (anchorIndex < 0 || targetIndex < 0) return selectedIds.includes(targetId) ? selectedIds : [...selectedIds, targetId]
  const start = Math.min(anchorIndex, targetIndex)
  const end = Math.max(anchorIndex, targetIndex)
  return Array.from(new Set([...selectedIds, ...orderedIds.slice(start, end + 1)]))
}
