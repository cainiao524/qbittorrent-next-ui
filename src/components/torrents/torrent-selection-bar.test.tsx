import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { TorrentSelectionBar } from "./torrent-selection-bar"

vi.mock("./advanced-torrent-menu", () => ({ AdvancedTorrentMenu: ({ trigger }: { trigger: React.ReactNode }) => trigger }))

function renderBar(selected: string[], total: number, open = true) {
  const handlers = {
    onBatchAction: vi.fn(),
    onSelectAll: vi.fn(),
    onClear: vi.fn(),
    onSetLabels: vi.fn(),
    onExport: vi.fn(async () => {}),
    onAdvancedSuccess: vi.fn(),
  }
  render(<I18nProvider><TorrentSelectionBar selectedIds={selected} totalCount={total} open={open} {...handlers} /></I18nProvider>)
  return handlers
}

test("清空选择后播放退出动画期间不可交互", () => {
  renderBar(["a"], 3, false)
  const bar = screen.getByRole("toolbar", { hidden: true })
  expect(bar).toHaveAttribute("data-state", "closed")
  expect(bar).toHaveAttribute("aria-hidden", "true")
  expect(bar).toHaveAttribute("inert")
  expect(bar.className).toContain("data-[state=closed]:animate-out")
})

test("打开时为可交互的入场状态", () => {
  renderBar(["a"], 3)
  const bar = screen.getByRole("toolbar")
  expect(bar).toHaveAttribute("data-state", "open")
  expect(bar).not.toHaveAttribute("inert")
})

test("显示已选数量，并把开始、停止、删除交给批量操作", () => {
  const handlers = renderBar(["a", "b"], 5)
  expect(screen.getByText("2 selected")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /resume|start/i }))
  fireEvent.click(screen.getByRole("button", { name: /pause|stop/i }))
  fireEvent.click(screen.getByRole("button", { name: /remove|delete/i }))
  expect(handlers.onBatchAction.mock.calls.map(([action]) => action)).toEqual(["start", "stop", "remove"])
})

test("部分选中时提供全选当前列表，清除按钮清空选择", () => {
  const handlers = renderBar(["a"], 3)
  fireEvent.click(screen.getByRole("button", { name: "Select all 3" }))
  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }))
  expect(handlers.onSelectAll).toHaveBeenCalledOnce()
  expect(handlers.onClear).toHaveBeenCalledOnce()
})

test("已经全选时不再显示全选按钮", () => {
  renderBar(["a", "b", "c"], 3)
  expect(screen.queryByRole("button", { name: /Select all/ })).not.toBeInTheDocument()
})
