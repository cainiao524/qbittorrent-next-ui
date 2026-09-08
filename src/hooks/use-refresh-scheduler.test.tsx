import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRefreshScheduler } from "./use-refresh-scheduler"

describe("分层刷新调度", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(document, "hidden", { configurable: true, value: false })
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  it("保留用户的 100 毫秒间隔并支持关闭自动刷新", async () => {
    const load = vi.fn(async () => {})
    const { result, rerender, unmount } = renderHook(({ automatic }) => useRefreshScheduler(load, 100, automatic), { initialProps: { automatic: true } })
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    expect(load).toHaveBeenCalledTimes(3)
    rerender({ automatic: false })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(load).toHaveBeenCalledTimes(4)
    await act(async () => { await result.current() })
    expect(load).toHaveBeenCalledTimes(5)
    unmount()
  })
  it("慢请求和手动刷新合并，隐藏取消，恢复立即刷新", async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<void>(resolve => signal.addEventListener("abort", () => resolve()))
    })
    const { result, unmount } = renderHook(() => useRefreshScheduler(load, 100, true))
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); void result.current() })
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true })
      document.dispatchEvent(new Event("visibilitychange"))
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(signals[0].aborted).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false })
      document.dispatchEvent(new Event("visibilitychange"))
    })
    expect(load).toHaveBeenCalledTimes(2)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })
  it("失败退避，成功恢复设置间隔", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const load = vi.fn().mockRejectedValueOnce(new Error("离线")).mockResolvedValue(undefined)
    const { unmount } = renderHook(() => useRefreshScheduler(load, 100, true))
    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(101) })
    expect(load).toHaveBeenCalledTimes(3)
    unmount()
  })
})
