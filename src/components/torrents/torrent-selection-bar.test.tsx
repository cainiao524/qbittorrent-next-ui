import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { TorrentSelectionBar } from "./torrent-selection-bar"

vi.mock("./advanced-torrent-menu", () => ({ AdvancedTorrentMenu: ({ trigger }: { trigger: React.ReactNode }) => trigger }))

function renderBar(selected: string[], total: number) {
  const handlers = {
    onBatchAction: vi.fn(),
    onSelectAll: vi.fn(),
    onClear: vi.fn(),
    onSetLabels: vi.fn(),
    onExport: vi.fn(async () => {}),
    onAdvancedSuccess: vi.fn(),
  }
  render(<I18nProvider><TorrentSelectionBar selectedIds={selected} totalCount={total} {...handlers} /></I18nProvider>)
  return handlers
}

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
