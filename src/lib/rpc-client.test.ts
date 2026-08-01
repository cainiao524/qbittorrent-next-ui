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
})
