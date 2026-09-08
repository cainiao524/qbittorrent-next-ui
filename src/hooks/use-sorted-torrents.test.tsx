import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useSortedTorrents } from "./use-sorted-torrents"
import type { Torrent } from "@/lib/rpc-types"
import type { TorrentSortResponse } from "@/lib/torrent-sort"

afterEach(() => vi.unstubAllGlobals())

test("后台处理全量输入，忽略过期结果并在退出时终止线程", () => {
  const workers: FakeWorker[] = []
  class FakeWorker {
    onmessage?: (event: { data: TorrentSortResponse }) => void
    onerror?: () => void
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() { workers.push(this) }
  }
  vi.stubGlobal("Worker", FakeWorker)
  const torrents = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), addedDate: i } as Torrent))
  const config = { key: "addedDate", direction: "desc" } as const
  const { result, rerender, unmount } = renderHook(({ data }) => useSortedTorrents(data, config), { initialProps: { data: torrents } })
  expect(workers[0].postMessage.mock.calls[0][0].entries).toHaveLength(2000)
  const ids = torrents.map(t => t.id).reverse()
  const firstId = workers[0].postMessage.mock.calls[0][0].requestId
  act(() => workers[0].onmessage?.({ data: { requestId: firstId, ids } }))
  expect(result.current[0]).toBe(torrents[1999])
  const newer = torrents.map(t => ({ ...t, name: "新快照" }))
  rerender({ data: newer })
  act(() => workers[0].onmessage?.({ data: { requestId: firstId, ids: [] } }))
  expect(result.current).toHaveLength(2000)
  expect(workers).toHaveLength(1)
  expect(workers[0].terminate).not.toHaveBeenCalled()
  const secondId = workers[0].postMessage.mock.calls[1][0].requestId
  act(() => workers[0].onmessage?.({ data: { requestId: secondId, ids } }))
  expect(result.current[0]).toBe(newer[1999])
  unmount()
  expect(workers[0].terminate).toHaveBeenCalledOnce()
})

test("不支持后台线程时仍对全部任务排序", () => {
  vi.stubGlobal("Worker", undefined)
  const torrents = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), addedDate: i } as Torrent))
  const { result } = renderHook(() => useSortedTorrents(torrents, { key: "addedDate", direction: "desc" }))
  expect(result.current).toHaveLength(2000)
  expect(result.current[0].addedDate).toBe(1999)
})

test("线程繁忙时合并中间快照，只提交最新全量输入和排序方向", () => {
  const sent = vi.fn()
  const terminate = vi.fn()
  let reply: ((event: { data: TorrentSortResponse }) => void) | undefined
  vi.stubGlobal("Worker", class {
    set onmessage(callback: typeof reply) { reply = callback }
    postMessage = sent
    terminate = terminate
  })
  const torrents = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), addedDate: i } as Torrent))
  const { result, rerender } = renderHook(({ data, direction }: { data: Torrent[]; direction: "asc" | "desc" }) =>
    useSortedTorrents(data, { key: "addedDate", direction }),
    { initialProps: { data: torrents, direction: "asc" as "asc" | "desc" } })
  const firstId = sent.mock.calls[0][0].requestId
  const newer = torrents.map(torrent => ({ ...torrent, name: "中间数据" }))
  rerender({ data: newer, direction: "asc" })
  const latest = torrents.map(torrent => ({ ...torrent, name: "最新数据" }))
  rerender({ data: latest, direction: "desc" })
  expect(sent).toHaveBeenCalledOnce()
  act(() => reply?.({ data: { requestId: firstId, ids: torrents.map(t => t.id) } }))
  expect(result.current).toHaveLength(0)
  expect(sent).toHaveBeenCalledTimes(2)
  expect(sent.mock.calls[1][0].entries).toHaveLength(2000)
  expect(sent.mock.calls[1][0].direction).toBe("desc")
  act(() => reply?.({ data: { requestId: sent.mock.calls[1][0].requestId, ids: latest.map(t => t.id).reverse() } }))
  expect(result.current).toHaveLength(2000)
  expect(result.current[0]).toBe(latest[1999])
  expect(terminate).not.toHaveBeenCalled()
})

test("线程失败使用最新待排快照回退，不返回中间数据", () => {
  let fail: (() => void) | undefined
  const terminate = vi.fn()
  vi.stubGlobal("Worker", class {
    set onerror(callback: typeof fail) { fail = callback }
    postMessage = vi.fn()
    terminate = terminate
  })
  const torrents = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), addedDate: i } as Torrent))
  const config = { key: "addedDate", direction: "desc" } as const
  const { result, rerender } = renderHook(({ data }) => useSortedTorrents(data, config), { initialProps: { data: torrents } })
  const latest = torrents.map(torrent => ({ ...torrent, name: "最新数据" }))
  rerender({ data: latest })
  act(() => fail?.())
  expect(result.current).toHaveLength(2000)
  expect(result.current[0]).toBe(latest[1999])
  expect(terminate).toHaveBeenCalledOnce()
})

test("退出大列表模式立即释放线程，迟到消息不能覆盖同步排序", () => {
  let reply: ((event: { data: TorrentSortResponse }) => void) | undefined
  const terminate = vi.fn()
  const sent = vi.fn()
  vi.stubGlobal("Worker", class {
    set onmessage(callback: typeof reply) { reply = callback }
    postMessage = sent
    terminate = terminate
  })
  const torrents = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), addedDate: i } as Torrent))
  const config = { key: "addedDate", direction: "desc" } as const
  const { result, rerender } = renderHook(({ data }) => useSortedTorrents(data, config), { initialProps: { data: torrents } })
  rerender({ data: torrents.slice(0, 20) })
  expect(terminate).toHaveBeenCalledOnce()
  act(() => reply?.({ data: { requestId: sent.mock.calls[0][0].requestId, ids: [] } }))
  expect(result.current).toHaveLength(20)
  expect(result.current[0]).toBe(torrents[19])
})
