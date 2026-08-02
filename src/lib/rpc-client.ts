/** qBittorrent Web API v2 client with a UI-friendly compatibility layer. */
import type {
  ApplicationPreferences,
  FreeSpaceResponse,
  Session,
  SessionStats,
  TorrentAddArgs,
  TorrentAddResponse,
  TorrentGetResponse,
  TorrentId,
  TorrentCreatorArgs,
  TorrentCreatorTask,
  TorrentSetArgs,
} from "./rpc-types"
import { parseTorrentLabels } from "./torrent-labels"
import { TorrentStatus, type Peer, type Torrent, type TorrentFile, type TorrentFilePriority, type Tracker, type TrackerStat } from "./rpc-types"

type JsonRecord = Record<string, unknown>

interface QbtTorrentInfo {
  hash: string
  name: string
  state: string
  size: number
  total_size?: number
  progress: number
  dlspeed: number
  upspeed: number
  eta: number
  added_on: number
  completion_on: number
  last_activity: number
  save_path: string
  amount_left: number
  uploaded: number
  downloaded: number
  ratio: number
  tags: string
  category: string
  priority: number
  tracker: string
  num_complete: number
  num_incomplete: number
  num_leechs: number
  num_seeds: number
  force_start?: boolean
  seq_dl?: boolean
  f_l_piece_prio?: boolean
  super_seeding?: boolean
  auto_tmm?: boolean
  download_path?: string
}

interface QbtTransferInfo {
  dl_info_speed: number
  dl_info_data: number
  up_info_speed: number
  up_info_data: number
  connection_status: string
}

interface QbtProperties extends JsonRecord {
  save_path?: string
  creation_date?: number
  piece_size?: number
  comment?: string
  total_uploaded?: number
  total_downloaded?: number
  dl_limit?: number
  up_limit?: number
  share_ratio?: number
  share_ratio_limit?: number
  seeding_time_limit?: number
  created_by?: string
  nb_connections?: number
}

const STOPPED_STATES = new Set(["pausedUP", "pausedDL", "stoppedUP", "stoppedDL"])
const DOWNLOADING_STATES = new Set(["downloading", "forcedDL", "metaDL"])
const DOWNLOAD_WAIT_STATES = new Set(["queuedDL", "stalledDL", "allocating", "moving"])
const SEEDING_STATES = new Set(["uploading", "forcedUP"])
const SEED_WAIT_STATES = new Set(["queuedUP", "stalledUP"])
const CHECKING_STATES = new Set(["checkingUP", "checkingDL", "checkingResumeData"])

function mapStatus(state: string): TorrentStatus {
  if (STOPPED_STATES.has(state)) return TorrentStatus.STOPPED
  if (DOWNLOADING_STATES.has(state)) return TorrentStatus.DOWNLOAD
  if (DOWNLOAD_WAIT_STATES.has(state)) return TorrentStatus.DOWNLOAD_WAIT
  if (SEEDING_STATES.has(state)) return TorrentStatus.SEED
  if (SEED_WAIT_STATES.has(state)) return TorrentStatus.SEED_WAIT
  if (CHECKING_STATES.has(state)) return TorrentStatus.CHECK
  return TorrentStatus.STOPPED
}

function trackerHost(url: string): string {
  if (!url) return ""
  try {
    return new URL(url).hostname
  } catch {
    return url.split("/")[0]
  }
}

function mapSummary(raw: QbtTorrentInfo): Torrent {
  const status = mapStatus(raw.state)
  const tracker = raw.tracker || ""
  return {
    id: raw.hash,
    hashString: raw.hash,
    name: raw.name,
    status,
    totalSize: raw.total_size ?? raw.size ?? 0,
    percentDone: raw.progress ?? 0,
    rateDownload: raw.dlspeed ?? 0,
    rateUpload: raw.upspeed ?? 0,
    eta: raw.eta >= 8640000 ? -1 : raw.eta,
    addedDate: raw.added_on ?? 0,
    doneDate: raw.completion_on ?? 0,
    editDate: raw.last_activity ?? 0,
    downloadDir: raw.save_path ?? "",
    error: raw.state === "error" || raw.state === "missingFiles" ? 1 : 0,
    errorString: raw.state === "missingFiles" ? "Missing files" : raw.state === "error" ? "qBittorrent reported an error" : "",
    uploadedEver: raw.uploaded ?? 0,
    downloadedEver: raw.downloaded ?? 0,
    uploadRatio: raw.ratio ?? 0,
    labels: raw.tags ? raw.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    category: raw.category || "",
    forceStart: raw.force_start ?? false,
    sequentialDownload: raw.seq_dl ?? false,
    firstLastPiecePriority: raw.f_l_piece_prio ?? false,
    superSeeding: raw.super_seeding ?? false,
    autoManagement: raw.auto_tmm ?? false,
    downloadPath: raw.download_path ?? "",
    queuePosition: raw.priority ?? 0,
    isFinished: (raw.progress ?? 0) >= 1,
    isPrivate: false,
    isStalled: raw.state.startsWith("stalled"),
    peersConnected: (raw.num_leechs ?? 0) + (raw.num_seeds ?? 0),
    peersSendingToUs: raw.num_seeds ?? 0,
    peersGettingFromUs: raw.num_leechs ?? 0,
    trackers: tracker ? [{ id: 0, tier: 0, announce: tracker, scrape: "", sitename: trackerHost(tracker) }] : [],
    trackerStats: tracker ? [{ announce: tracker, host: trackerHost(tracker), seederCount: raw.num_complete ?? 0, leecherCount: raw.num_incomplete ?? 0, lastAnnounceSucceeded: true, lastAnnounceResult: "", isBackup: false }] : [],
  }
}

class QBittorrentRPC {
  private baseUrl = (import.meta.env.VITE_QBITTORRENT_API_URL || "/api/v2").replace(/\/$/, "")

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const response = await window.fetch(`${this.baseUrl}${path}`, {
      credentials: "include",
      ...init,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      throw new Error(`qBittorrent API ${response.status}: ${detail || response.statusText}`)
    }
    return response
  }

  private async get<T>(path: string): Promise<T> {
    return (await this.fetch(path)).json() as Promise<T>
  }

  private async post(path: string, values?: Record<string, string | number | boolean>): Promise<Response> {
    const body = new URLSearchParams()
    Object.entries(values ?? {}).forEach(([key, value]) => body.set(key, String(value)))
    return this.fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body,
    })
  }

  private hashes(ids?: TorrentId[]): string {
    return ids?.length ? ids.join("|") : "all"
  }

  private torrentCreatorUrls(value = ""): string {
    return value.split(/\r?\n/).map((url) => url.trim()).map(encodeURIComponent).join("|")
  }

  private responseFilename(response: Response, fallback: string): string {
    const disposition = response.headers.get("Content-Disposition") ?? ""
    const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    try {
      return decodeURIComponent(utf8 ?? plain ?? fallback)
    } catch {
      return plain ?? fallback
    }
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      await this.fetch("/app/version")
      return true
    } catch {
      return false
    }
  }

  async login(username: string, password: string): Promise<void> {
    const response = await this.post("/auth/login", { username, password })
    if ((await response.text()).trim() !== "Ok.") throw new Error("Invalid username or password")
  }

  async logout(): Promise<void> {
    await this.post("/auth/logout")
  }

  async getTorrents(fields: string[], ids?: TorrentId[]): Promise<TorrentGetResponse> {
    const query = ids?.length ? `?hashes=${encodeURIComponent(ids.join("|"))}` : ""
    const raw = await this.get<QbtTorrentInfo[]>(`/torrents/info${query}`)
    const torrents = raw.map(mapSummary)
    const wantsDetails = fields.some((field) => ["files", "peers", "trackers", "trackerStats", "comment", "creator", "dateCreated", "downloadLimit", "uploadLimit", "trackerList"].includes(field))

    if (wantsDetails && ids?.length) {
      await Promise.all(torrents.map(async (torrent) => this.enrichTorrent(torrent, fields)))
    } else if (fields.includes("trackers")) {
      await Promise.all(torrents.map(async (torrent) => this.enrichTrackers(torrent)))
    }
    return { torrents }
  }

  private async enrichTorrent(torrent: Torrent, fields: string[]): Promise<void> {
    const hash = encodeURIComponent(torrent.hashString)
    const jobs: Promise<void>[] = []
    if (fields.some((field) => ["comment", "creator", "dateCreated", "downloadLimit", "uploadLimit", "seedRatioLimit"].includes(field))) {
      jobs.push(this.get<QbtProperties>(`/torrents/properties?hash=${hash}`).then((props) => {
        torrent.comment = String(props.comment ?? "")
        torrent.creator = String(props.created_by ?? "")
        torrent.dateCreated = Number(props.creation_date ?? 0)
        torrent.uploadedEver = Number(props.total_uploaded ?? torrent.uploadedEver)
        torrent.downloadedEver = Number(props.total_downloaded ?? torrent.downloadedEver)
        torrent.downloadLimit = Math.max(0, Math.round(Number(props.dl_limit ?? 0) / 1024))
        torrent.downloadLimited = Number(props.dl_limit ?? 0) > 0
        torrent.uploadLimit = Math.max(0, Math.round(Number(props.up_limit ?? 0) / 1024))
        torrent.uploadLimited = Number(props.up_limit ?? 0) > 0
        torrent.seedRatioLimit = Number(props.share_ratio_limit ?? 0)
      }))
    }
    if (fields.includes("trackers") || fields.includes("trackerStats") || fields.includes("trackerList")) jobs.push(this.enrichTrackers(torrent))
    if (fields.includes("files")) {
      jobs.push(this.get<Array<{ index?: number; name: string; size: number; progress: number; priority?: number }>>(`/torrents/files?hash=${hash}`).then((files) => {
        torrent.files = files.map((file, position): TorrentFile => ({
          index: file.index ?? position,
          name: file.name,
          length: file.size,
          bytesCompleted: Math.round(file.size * file.progress),
          priority: file.priority === 0 || file.priority === 6 || file.priority === 7 ? file.priority : 1,
        }))
      }))
    }
    if (fields.includes("peers")) {
      jobs.push(this.get<{ peers?: Record<string, { ip: string; client: string; dl_speed: number; up_speed: number; progress: number; flags: string }> }>(`/sync/torrentPeers?hash=${hash}&rid=0`).then((data) => {
        torrent.peers = Object.values(data.peers ?? {}).map((peer): Peer => ({ address: peer.ip, clientName: peer.client, rateToClient: peer.dl_speed, rateToPeer: peer.up_speed, progress: peer.progress, isEncrypted: peer.flags?.includes("E") ?? false }))
      }))
    }
    await Promise.all(jobs)
  }

  private async enrichTrackers(torrent: Torrent): Promise<void> {
    const data = await this.get<Array<{ url: string; status: number; tier: number; num_seeds: number; num_leeches: number; msg: string }>>(`/torrents/trackers?hash=${encodeURIComponent(torrent.hashString)}`)
    const real = data.filter((item) => /^\w+:\/\//.test(item.url))
    torrent.trackers = real.map((item, index): Tracker => ({ id: index, tier: item.tier, announce: item.url, scrape: "", sitename: trackerHost(item.url) }))
    torrent.trackerStats = real.map((item): TrackerStat => ({ announce: item.url, host: trackerHost(item.url), seederCount: item.num_seeds, leecherCount: item.num_leeches, lastAnnounceSucceeded: item.status === 2, lastAnnounceResult: item.msg || "", isBackup: item.tier > 0 }))
    torrent.trackerList = real.map((item) => item.url).join("\n")
  }

  async getSession() {
    const [prefs, version, apiVersion, speedMode] = await Promise.all([
      this.getApplicationPreferences(),
      this.fetch("/app/version").then((response) => response.text()),
      this.fetch("/app/webapiVersion").then((response) => response.text()),
      this.fetch("/transfer/speedLimitsMode").then((response) => response.text()),
    ])
    return this.mapSession(prefs, version, apiVersion, speedMode.trim() === "1")
  }

  async getApplicationPreferences(): Promise<ApplicationPreferences> {
    return this.get<ApplicationPreferences>("/app/preferences")
  }

  async setApplicationPreferences(preferences: Partial<ApplicationPreferences>): Promise<void> {
    if (!Object.keys(preferences).length) return
    await this.post("/app/setPreferences", { json: JSON.stringify(preferences) })
  }

  async setSession(args: Partial<Session>) {
    const mapped: Record<string, unknown> = {}
    const put = (uiKey: keyof Session, qbtKey: string, transform: (value: unknown) => unknown = (value) => value) => {
      if (uiKey in args) mapped[qbtKey] = transform(args[uiKey])
    }
    put("download-dir", "save_path")
    put("speed-limit-down", "dl_limit", (value) => Number(value) * 1024)
    put("speed-limit-up", "up_limit", (value) => Number(value) * 1024)
    put("alt-speed-down", "alt_dl_limit", (value) => Number(value) * 1024)
    put("alt-speed-up", "alt_up_limit", (value) => Number(value) * 1024)
    put("alt-speed-time-enabled", "scheduler_enabled")
    put("download-queue-enabled", "queueing_enabled")
    put("download-queue-size", "max_active_downloads")
    put("seed-queue-size", "max_active_uploads")
    put("peer-limit-global", "max_connec")
    put("peer-limit-per-torrent", "max_connec_per_torrent")
    put("peer-port", "listen_port")
    put("peer-port-random-on-start", "random_port")
    put("port-forwarding-enabled", "upnp")
    put("incomplete-dir", "temp_path")
    put("incomplete-dir-enabled", "temp_path_enabled")
    put("dht-enabled", "dht")
    put("pex-enabled", "pex")
    put("lpd-enabled", "lsd")
    put("rename-partial-files", "incomplete_files_ext")
    put("start-added-torrents", "start_paused_enabled", (value) => !value)
    if ("encryption" in args) mapped.encryption = args.encryption === "required" ? 1 : args.encryption === "tolerated" ? 2 : 0
    const jobs: Promise<unknown>[] = []
    if (Object.keys(mapped).length) jobs.push(this.setApplicationPreferences(mapped as Partial<ApplicationPreferences>))
    if ("alt-speed-enabled" in args) {
      jobs.push(this.fetch("/transfer/speedLimitsMode").then((response) => response.text()).then((mode) => {
        const enabled = mode.trim() === "1"
        return enabled === args["alt-speed-enabled"] ? undefined : this.post("/transfer/toggleSpeedLimitsMode")
      }))
    }
    await Promise.all(jobs)
    return {}
  }

  async getStats() {
    const [transfer, torrents] = await Promise.all([
      this.get<QbtTransferInfo>("/transfer/info"),
      this.get<QbtTorrentInfo[]>("/torrents/info"),
    ])
    const current = { downloadedBytes: transfer.dl_info_data ?? 0, uploadedBytes: transfer.up_info_data ?? 0, filesAdded: torrents.length, sessionCount: 1, secondsActive: 0 }
    return {
      activeTorrentCount: torrents.filter((item) => item.dlspeed > 0 || item.upspeed > 0).length,
      downloadSpeed: transfer.dl_info_speed ?? 0,
      pausedTorrentCount: torrents.filter((item) => STOPPED_STATES.has(item.state)).length,
      torrentCount: torrents.length,
      uploadSpeed: transfer.up_info_speed ?? 0,
      "current-stats": current,
      "cumulative-stats": { ...current },
    } satisfies SessionStats
  }

  async startTorrents(ids?: TorrentId[]) {
    return this.postActionWithLegacy("/torrents/start", "/torrents/resume", ids)
  }

  async stopTorrents(ids?: TorrentId[]) {
    return this.postActionWithLegacy("/torrents/stop", "/torrents/pause", ids)
  }

  async removeTorrents(ids: TorrentId[], deleteData = false) {
    await this.post("/torrents/delete", { hashes: this.hashes(ids), deleteFiles: deleteData })
    return {}
  }

  async addTorrent(args: TorrentAddArgs) {
    const form = new FormData()
    if (args.filename) form.append("urls", args.filename)
    if (args.metainfo) {
      const bytes = Uint8Array.from(atob(args.metainfo), (char) => char.charCodeAt(0))
      form.append("torrents", new Blob([bytes], { type: "application/x-bittorrent" }), "upload.torrent")
    }
    if (args["download-dir"]) form.append("savepath", args["download-dir"])
    if (args.paused !== undefined) {
      form.append("stopped", String(args.paused))
      form.append("paused", String(args.paused))
    }
    const values: Array<[string, string | number | boolean | undefined]> = [
      ["category", args.category],
      ["tags", args.tags?.join(",")],
      ["autoTMM", args.autoTMM],
      ["addToTopOfQueue", args.addToTopOfQueue],
      ["skip_checking", args.skipChecking],
      ["sequentialDownload", args.sequentialDownload],
      ["firstLastPiecePrio", args.firstLastPiecePrio],
      ["forced", args.forced],
      ["contentLayout", args.contentLayout],
      ["rename", args.rename],
      ["useDownloadPath", args.useDownloadPath],
      ["downloadPath", args.downloadPath],
      ["upLimit", args.upLimit],
      ["dlLimit", args.dlLimit],
      ["ratioLimit", args.ratioLimit],
      ["seedingTimeLimit", args.seedingTimeLimit],
      ["inactiveSeedingTimeLimit", args.inactiveSeedingTimeLimit],
      ["shareLimitAction", args.shareLimitAction],
      ["stopCondition", args.stopCondition],
      ["ssl_certificate", args.sslCertificate],
      ["ssl_private_key", args.sslPrivateKey],
      ["ssl_dh_params", args.sslDhParams],
    ]
    values.forEach(([key, value]) => {
      if (value !== undefined && value !== "") form.append(key, String(value))
    })
    const response = await this.fetch("/torrents/add", { method: "POST", body: form })
    const text = await response.text()
    if (!text.trim()) return {} as TorrentAddResponse
    try {
      return JSON.parse(text) as TorrentAddResponse
    } catch {
      return {} as TorrentAddResponse
    }
  }

  async getTorrentCategories(): Promise<Array<{ name: string; savePath: string; downloadPath?: string | boolean | null }>> {
    const categories = await this.get<Record<string, { name?: string; savePath?: string; downloadPath?: string | boolean | null }>>("/torrents/categories")
    return Object.entries(categories).map(([key, value]) => ({ name: value.name ?? key, savePath: value.savePath ?? "", downloadPath: value.downloadPath }))
  }

  async getTorrentTags(): Promise<string[]> {
    return this.get<string[]>("/torrents/tags")
  }

  async setForceStart(ids: TorrentId[], value: boolean) {
    await this.post("/torrents/setForceStart", { hashes: this.hashes(ids), value })
  }

  async toggleSequentialDownload(ids: TorrentId[]) {
    await this.post("/torrents/toggleSequentialDownload", { hashes: this.hashes(ids) })
  }

  async toggleFirstLastPiecePriority(ids: TorrentId[]) {
    await this.post("/torrents/toggleFirstLastPiecePrio", { hashes: this.hashes(ids) })
  }

  async setSuperSeeding(ids: TorrentId[], value: boolean) {
    await this.post("/torrents/setSuperSeeding", { hashes: this.hashes(ids), value })
  }

  async setAutoManagement(ids: TorrentId[], enable: boolean) {
    await this.post("/torrents/setAutoManagement", { hashes: this.hashes(ids), enable })
  }

  async changeQueuePriority(ids: TorrentId[], direction: "top" | "up" | "down" | "bottom") {
    const endpoints = { top: "topPrio", up: "increasePrio", down: "decreasePrio", bottom: "bottomPrio" }
    await this.post(`/torrents/${endpoints[direction]}`, { hashes: this.hashes(ids) })
  }

  async setTorrentSavePath(ids: TorrentId[], path: string) {
    await this.post("/torrents/setSavePath", { id: this.hashes(ids), path })
  }

  async setTorrentDownloadPath(ids: TorrentId[], path: string) {
    await this.post("/torrents/setDownloadPath", { id: this.hashes(ids), path })
  }

  async exportTorrent(id: TorrentId): Promise<{ blob: Blob; filename: string }> {
    const response = await this.fetch(`/torrents/export?hash=${encodeURIComponent(id)}`)
    return {
      blob: await response.blob(),
      filename: this.responseFilename(response, `${id}.torrent`),
    }
  }

  async createTorrent(args: TorrentCreatorArgs): Promise<{ taskID: string }> {
    const form = new FormData()
    form.set("sourcePath", args.sourcePath)
    form.set("format", args.format)
    form.set("pieceSize", String(args.pieceSize))
    form.set("private", String(args.private))
    form.set("startSeeding", String(args.startSeeding))
    form.set("trackers", this.torrentCreatorUrls(args.trackers))
    form.set("urlSeeds", this.torrentCreatorUrls(args.urlSeeds))
    form.set("comment", args.comment ?? "")
    form.set("source", args.source ?? "")
    const response = await this.fetch("/torrentcreator/addTask", { method: "POST", body: form })
    return response.json() as Promise<{ taskID: string }>
  }

  async getTorrentCreatorTask(taskID: string): Promise<TorrentCreatorTask> {
    const tasks = await this.get<TorrentCreatorTask[]>(`/torrentcreator/status?taskID=${encodeURIComponent(taskID)}`)
    if (!tasks[0]) throw new Error("Torrent creator task was not found")
    return tasks[0]
  }

  async downloadCreatedTorrent(taskID: string): Promise<{ blob: Blob; filename: string }> {
    const response = await this.fetch(`/torrentcreator/torrentFile?taskID=${encodeURIComponent(taskID)}`)
    return {
      blob: await response.blob(),
      filename: this.responseFilename(response, `${taskID}.torrent`),
    }
  }

  async deleteTorrentCreatorTask(taskID: string): Promise<void> {
    await this.post("/torrentcreator/deleteTask", { taskID })
  }

  async setTorrent(ids: TorrentId[], args: TorrentSetArgs) {
    const hashes = this.hashes(ids)
    const jobs: Promise<unknown>[] = []
    if (args.downloadLimit !== undefined || args.downloadLimited !== undefined) jobs.push(this.post("/torrents/setDownloadLimit", { hashes, limit: args.downloadLimited === false ? 0 : Math.max(0, Number(args.downloadLimit ?? 0) * 1024) }))
    if (args.uploadLimit !== undefined || args.uploadLimited !== undefined) jobs.push(this.post("/torrents/setUploadLimit", { hashes, limit: args.uploadLimited === false ? 0 : Math.max(0, Number(args.uploadLimit ?? 0) * 1024) }))
    if (args.seedRatioLimit !== undefined) jobs.push(this.post("/torrents/setShareLimits", { hashes, ratioLimit: args.seedRatioMode === 2 ? -2 : args.seedRatioMode === 0 ? -1 : args.seedRatioLimit, seedingTimeLimit: -1, inactiveSeedingTimeLimit: -1 }))
    if (args.labels) jobs.push(this.replaceTags(ids, parseTorrentLabels(args.labels)))
    if (args.trackerList !== undefined) jobs.push(...ids.map((id) => this.replaceTrackers(id, args.trackerList ?? "")))
    await Promise.all(jobs)
    return {}
  }

  async setFilePriority(id: TorrentId, fileIds: number[], priority: TorrentFilePriority) {
    if (!fileIds.length) return {}
    await this.post("/torrents/filePrio", {
      hash: id,
      id: fileIds.join("|"),
      priority,
    })
    return {}
  }

  async setTorrentLocation(ids: TorrentId[], location: string, _move: boolean = true) {
    void _move
    await this.post("/torrents/setLocation", { hashes: this.hashes(ids), location })
    return {}
  }

  async renameTorrentPath(id: TorrentId, _path: string, name: string) {
    await this.post("/torrents/rename", { hash: id, name })
    return {}
  }

  async freeSpace(path: string) {
    const data = await this.get<{ server_state?: { free_space_on_disk?: number } }>("/sync/maindata?rid=0")
    const free = data.server_state?.free_space_on_disk ?? 0
    return { path, "size-bytes": free, total_size: 0 } satisfies FreeSpaceResponse
  }
  
  async portTest() {
    const data = await this.get<QbtTransferInfo>("/transfer/info")
    return { "port-is-open": data.connection_status === "connected" }
  }

  async verifyTorrents(ids?: TorrentId[]) {
    await this.post("/torrents/recheck", { hashes: this.hashes(ids) })
    return {}
  }

  async reannounceTorrents(ids?: TorrentId[]) {
    await this.post("/torrents/reannounce", { hashes: this.hashes(ids) })
    return {}
  }

  private async postActionWithLegacy(primary: string, fallback: string, ids?: TorrentId[]): Promise<Record<string, never>> {
    try {
      await this.post(primary, { hashes: this.hashes(ids) })
    } catch (error) {
      if (!(error instanceof Error) || !/qBittorrent API (404|405)/.test(error.message)) throw error
      await this.post(fallback, { hashes: this.hashes(ids) })
    }
    return {}
  }

  private async replaceTags(ids: TorrentId[], desiredTags: string[]): Promise<void> {
    const summaries = await this.get<QbtTorrentInfo[]>(`/torrents/info?hashes=${encodeURIComponent(ids.join("|"))}`)
    await Promise.all(summaries.map(async (torrent) => {
      const current = torrent.tags ? torrent.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : []
      if (current.length) await this.post("/torrents/removeTags", { hashes: torrent.hash, tags: current.join(",") })
      if (desiredTags.length) await this.post("/torrents/addTags", { hashes: torrent.hash, tags: desiredTags.join(",") })
    }))
  }

  private async replaceTrackers(hash: TorrentId, trackerList: string): Promise<void> {
    const current = await this.get<Array<{ url: string }>>(`/torrents/trackers?hash=${encodeURIComponent(hash)}`)
    const currentUrls = current.map((item) => item.url).filter((url) => /^\w+:\/\//.test(url))
    const nextUrls = trackerList.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
    const shared = Math.min(currentUrls.length, nextUrls.length)
    for (let index = 0; index < shared; index++) {
      if (currentUrls[index] !== nextUrls[index]) await this.post("/torrents/editTracker", { hash, origUrl: currentUrls[index], newUrl: nextUrls[index] })
    }
    if (currentUrls.length > shared) await this.post("/torrents/removeTrackers", { hash, urls: currentUrls.slice(shared).join("|") })
    if (nextUrls.length > shared) await this.post("/torrents/addTrackers", { hash, urls: nextUrls.slice(shared).join("\n") })
  }

  private mapSession(prefs: Record<string, unknown>, version: string, apiVersion: string, alternativeSpeedEnabled: boolean): Session {
    const number = (key: string, fallback = 0) => Number(prefs[key] ?? fallback)
    const bool = (key: string, fallback = false) => Boolean(prefs[key] ?? fallback)
    const text = (key: string, fallback = "") => String(prefs[key] ?? fallback)
    const encryption = number("encryption") === 1 ? "required" : number("encryption") === 2 ? "tolerated" : "preferred"
    return {
      "alt-speed-down": Math.round(number("alt_dl_limit") / 1024), "alt-speed-enabled": alternativeSpeedEnabled, "alt-speed-up": Math.round(number("alt_up_limit") / 1024),
      "alt-speed-time-begin": 0, "alt-speed-time-enabled": bool("scheduler_enabled"), "alt-speed-time-end": 0, "alt-speed-time-day": 0,
      "download-dir": text("save_path"), "download-queue-enabled": bool("queueing_enabled"), "download-queue-size": number("max_active_downloads"),
      encryption, "peer-limit-global": number("max_connec"), "peer-limit-per-torrent": number("max_connec_per_torrent"), "peer-port": number("listen_port"),
      "peer-port-random-on-start": bool("random_port"), "port-forwarding-enabled": bool("upnp"), "rename-partial-files": bool("incomplete_files_ext"),
      "rpc-version": 2, "rpc-version-semver": apiVersion, "seed-queue-enabled": bool("queueing_enabled"), "seed-queue-size": number("max_active_uploads"),
      "speed-limit-down": Math.round(number("dl_limit") / 1024), "speed-limit-down-enabled": number("dl_limit") > 0, "speed-limit-up": Math.round(number("up_limit") / 1024),
      "speed-limit-up-enabled": number("up_limit") > 0, "start-added-torrents": !bool("start_paused_enabled"), "trash-original-torrent-files": false,
      units: { "speed-units": ["B/s", "KiB/s", "MiB/s", "GiB/s"], "speed-bytes": 1024, "size-units": ["B", "KiB", "MiB", "GiB", "TiB"], "size-bytes": 1024 },
      version, "dht-enabled": bool("dht"), "pex-enabled": bool("pex"), "lpd-enabled": bool("lsd"), "utp-enabled": true,
      "blocklist-enabled": false, "blocklist-url": "", "blocklist-size": 0, "incomplete-dir": text("temp_path"), "incomplete-dir-enabled": bool("temp_path_enabled"),
    }
  }
}

export const rpc = new QBittorrentRPC()
