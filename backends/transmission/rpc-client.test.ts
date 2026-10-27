import { beforeEach, describe, expect, test, vi } from "vitest"

const success = (args: object = {}) => new Response(JSON.stringify({ result: "success", arguments: args }), {
  status: 200,
  headers: { "Content-Type": "application/json" },
})

describe("Transmission RPC 适配层", () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal("fetch", vi.fn())
  })

  test("遇到 409 时读取会话编号并重试", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, {
        status: 409,
        headers: { "X-Transmission-Session-Id": "rpc-session" },
      }))
      .mockResolvedValueOnce(success({ version: "4.0.6" }))

    const { rpc } = await import("./rpc-client")
    const session = await rpc.getSession()

    expect(session.version).toBe("4.0.6")
    expect(fetch).toHaveBeenCalledTimes(2)
    const secondRequest = vi.mocked(fetch).mock.calls[1][1] as RequestInit
    expect(secondRequest.headers).toMatchObject({ "X-Transmission-Session-Id": "rpc-session" })
  })

  test("内网登录后保存认证信息以便下次自动登录", async () => {
    vi.mocked(fetch).mockResolvedValue(success({ version: "4.0.6" }))
    const { rpc } = await import("./rpc-client")

    await rpc.login("user", "pass")

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(request.headers).toMatchObject({ Authorization: `Basic ${btoa("user:pass")}` })
    expect(localStorage.getItem("transmission_basic_auth")).toBeNull()
    expect(localStorage.getItem("transmission_lan_auth")).toBe(`Basic ${btoa("user:pass")}`)
  })

  test("重新打开页面时使用内网保存的认证信息", async () => {
    const authorization = `Basic ${btoa("user:pass")}`
    localStorage.setItem("transmission_lan_auth", authorization)
    vi.mocked(fetch).mockResolvedValue(success({ version: "4.0.6" }))

    const { rpc } = await import("./rpc-client")
    await expect(rpc.checkAuthentication()).resolves.toBe(true)

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(request.headers).toMatchObject({ Authorization: authorization })
  })

  test("内网主动退出后保留下一次打开所需的认证信息", async () => {
    vi.mocked(fetch).mockResolvedValue(success({ version: "4.0.6" }))
    const { rpc } = await import("./rpc-client")

    await rpc.login("user", "pass")
    await rpc.logout()

    expect(localStorage.getItem("transmission_lan_auth")).toBe(`Basic ${btoa("user:pass")}`)
  })

  test("加载时清理旧版本遗留的 WebUI 凭据", async () => {
    localStorage.setItem("transmission_basic_auth", "legacy-local")
    sessionStorage.setItem("transmission_basic_auth", "legacy-session")

    await import("./rpc-client")

    expect(localStorage.getItem("transmission_basic_auth")).toBeNull()
    expect(sessionStorage.getItem("transmission_basic_auth")).toBeNull()
  })

  test("提交官方可写会话属性并过滤只读服务器信息", async () => {
    vi.mocked(fetch).mockResolvedValue(success())
    const { rpc } = await import("./rpc-client")

    await rpc.setApplicationPreferences({
      "seed-ratio-limited": true,
      "seed-ratio-limit": 2,
      "script-torrent-done-enabled": true,
      version: "4.1.3",
      "rpc-version-semver": "18.0.0",
      "session-id": "server-owned",
    })

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(request.body as string)).toMatchObject({
      method: "session-set",
      arguments: {
        "seed-ratio-limited": true,
        "seed-ratio-limit": 2,
        "script-torrent-done-enabled": true,
      },
    })
    expect(JSON.parse(request.body as string).arguments).not.toHaveProperty("version")
    expect(JSON.parse(request.body as string).arguments).not.toHaveProperty("rpc-version-semver")
    expect(JSON.parse(request.body as string).arguments).not.toHaveProperty("session-id")
  })

  test("合并文件与文件状态并转换优先级", async () => {
    vi.mocked(fetch).mockResolvedValue(success({
      torrents: [{
        id: 9,
        name: "示例",
        hashString: "abc",
        status: 4,
        totalSize: 30,
        percentDone: 0.5,
        files: [{ name: "目录/a.bin", length: 10 }, { name: "目录/b.bin", length: 20 }],
        fileStats: [{ bytesCompleted: 5, wanted: true, priority: 1 }, { bytesCompleted: 0, wanted: false, priority: 0 }],
      }],
    }))
    const { rpc } = await import("./rpc-client")

    const result = await rpc.getTorrents(["files"])

    expect(result.torrents[0].id).toBe("abc")
    expect(result.torrents[0].files).toEqual([
      { index: 0, name: "目录/a.bin", length: 10, bytesCompleted: 5, priority: 6 },
      { index: 1, name: "目录/b.bin", length: 20, bytesCompleted: 0, priority: 0 },
    ])
  })

  test("未请求文件字段时保持 files 未定义", async () => {
    vi.mocked(fetch).mockResolvedValue(success({
      torrents: [{ id: 9, name: "示例", hashString: "abc", status: 4 }],
    }))
    const { rpc } = await import("./rpc-client")

    const result = await rpc.getTorrents([])

    expect(result.torrents[0].files).toBeUndefined()
  })

  test("文件不下载优先级映射到 files-unwanted", async () => {
    vi.mocked(fetch).mockResolvedValue(success())
    const { rpc } = await import("./rpc-client")

    await rpc.setFilePriority("9", [1, 3], 0)

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(request.body as string)).toMatchObject({
      method: "torrent-set",
      arguments: { ids: ["9"], "files-unwanted": [1, 3] },
    })
  })

  test("添加种子时直接提交未选择的文件编号", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(success({ "torrent-added": { id: 9, hashString: "abc" } }))
      .mockResolvedValueOnce(success())
    const { rpc } = await import("./rpc-client")

    await rpc.addTorrent({
      metainfo: "encoded-torrent",
      torrentId: "unused-by-transmission",
      "files-unwanted": [1, 3],
      paused: false,
    })

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(request.body as string)).toMatchObject({
      method: "torrent-add",
      arguments: {
        metainfo: "encoded-torrent",
        paused: false,
        "files-unwanted": [1, 3],
      },
    })
  })

  test("队列移动调用 Transmission 对应方法", async () => {
    vi.mocked(fetch).mockResolvedValue(success())
    const { rpc } = await import("./rpc-client")

    await rpc.changeQueuePriority(["9"], "top")

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(request.body as string)).toMatchObject({ method: "queue-move-top", arguments: { ids: ["9"] } })
  })

  test("读取并解码 Transmission 文件块位图", async () => {
    const pieces = btoa(String.fromCharCode(0b10110000, 0b10000000))
    vi.mocked(fetch).mockResolvedValue(success({
      torrents: [{ pieceCount: 10, pieces }],
    }))
    const { rpc } = await import("./rpc-client")

    await expect(rpc.getTorrentPieceStates("abc")).resolves.toEqual([2, 0, 2, 2, 0, 0, 0, 0, 2, 0])

    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(request.body as string)).toMatchObject({
      method: "torrent-get",
      arguments: { ids: ["abc"], fields: ["pieceCount", "pieces"] },
    })
  })

  test("保留 Transmission 扩展返回的用户国家和地区信息", async () => {
    vi.mocked(fetch).mockResolvedValue(success({
      torrents: [{
        id: 9,
        hashString: "abc",
        peers: [{
          address: "203.0.113.8",
          clientName: "Transmission 4.0.6",
          country: "Japan",
          countryCode: "JP",
          rateToClient: 1024,
          rateToPeer: 512,
          progress: 0.75,
          isEncrypted: true,
        }],
      }],
    }))
    const { rpc } = await import("./rpc-client")

    const result = await rpc.getTorrents(["peers"], ["abc"])

    expect(result.torrents[0].peers?.[0]).toMatchObject({
      country: "Japan",
      countryCode: "JP",
    })
  })
})
