import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { rpc } from "@/lib/rpc-client"
import { useTorrentData } from "./use-torrent-data"

const settings = { refreshInterval: 500, autoRefresh: true }
const visibleColumns = ["name"]

vi.mock("@/lib/app-settings-context", () => ({
  useAppSettings: () => settings,
}))

vi.mock("@/lib/rpc-client", () => ({
  rpc: {
    getTorrents: vi.fn(),
    getStats: vi.fn(),
    getSession: vi.fn(),
    freeSpace: vi.fn(),
  },
}))

const torrentResponse = { torrents: [] }
const statsResponse = {
  activeTorrentCount: 0,
  pausedTorrentCount: 0,
  torrentCount: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  "cumulative-stats": { downloadedBytes: 0, uploadedBytes: 0, filesAdded: 0, sessionCount: 0, secondsActive: 0 },
  "current-stats": { downloadedBytes: 0, uploadedBytes: 0, filesAdded: 0, sessionCount: 0, secondsActive: 0 },
}
const sessionResponse = {} as Awaited<ReturnType<typeof rpc.getSession>>

describe("useTorrentData polling", () => {
  const rpcMock = vi.mocked(rpc)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    settings.refreshInterval = 500
    settings.autoRefresh = true
    rpcMock.getTorrents.mockResolvedValue(torrentResponse)
    rpcMock.getStats.mockResolvedValue(statsResponse)
    rpcMock.getSession.mockResolvedValue(sessionResponse)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("does not request data while the view is inactive", async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useTorrentData("list", visibleColumns, enabled),
      { initialProps: { enabled: false } },
    )

    await act(async () => {})
    expect(rpcMock.getTorrents).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await act(async () => {})
    expect(rpcMock.getTorrents).toHaveBeenCalledOnce()
  })

  test("schedules the next refresh only after the current request finishes", async () => {
    let resolveFirstRequest!: (value: typeof torrentResponse) => void
    rpcMock.getTorrents.mockReturnValueOnce(new Promise((resolve) => {
      resolveFirstRequest = resolve
    }))

    renderHook(() => useTorrentData("list", visibleColumns))
    await act(async () => {})
    expect(rpcMock.getTorrents).toHaveBeenCalledOnce()

    await act(async () => vi.advanceTimersByTimeAsync(1000))
    expect(rpcMock.getTorrents).toHaveBeenCalledOnce()

    await act(async () => {
      resolveFirstRequest(torrentResponse)
      await Promise.resolve()
    })
    await act(async () => vi.advanceTimersByTimeAsync(499))
    expect(rpcMock.getTorrents).toHaveBeenCalledOnce()

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(rpcMock.getTorrents).toHaveBeenCalledTimes(2)
  })

  test("uses refresh intervals below 500ms without clamping", async () => {
    settings.refreshInterval = 100
    renderHook(() => useTorrentData("list", visibleColumns))
    await act(async () => {})

    await act(async () => vi.advanceTimersByTimeAsync(99))
    expect(rpcMock.getTorrents).toHaveBeenCalledOnce()

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(rpcMock.getTorrents).toHaveBeenCalledTimes(2)
  })

  test("coalesces data updates while scrolling and commits the latest snapshot after scrolling", async () => {
    settings.autoRefresh = false
    const { result } = renderHook(() => useTorrentData("list", visibleColumns))
    await act(async () => {})

    const nextStats = { ...statsResponse, downloadSpeed: 1024 }
    rpcMock.getStats.mockResolvedValueOnce(nextStats)

    await act(async () => {
      window.dispatchEvent(new Event("scroll"))
      await result.current.fetchData()
    })
    expect(result.current.stats?.downloadSpeed).toBe(0)

    await act(async () => vi.advanceTimersByTimeAsync(119))
    expect(result.current.stats?.downloadSpeed).toBe(0)

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(result.current.stats?.downloadSpeed).toBe(1024)
  })
})
