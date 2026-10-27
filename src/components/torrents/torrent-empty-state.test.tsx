import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { TorrentEmptyState } from "./torrent-empty-state"

function renderState(hasTorrents: boolean, isFiltered: boolean) {
  const onAdd = vi.fn()
  const onClearFilters = vi.fn()
  render(<I18nProvider><TorrentEmptyState hasTorrents={hasTorrents} isFiltered={isFiltered} onAdd={onAdd} onClearFilters={onClearFilters} /></I18nProvider>)
  return { onAdd, onClearFilters }
}

test("没有任何种子时引导添加", () => {
  const { onAdd } = renderState(false, false)
  expect(screen.getByText("No torrents yet")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button"))
  expect(onAdd).toHaveBeenCalledOnce()
})

test("搜索或筛选后没有结果时提供清除", () => {
  const { onClearFilters } = renderState(true, true)
  expect(screen.getByText("No matching torrents")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Clear search and filters" }))
  expect(onClearFilters).toHaveBeenCalledOnce()
})

test("只是当前状态分类为空时不显示操作按钮", () => {
  renderState(true, false)
  expect(screen.getByText("Nothing here right now")).toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
})
