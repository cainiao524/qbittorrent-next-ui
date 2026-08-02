import { beforeEach, describe, expect, test, vi } from "vitest"
import { rpc } from "./rpc-client"

function createResponse(body: unknown, status = 200) {
  return {
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response
}

describe("qBittorrent Web API adapter", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  test("logs in with cookie credentials", async () => {
    fetchMock.mockResolvedValueOnce(createResponse("Ok."))

    await rpc.login("admin", "secret")

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v2/auth/login")
    expect(options.credentials).toBe("include")
    expect(String(options.body)).toContain("username=admin")
    expect(String(options.body)).toContain("password=secret")
  })

  test("maps qBittorrent torrent summaries to the UI model", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([{
      hash: "abc123",
      name: "Ubuntu.iso",
      state: "downloading",
      size: 1024,
      total_size: 2048,
      progress: 0.5,
      dlspeed: 100,
      upspeed: 20,
      eta: 60,
      added_on: 1000,
      completion_on: 0,
      last_activity: 1001,
      save_path: "/downloads",
      amount_left: 1024,
      uploaded: 50,
      downloaded: 1024,
      ratio: 0.05,
      tags: "linux, iso",
      category: "images",
      priority: 1,
      tracker: "https://tracker.example/announce",
      num_complete: 8,
      num_incomplete: 3,
      num_leechs: 2,
      num_seeds: 4,
      force_start: true,
      super_seeding: false,
      auto_tmm: true,
      ratio_limit: -2,
      seeding_time_limit: 120,
      inactive_seeding_time_limit: -1,
      share_limit_action: "Stop",
    }]))

    const result = await rpc.getTorrents(["name", "status"])

    expect(result.torrents[0]).toMatchObject({
      id: "abc123",
      hashString: "abc123",
      name: "Ubuntu.iso",
      status: 4,
      totalSize: 2048,
      percentDone: 0.5,
      labels: ["linux", "iso"],
      category: "images",
      forceStart: true,
      autoManagement: true,
      seedRatioMode: 2,
      seedingTimeLimit: 120,
      seedingTimeMode: 1,
      inactiveSeedingTimeMode: 0,
      shareLimitAction: "Stop",
    })
  })

  test("falls back to the qBittorrent 4 pause endpoint", async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse("Not Found", 404))
      .mockResolvedValueOnce(createResponse(""))

    await rpc.stopTorrents(["abc123"])

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v2/torrents/stop",
      "/api/v2/torrents/pause",
    ])
    expect(String(fetchMock.mock.calls[1][1].body)).toBe("hashes=abc123")
  })

  test("保留文件编号和四档下载优先级", async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse([{
        hash: "abc123",
        name: "示例种子",
        state: "downloading",
        size: 120,
        total_size: 120,
        progress: 0.5,
        dlspeed: 0,
        upspeed: 0,
        eta: 60,
        added_on: 0,
        completion_on: 0,
        last_activity: 0,
        save_path: "/downloads",
        amount_left: 60,
        uploaded: 0,
        downloaded: 60,
        ratio: 0,
        tags: "",
        category: "",
        priority: 0,
        tracker: "",
        num_complete: 0,
        num_incomplete: 0,
        num_leechs: 0,
        num_seeds: 0,
      }]))
      .mockResolvedValueOnce(createResponse([
        { index: 3, name: "目录/视频.mkv", size: 100, progress: 0.5, priority: 7 },
        { index: 8, name: "目录/说明.txt", size: 20, progress: 1, priority: 0 },
      ]))

    const result = await rpc.getTorrents(["files"], ["abc123"])

    expect(result.torrents[0].files).toEqual([
      { index: 3, name: "目录/视频.mkv", length: 100, bytesCompleted: 50, priority: 7 },
      { index: 8, name: "目录/说明.txt", length: 20, bytesCompleted: 20, priority: 0 },
    ])
  })

  test("可批量设置文件下载优先级", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(""))

    await rpc.setFilePriority("abc123", [2, 5, 9], 6)

    const [url, options] = fetchMock.mock.calls[0]
    const body = new URLSearchParams(String(options.body))
    expect(url).toBe("/api/v2/torrents/filePrio")
    expect(body.get("hash")).toBe("abc123")
    expect(body.get("id")).toBe("2|5|9")
    expect(body.get("priority")).toBe("6")
  })

  test("reads and writes all application preferences without dropping unknown fields", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({
      dht: true,
      web_ui_port: 8080,
      scan_dirs: { "/watch": 0 },
      future_version_setting: "preserved",
    }))

    const preferences = await rpc.getApplicationPreferences()

    expect(preferences).toEqual({
      dht: true,
      web_ui_port: 8080,
      scan_dirs: { "/watch": 0 },
      future_version_setting: "preserved",
    })

    fetchMock.mockResolvedValueOnce(createResponse(""))
    await rpc.setApplicationPreferences({
      dht: false,
      web_ui_port: 9090,
      scan_dirs: { "/watch": "/downloads" },
    })

    const [url, options] = fetchMock.mock.calls[1]
    const body = new URLSearchParams(String(options.body))
    expect(url).toBe("/api/v2/app/setPreferences")
    expect(JSON.parse(body.get("json") ?? "{}")).toEqual({
      dht: false,
      web_ui_port: 9090,
      scan_dirs: { "/watch": "/downloads" },
    })
  })

  test("大型种子的文件优先级请求会自动分批", async () => {
    fetchMock.mockResolvedValue(createResponse(""))
    const ids = Array.from({ length: 9001 }, (_, index) => index)

    await rpc.setFilePriority("abc123", ids, 7)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const chunkSizes = fetchMock.mock.calls.map(([, options]) => new URLSearchParams(String(options.body)).get("id")?.split("|").length)
    expect(chunkSizes).toEqual([4000, 4000, 1001])
  })

  test("creates a torrent with the qBittorrent 5.2 torrent creator API", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ taskID: "task-1" }))

    await expect(rpc.createTorrent({
      sourcePath: "/downloads/example",
      format: "hybrid",
      pieceSize: 0,
      private: true,
      startSeeding: false,
      trackers: "https://tracker.example/announce\n\nudp://tracker.example:80",
    })).resolves.toEqual({ taskID: "task-1" })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v2/torrentcreator/addTask")
    expect(options.method).toBe("POST")
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get("sourcePath")).toBe("/downloads/example")
    expect(options.body.get("private")).toBe("true")
    expect(options.body.get("trackers")).toBe("https%3A%2F%2Ftracker.example%2Fannounce||udp%3A%2F%2Ftracker.example%3A80")
  })

  test("提交完整的高级添加种子参数", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ success_count: 1, added_torrent_ids: ["abc123"] }))

    const response = await rpc.addTorrent({
      filename: "magnet:?xt=urn:btih:abc123",
      "download-dir": "/downloads/complete",
      paused: false,
      category: "影视",
      tags: ["高清", "收藏"],
      autoTMM: false,
      addToTopOfQueue: true,
      skipChecking: true,
      sequentialDownload: true,
      firstLastPiecePrio: true,
      forced: true,
      contentLayout: "Subfolder",
      rename: "示例任务",
      useDownloadPath: true,
      downloadPath: "/downloads/incomplete",
      upLimit: 1024,
      dlLimit: 2048,
      ratioLimit: 2,
      seedingTimeLimit: 60,
      inactiveSeedingTimeLimit: 30,
      shareLimitAction: "Stop",
      stopCondition: "FilesChecked",
      sslCertificate: "certificate",
      sslPrivateKey: "private-key",
      sslDhParams: "dh-params",
    })

    const [url, options] = fetchMock.mock.calls[0]
    const body = options.body as FormData
    expect(url).toBe("/api/v2/torrents/add")
    expect(body.get("savepath")).toBe("/downloads/complete")
    expect(body.get("tags")).toBe("高清,收藏")
    expect(body.get("skip_checking")).toBe("true")
    expect(body.get("contentLayout")).toBe("Subfolder")
    expect(body.get("downloadPath")).toBe("/downloads/incomplete")
    expect(body.get("ssl_certificate")).toBe("certificate")
    expect(response.added_torrent_ids).toEqual(["abc123"])
  })

  test("调用高级任务控制和独立路径接口", async () => {
    fetchMock.mockResolvedValue(createResponse(""))

    await rpc.setForceStart(["a", "b"], true)
    await rpc.toggleSequentialDownload(["a"])
    await rpc.toggleFirstLastPiecePriority(["a"])
    await rpc.setSuperSeeding(["a"], false)
    await rpc.setAutoManagement(["a"], true)
    await rpc.changeQueuePriority(["a"], "top")
    await rpc.setTorrentSavePath(["a"], "/complete")
    await rpc.setTorrentDownloadPath(["a"], "/incomplete")

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v2/torrents/setForceStart",
      "/api/v2/torrents/toggleSequentialDownload",
      "/api/v2/torrents/toggleFirstLastPiecePrio",
      "/api/v2/torrents/setSuperSeeding",
      "/api/v2/torrents/setAutoManagement",
      "/api/v2/torrents/topPrio",
      "/api/v2/torrents/setSavePath",
      "/api/v2/torrents/setDownloadPath",
    ])
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("hashes=a%7Cb")
    expect(String(fetchMock.mock.calls[6][1].body)).toBe("id=a&path=%2Fcomplete")
  })

  test("提交完整的分享限制三态和达到限制后的动作", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(""))

    await rpc.setTorrent(["abc123"], {
      seedRatioLimit: 1.5,
      seedRatioMode: 1,
      seedingTimeLimit: 120,
      seedingTimeMode: 0,
      inactiveSeedingTimeLimit: 30,
      inactiveSeedingTimeMode: 2,
      shareLimitAction: "Remove",
    })

    const [url, options] = fetchMock.mock.calls[0]
    const body = new URLSearchParams(String(options.body))
    expect(url).toBe("/api/v2/torrents/setShareLimits")
    expect(body.get("ratioLimit")).toBe("1.5")
    expect(body.get("seedingTimeLimit")).toBe("-1")
    expect(body.get("inactiveSeedingTimeLimit")).toBe("-2")
    expect(body.get("shareLimitAction")).toBe("Remove")
  })
})
