import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useSortedTorrents } from "./use-sorted-torrents"
import type { Torrent } from "@/lib/rpc-types"

afterEach(() => vi.unstubAllGlobals())

test("后台处理全量输入，忽略过期结果并在退出时终止线程", () => {
  const workers: FakeWorker[] = []
  class FakeWorker {
    onmessage?: (event: { data: string[] }) => void
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
  act(() => workers[0].onmessage?.({ data: ids }))
  expect(result.current[0]).toBe(torrents[1999])
  const newer = torrents.map(t => ({ ...t, name: "新快照" }))
  rerender({ data: newer })
  act(() => workers[0].onmessage?.({ data: [] }))
  expect(result.current).toHaveLength(2000)
  act(() => workers[1].onmessage?.({ data: ids }))
  expect(result.current[0]).toBe(newer[1999])
  unmount()
  expect(workers[1].terminate).toHaveBeenCalled()
})

test("不支持后台线程时仍对全部任务排序", () => {
  vi.stubGlobal("Worker", undefined)
  const torrents = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), addedDate: i } as Torrent))
  const { result } = renderHook(() => useSortedTorrents(torrents, { key: "addedDate", direction: "desc" }))
  expect(result.current).toHaveLength(2000)
  expect(result.current[0].addedDate).toBe(1999)
})
