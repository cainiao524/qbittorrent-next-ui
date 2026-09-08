import * as React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog"

function DialogHarness({ onCloseComplete }: { onCloseComplete?: () => void }) {
  const [open, setOpen] = React.useState(true)
  return (
    <I18nProvider>
      <Dialog open={open} onOpenChange={setOpen} onCloseComplete={onCloseComplete}>
        <DialogContent>
          <DialogTitle>Motion test</DialogTitle>
          <button type="button" onClick={() => setOpen(false)}>Close test dialog</button>
        </DialogContent>
      </Dialog>
    </I18nProvider>
  )
}

describe("Dialog exit motion", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test("业务拒绝关闭时不播放退场", async () => {
    const requestClose = vi.fn()
    render(<I18nProvider><Dialog open onOpenChange={requestClose}><DialogContent>
      <DialogTitle>忙碌弹窗</DialogTitle><DialogClose>关闭</DialogClose>
    </DialogContent></Dialog></I18nProvider>)
    fireEvent.click(screen.getByRole("button", { name: "关闭" }))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(requestClose).toHaveBeenCalledWith(false)
    expect(screen.getByRole("dialog")).toHaveAttribute("data-closing", "false")
  })

  test("带真实动画名称的节点在退场后卸载，不再次入场", async () => {
    const computedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, "getComputedStyle").mockImplementation(element => {
      const styles = computedStyle(element)
      Object.defineProperty(styles, "animationName", { configurable: true, get: () =>
        element.getAttribute("data-slot")?.startsWith("dialog-")
          ? element.getAttribute("data-closing") === "true" ? "exit" : "enter"
          : "none" })
      return styles
    })
    render(<DialogHarness />)
    const dialog = screen.getByRole("dialog")
    fireEvent.animationStart(dialog)
    fireEvent.click(screen.getByRole("button", { name: "Close test dialog" }))
    fireEvent.animationStart(dialog)
    expect(dialog).toHaveAttribute("data-closing", "true")
    await act(async () => vi.advanceTimersByTimeAsync(200))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  test("重新打开取消旧关闭回调，回调更新不延长退场", async () => {
    const first = vi.fn(), second = vi.fn()
    const ui = (open: boolean, callback: () => void) => <I18nProvider><Dialog open={open} onCloseComplete={callback}>
      <DialogContent><DialogTitle>测试</DialogTitle></DialogContent>
    </Dialog></I18nProvider>
    const { rerender } = render(ui(true, first))
    rerender(ui(false, first))
    await act(async () => vi.advanceTimersByTimeAsync(100))
    rerender(ui(true, second))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    rerender(ui(false, first))
    await act(async () => vi.advanceTimersByTimeAsync(100))
    rerender(ui(false, second))
    await act(async () => vi.advanceTimersByTimeAsync(100))
    expect(second).toHaveBeenCalledOnce()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  test("keeps content mounted until the closing animation finishes", async () => {
    render(<DialogHarness />)
    fireEvent.click(screen.getByRole("button", { name: "Close test dialog" }))

    await act(async () => vi.advanceTimersByTimeAsync(199))
    expect(screen.getByRole("dialog")).toHaveAttribute("data-closing", "true")

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  test("calls the close completion callback after the exit animation", async () => {
    const onCloseComplete = vi.fn()
    render(<DialogHarness onCloseComplete={onCloseComplete} />)
    fireEvent.click(screen.getByRole("button", { name: "Close test dialog" }))

    expect(onCloseComplete).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTimeAsync(199))
    expect(onCloseComplete).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(onCloseComplete).toHaveBeenCalledOnce()
  })
})
