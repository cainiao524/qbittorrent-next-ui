import { useState } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { RemoveTorrentDialog } from "./remove-torrent-dialog"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test("删除成功后退场保留提交状态和批量数量，完成后才清理", async () => {
  const complete = vi.fn()
  function Harness() {
    const [open, setOpen] = useState(true)
    const [count, setCount] = useState(3)
    return <I18nProvider><RemoveTorrentDialog open={open} count={count} onOpenChange={setOpen}
      onConfirm={async () => setOpen(false)} onCloseComplete={() => { setCount(0); complete() }} /></I18nProvider>
  }
  render(<Harness />)
  const textBefore = screen.getByRole("dialog").textContent
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove" })))
  expect(screen.getByRole("button", { name: "Removing..." })).toBeDisabled()
  await act(async () => vi.advanceTimersByTimeAsync(199))
  expect(screen.getByRole("dialog").textContent?.replace("Removing...", "Remove")).toBe(textBefore)
  expect(complete).not.toHaveBeenCalled()
  await act(async () => vi.advanceTimersByTimeAsync(1))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(complete).toHaveBeenCalledOnce()
})

test("失败保留弹窗并恢复重试按钮", async () => {
  const change = vi.fn()
  render(<I18nProvider><RemoveTorrentDialog open count={1} onOpenChange={change}
    onConfirm={async () => { throw new Error("请求失败") }} /></I18nProvider>)
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove" })))
  expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled()
  expect(change).not.toHaveBeenCalled()
})
