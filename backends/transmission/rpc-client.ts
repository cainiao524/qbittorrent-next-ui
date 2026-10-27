/** Transmission RPC v17 client with a UI-friendly compatibility layer. */
import type {
  ApplicationPreferences,
  FreeSpaceResponse,
  Session,
  SessionStats,
  Torrent,
  TorrentAddArgs,
  TorrentAddResponse,
  TorrentFilePriority,
  TorrentGetResponse,
  TorrentId,
  TorrentPieceState,
  TorrentSetArgs,
  Tracker,
  TrackerStat,
} from "@/lib/rpc-types"
import { isWritablePreference } from "./application-preferences"
import { isPrivateNetworkHost } from "./network"
import { APP_CONFIG } from "./config"

type JsonRecord = Record<string, unknown>

interface RpcEnvelope<T> {
  result: string
  arguments: T
  tag?: number
}

const LAN_AUTH_STORAGE_KEY = "transmission_lan_auth"
const LEGACY_AUTH_STORAGE_KEY = "transmission_basic_auth"
const AUTH_LOGOUT_EVENT = APP_CONFIG.events.authLogout

function clearLegacyStoredAuth(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
  sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
}

function isPrivateNetworkContext(): boolean {
  return typeof window !== "undefined" && isPrivateNetworkHost(window.location.hostname)
}

const CORE_FIELDS = [
  "id", "name", "status", "hashString", "totalSize", "percentDone", "rateDownload", "rateUpload",
  "eta", "addedDate", "doneDate", "activityDate", "downloadDir", "error", "errorString", "uploadedEver",
  "downloadedEver", "uploadRatio", "queuePosition", "isFinished", "isPrivate", "isStalled", "peersConnected",
  "peersSendingToUs", "peersGettingFromUs", "bandwidthPriority", "downloadLimit", "downloadLimited", "uploadLimit",
  "uploadLimited", "honorsSessionLimits", "seedRatioLimit", "seedRatioMode", "seedIdleLimit", "seedIdleMode",
] as const

const OPTIONAL_FIELDS = new Set([
  ...CORE_FIELDS,
  "labels", "trackers", "trackerStats", "files", "fileStats", "peers", "comment", "creator", "dateCreated",
  "trackerList", "secondsDownloading", "secondsSeeding", "peer-limit", "pieceCount", "pieceSize", "haveValid",
  "haveUnchecked", "desiredAvailable", "leftUntilDone", "metadataPercentComplete", "size",
])

function numberValue(record: JsonRecord, key: string, fallback = 0): number {
  const value = Number(record[key] ?? fallback)
  return Number.isFinite(value) ? value : fallback
}

function booleanValue(record: JsonRecord, key: string, fallback = false): boolean {
  return typeof record[key] === "boolean" ? record[key] as boolean : fallback
}

function stringValue(record: JsonRecord, key: string, fallback = ""): string {
  return typeof record[key] === "string" ? record[key] as string : fallback
}

function trackerHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url.split("/")[0] ?? url
  }
}

function mapTracker(raw: JsonRecord): Tracker {
  const announce = stringValue(raw, "announce")
  return {
    id: numberValue(raw, "id"),
    tier: numberValue(raw, "tier"),
    announce,
    scrape: stringValue(raw, "scrape"),
    sitename: stringValue(raw, "sitename", trackerHost(announce)),
  }
}

function mapTrackerStat(raw: JsonRecord): TrackerStat {
  const announce = stringValue(raw, "announce")
  return {
    announce,
    host: stringValue(raw, "host", trackerHost(announce)),
    seederCount: numberValue(raw, "seederCount"),
    leecherCount: numberValue(raw, "leecherCount"),
    lastAnnounceSucceeded: booleanValue(raw, "lastAnnounceSucceeded"),
    lastAnnounceResult: stringValue(raw, "lastAnnounceResult"),
    isBackup: booleanValue(raw, "isBackup"),
  }
}

function mapTorrent(raw: JsonRecord): Torrent {
  const files = Array.isArray(raw.files) ? raw.files as JsonRecord[] : undefined
  const fileStats = Array.isArray(raw.fileStats) ? raw.fileStats as JsonRecord[] : []
  const peers = Array.isArray(raw.peers) ? raw.peers as JsonRecord[] : []
  const pieceSize = numberValue(raw, "pieceSize")
  const haveBytes = numberValue(raw, "haveValid") + numberValue(raw, "haveUnchecked")
  const left = numberValue(raw, "leftUntilDone")
  const desired = numberValue(raw, "desiredAvailable")
  const trackers = Array.isArray(raw.trackers) ? (raw.trackers as JsonRecord[]).map(mapTracker) : []
  const rawTrackerStats = Array.isArray(raw.trackerStats) ? raw.trackerStats as JsonRecord[] : []
  const trackerStats = rawTrackerStats.map(mapTrackerStat)
  const lastSeenComplete = rawTrackerStats.reduce((latest, tracker) => {
    if (numberValue(tracker, "seederCount") <= 0) return latest
    return Math.max(latest, numberValue(tracker, "lastScrapeTime"), numberValue(tracker, "lastAnnounceTime"))
  }, 0)

  return {
    id: stringValue(raw, "hashString", String(raw.id ?? "")),
    name: stringValue(raw, "name"),
    status: numberValue(raw, "status") as Torrent["status"],
    hashString: stringValue(raw, "hashString"),
    totalSize: numberValue(raw, "totalSize"),
    size: numberValue(raw, "sizeWhenDone", numberValue(raw, "totalSize")),
    percentDone: numberValue(raw, "percentDone"),
    rateDownload: numberValue(raw, "rateDownload"),
    rateUpload: numberValue(raw, "rateUpload"),
    eta: numberValue(raw, "eta", -1),
    addedDate: numberValue(raw, "addedDate"),
    doneDate: numberValue(raw, "doneDate"),
    editDate: numberValue(raw, "activityDate"),
    downloadDir: stringValue(raw, "downloadDir"),
    error: numberValue(raw, "error"),
    errorString: stringValue(raw, "errorString"),
    uploadedEver: numberValue(raw, "uploadedEver"),
    downloadedEver: numberValue(raw, "downloadedEver"),
    amountLeft: left,
    uploadRatio: numberValue(raw, "uploadRatio"),
    labels: Array.isArray(raw.labels) ? raw.labels.map(String) : [],
    queuePosition: numberValue(raw, "queuePosition"),
    isFinished: booleanValue(raw, "isFinished", numberValue(raw, "percentDone") >= 1),
    isPrivate: booleanValue(raw, "isPrivate"),
    isStalled: booleanValue(raw, "isStalled"),
    trackers,
    trackerStats,
    files: files?.map((file, index) => {
      const stats = fileStats[index] ?? {}
      const wanted = booleanValue(stats, "wanted", true)
      const priority = numberValue(stats, "priority")
      return {
        index,
        name: stringValue(file, "name"),
        length: numberValue(file, "length"),
        bytesCompleted: numberValue(stats, "bytesCompleted", numberValue(file, "bytesCompleted")),
        priority: (!wanted ? 0 : priority > 0 ? 6 : 1) as TorrentFilePriority,
      }
    }),
    peers: peers.map((peer) => ({
      address: stringValue(peer, "address"),
      clientName: stringValue(peer, "clientName"),
      country: stringValue(peer, "country") || undefined,
      countryCode: stringValue(peer, "countryCode", stringValue(peer, "country_code")) || undefined,
      rateToClient: numberValue(peer, "rateToClient"),
      rateToPeer: numberValue(peer, "rateToPeer"),
      progress: numberValue(peer, "progress"),
      isEncrypted: booleanValue(peer, "isEncrypted"),
    })),
    peersConnected: numberValue(raw, "peersConnected"),
    peersSendingToUs: numberValue(raw, "peersSendingToUs"),
    peersGettingFromUs: numberValue(raw, "peersGettingFromUs"),
    comment: stringValue(raw, "comment"),
    creator: stringValue(raw, "creator"),
    dateCreated: numberValue(raw, "dateCreated"),
    bandwidthPriority: numberValue(raw, "bandwidthPriority"),
    downloadLimit: numberValue(raw, "downloadLimit"),
    downloadLimited: booleanValue(raw, "downloadLimited"),
    uploadLimit: numberValue(raw, "uploadLimit"),
    uploadLimited: booleanValue(raw, "uploadLimited"),
    honorsSessionLimits: booleanValue(raw, "honorsSessionLimits", true),
    seedRatioLimit: numberValue(raw, "seedRatioLimit"),
    seedRatioMode: numberValue(raw, "seedRatioMode"),
    seedIdleLimit: numberValue(raw, "seedIdleLimit"),
    seedIdleMode: numberValue(raw, "seedIdleMode"),
    trackerList: stringValue(raw, "trackerList", trackers.map((tracker) => tracker.announce).join("\n")),
    forceStart: false,
    sequentialDownload: false,
    firstLastPiecePriority: false,
    superSeeding: false,
    autoManagement: false,
    downloadPath: "",
    seedingTimeLimit: 0,
    seedingTimeMode: 0,
    inactiveSeedingTimeLimit: numberValue(raw, "seedIdleLimit"),
    inactiveSeedingTimeMode: numberValue(raw, "seedIdleMode"),
    shareLimitAction: "Stop",
    timeElapsed: numberValue(raw, "secondsDownloading") + numberValue(raw, "secondsSeeding"),
    seedingTime: numberValue(raw, "secondsSeeding"),
    connectionsLimit: numberValue(raw, "peer-limit"),
    downloadedSession: numberValue(raw, "downloadedEver"),
    uploadedSession: numberValue(raw, "uploadedEver"),
    averageDownloadSpeed: 0,
    averageUploadSpeed: 0,
    wastedSize: 0,
    seedsTotal: trackerStats.reduce((maximum, tracker) => Math.max(maximum, tracker.seederCount), 0),
    peersTotal: trackerStats.reduce((maximum, tracker) => Math.max(maximum, tracker.leecherCount), 0),
    popularity: 0,
    availability: left <= 0 ? 1 : Math.min(1, desired / left),
    nextAnnounce: 0,
    piecesCount: numberValue(raw, "pieceCount"),
    piecesHave: pieceSize > 0 ? Math.floor(haveBytes / pieceSize) : 0,
    pieceSize,
    lastSeenComplete,
  }
}

class TransmissionRPC {
  private requestSignal?: AbortSignal
  withSignal(signal: AbortSignal): TransmissionRPC {
    return Object.assign(Object.create(this) as TransmissionRPC, { requestSignal: signal })
  }
  private baseUrl = import.meta.env.VITE_TRANSMISSION_RPC_URL || "/transmission/rpc"
  private sessionId: string | null = null
  private authHeader: string | null = null
  private readonly privateNetwork = isPrivateNetworkContext()

  constructor() {
    clearLegacyStoredAuth()
    if (this.privateNetwork) {
      this.authHeader = localStorage.getItem(LAN_AUTH_STORAGE_KEY)
    } else if (typeof window !== "undefined") {
      localStorage.removeItem(LAN_AUTH_STORAGE_KEY)
    }
  }

  private async request<T = JsonRecord>(method: string, args?: JsonRecord, retry = true): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.sessionId) headers["X-Transmission-Session-Id"] = this.sessionId
    if (this.authHeader) headers.Authorization = this.authHeader
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      credentials: "same-origin",
      signal: this.requestSignal ? AbortSignal.any([this.requestSignal, AbortSignal.timeout(10000)]) : undefined,
      body: JSON.stringify({ method, arguments: args, tag: Math.floor(Math.random() * 100000) }),
    })
    if (response.status === 409 && retry) {
      this.sessionId = response.headers.get("X-Transmission-Session-Id")
      if (this.sessionId) return this.request<T>(method, args, false)
    }
    if (!response.ok) throw new Error(`Transmission RPC ${response.status}: ${response.statusText}`)
    const data = await response.json() as RpcEnvelope<T>
    if (data.result !== "success") throw new Error(`Transmission RPC：${data.result}`)
    return data.arguments
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      await this.getSession()
      return true
    } catch {
      return false
    }
  }

  async login(username: string, password: string): Promise<void> {
    const previous = this.authHeader
    this.authHeader = `Basic ${btoa(`${username}:${password}`)}`
    this.sessionId = null
    try {
      await this.getSession()
      if (this.privateNetwork) localStorage.setItem(LAN_AUTH_STORAGE_KEY, this.authHeader)
    } catch (error) {
      this.authHeader = previous
      throw error
    }
  }

  async logout(): Promise<void> {
    this.authHeader = null
    this.sessionId = null
    clearLegacyStoredAuth()
    if (!this.privateNetwork && typeof window !== "undefined") localStorage.removeItem(LAN_AUTH_STORAGE_KEY)
    if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
  }

  async getTorrents(fields: string[], ids?: TorrentId[]): Promise<TorrentGetResponse> {
    const requested = new Set<string>(CORE_FIELDS)
    fields.forEach((field) => {
      if (OPTIONAL_FIELDS.has(field)) requested.add(field)
      if (field === "editDate") requested.add("activityDate")
      if (field === "files") requested.add("fileStats")
      if (["timeElapsed", "averageDownloadSpeed", "averageUploadSpeed"].includes(field)) requested.add("secondsDownloading")
      if (["timeElapsed", "seedingTime"].includes(field)) requested.add("secondsSeeding")
      if (field === "connectionsLimit") requested.add("peer-limit")
      if (["piecesCount", "piecesHave"].includes(field)) ["pieceCount", "pieceSize", "haveValid", "haveUnchecked"].forEach((item) => requested.add(item))
      if (field === "availability") ["desiredAvailable", "leftUntilDone"].forEach((item) => requested.add(item))
      if (field === "amountLeft") requested.add("leftUntilDone")
      if (["seedsTotal", "peersTotal", "lastSeenComplete"].includes(field)) requested.add("trackerStats")
      if (field === "size") requested.add("sizeWhenDone")
    })
    const args: JsonRecord = { fields: [...requested] }
    if (ids?.length) args.ids = ids
    const response = await this.request<{ torrents: JsonRecord[] }>("torrent-get", args)
    return { torrents: response.torrents.map(mapTorrent) }
  }

  async exportTorrent(id: TorrentId): Promise<{ blob: Blob }> {
    const response = await this.request<{ torrents: JsonRecord[] }>("torrent-get", {
      ids: [id],
      fields: ["metainfo"],
    })
    const metainfo = stringValue(response.torrents[0] ?? {}, "metainfo")
    if (!metainfo) throw new Error("Transmission RPC：未返回种子元数据")
    const binary = atob(metainfo)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return { blob: new Blob([bytes], { type: "application/x-bittorrent" }) }
  }

  async getTorrentPieceStates(id: TorrentId): Promise<TorrentPieceState[]> {
    const response = await this.request<{ torrents: JsonRecord[] }>("torrent-get", {
      ids: [id],
      fields: ["pieceCount", "pieces"],
    })
    const torrent = response.torrents[0]
    if (!torrent) return []

    const pieceCount = numberValue(torrent, "pieceCount")
    const encodedPieces = stringValue(torrent, "pieces")
    if (!pieceCount || !encodedPieces) return []

    const pieces = atob(encodedPieces)
    return Array.from({ length: pieceCount }, (_, index): TorrentPieceState => {
      const byte = pieces.charCodeAt(Math.floor(index / 8)) || 0
      const mask = 1 << (7 - index % 8)
      return (byte & mask) !== 0 ? 2 : 0
    })
  }

  async getSession(): Promise<Session> {
    return this.request<Session>("session-get")
  }

  async getApplicationPreferences(): Promise<ApplicationPreferences> {
    return { ...await this.getSession() } as unknown as ApplicationPreferences
  }

  async setApplicationPreferences(preferences: Partial<ApplicationPreferences>): Promise<void> {
    const values = Object.fromEntries(Object.entries(preferences).filter(([key]) => isWritablePreference(key)))
    if (Object.keys(values).length) await this.request("session-set", values)
  }

  async setSession(args: Partial<Session>) {
    const values = Object.fromEntries(Object.entries(args).filter(([key]) => isWritablePreference(key)))
    if (Object.keys(values).length) await this.request("session-set", values)
    return {}
  }

  async getStats(snapshot?: Torrent[]): Promise<SessionStats> {
    void snapshot
    return this.request<SessionStats>("session-stats")
  }

  async startTorrents(ids?: TorrentId[]) { return this.request("torrent-start", ids?.length ? { ids } : {}) }
  async stopTorrents(ids?: TorrentId[]) { return this.request("torrent-stop", ids?.length ? { ids } : {}) }
  async removeTorrents(ids: TorrentId[], deleteData = false) { return this.request("torrent-remove", { ids, "delete-local-data": deleteData }) }

  async addTorrent(args: TorrentAddArgs): Promise<TorrentAddResponse> {
    const addArgs: JsonRecord = {}
    if (args.filename) addArgs.filename = args.filename
    if (args.metainfo) addArgs.metainfo = args.metainfo
    if (args["download-dir"]) addArgs["download-dir"] = args["download-dir"]
    if (args.paused !== undefined) addArgs.paused = args.paused
    if (args.tags?.length) addArgs.labels = args.tags
    if (args["files-unwanted"] !== undefined) addArgs["files-unwanted"] = args["files-unwanted"]
    const result = await this.request<TorrentAddResponse>("torrent-add", addArgs)
    const added = result["torrent-added"] ?? result["torrent-duplicate"]
    const id = added?.hashString || (added?.id ? String(added.id) : undefined)
    if (id) {
      const setArgs: TorrentSetArgs = {
        labels: args.tags,
        downloadLimit: args.dlLimit ? Math.round(args.dlLimit / 1024) : undefined,
        downloadLimited: Boolean(args.dlLimit),
        uploadLimit: args.upLimit ? Math.round(args.upLimit / 1024) : undefined,
        uploadLimited: Boolean(args.upLimit),
        seedRatioLimit: args.ratioLimit,
        seedRatioMode: args.ratioLimit === undefined ? undefined : 1,
        seedIdleLimit: args.inactiveSeedingTimeLimit,
        seedIdleMode: args.inactiveSeedingTimeLimit === undefined ? undefined : 1,
      }
      await this.setTorrent([id], setArgs)
      if (args.addToTopOfQueue) await this.changeQueuePriority([id], "top")
      if (args.forced) await this.setForceStart([id], true)
    }
    return result
  }

  async getTorrentCategories(): Promise<Array<{ name: string; savePath: string }>> { return [] }
  async getTorrentTags(): Promise<string[]> {
    const data = await this.getTorrents(["labels"])
    return [...new Set(data.torrents.flatMap((torrent) => torrent.labels ?? []))].sort((a, b) => a.localeCompare(b))
  }

  async setForceStart(ids: TorrentId[], value: boolean) { return this.request(value ? "torrent-start-now" : "torrent-start", { ids }) }
  async toggleSequentialDownload(ids: TorrentId[]) { void ids; throw new Error("Transmission 当前版本不支持顺序下载开关") }
  async toggleFirstLastPiecePriority(ids: TorrentId[]) { void ids; throw new Error("Transmission 不支持首尾区块优先开关") }
  async setSuperSeeding(ids: TorrentId[], value: boolean) { void ids; void value; throw new Error("Transmission 不支持超级做种") }
  async setAutoManagement(ids: TorrentId[], value: boolean) { void ids; void value; throw new Error("Transmission 不支持自动种子管理") }

  async changeQueuePriority(ids: TorrentId[], direction: "top" | "up" | "down" | "bottom") {
    return this.request(`queue-move-${direction}`, { ids })
  }

  async setTorrentSavePath(ids: TorrentId[], path: string) { return this.setTorrentLocation(ids, path, true) }
  async setTorrentDownloadPath(_ids: TorrentId[], path: string) {
    if (path) throw new Error("Transmission 只支持统一的数据位置，请使用保存路径")
    return {}
  }

  async setTorrent(ids: TorrentId[], args: TorrentSetArgs) {
    const values: JsonRecord = { ids }
    const directKeys: Array<keyof TorrentSetArgs> = [
      "bandwidthPriority", "downloadLimit", "downloadLimited", "uploadLimit", "uploadLimited", "honorsSessionLimits",
      "seedRatioLimit", "seedRatioMode", "seedIdleLimit", "seedIdleMode", "trackerList", "labels",
    ]
    directKeys.forEach((key) => { if (args[key] !== undefined) values[key] = args[key] })
    if (args.inactiveSeedingTimeLimit !== undefined) values.seedIdleLimit = args.inactiveSeedingTimeLimit
    if (args.inactiveSeedingTimeMode !== undefined) values.seedIdleMode = args.inactiveSeedingTimeMode
    return this.request("torrent-set", values)
  }

  async setFilePriority(id: TorrentId, fileIds: number[], priority: TorrentFilePriority) {
    if (!fileIds.length) return {}
    const values: JsonRecord = { ids: [id] }
    if (priority === 0) values["files-unwanted"] = fileIds
    else {
      values["files-wanted"] = fileIds
      values[priority >= 6 ? "priority-high" : "priority-normal"] = fileIds
    }
    return this.request("torrent-set", values)
  }

  async setTorrentLocation(ids: TorrentId[], location: string, move = true) { return this.request("torrent-set-location", { ids, location, move }) }
  async renameTorrentPath(id: TorrentId, path: string, name: string) { return this.request("torrent-rename-path", { ids: [id], path, name }) }
  async freeSpace(path: string): Promise<FreeSpaceResponse> { return this.request<FreeSpaceResponse>("free-space", { path }) }
  async portTest(): Promise<{ "port-is-open": boolean }> { return this.request("port-test") }
  async verifyTorrents(ids?: TorrentId[]) { return this.request("torrent-verify", ids?.length ? { ids } : {}) }
  async reannounceTorrents(ids?: TorrentId[]) { return this.request("torrent-reannounce", ids?.length ? { ids } : {}) }
}

export const rpc = new TransmissionRPC()
