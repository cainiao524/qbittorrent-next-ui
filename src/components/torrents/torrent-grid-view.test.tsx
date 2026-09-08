import { act, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { expect, test, vi } from "vitest"
import { MOCK_TORRENTS } from "@/lib/mock-data"
import { I18nProvider } from "@/lib/i18n-context"
import { TorrentGridView } from "./torrent-grid-view"

vi.mock("@/lib/app-settings-context", () => ({ useAppSettings: () => ({ animateTorrentSorting: true }) }))
vi.mock("./edit-torrent-dialog", () => ({ EditTorrentDialog: () => null }))
vi.mock("./advanced-torrent-menu", () => ({ AdvancedTorrentMenu: () => null }))

function Grid({ torrents = MOCK_TORRENTS.slice(0, 16) }) {
  return <MemoryRouter><I18nProvider><TorrentGridView paginatedTorrents={torrents} onSingleAction={() => {}} /></I18nProvider></MemoryRouter>
}

test("跨网格行排序和断点变化保留卡片节点与原入场状态", () => {
  const torrents = MOCK_TORRENTS.slice(0, 16)
  const { container, rerender } = render(<Grid torrents={torrents} />)
  const before = Array.from(container.querySelectorAll<HTMLElement>("[data-motion-id]"))
  const entrance = before.map(node => node.firstElementChild!.className)
  rerender(<Grid torrents={[...torrents].reverse()} />)
  for (const [index, node] of before.entries()) {
    expect(container.querySelector(`[data-motion-id="${node.dataset.motionId}"]`)).toBe(node)
    expect(node.firstElementChild!.className).toBe(entrance[index])
    expect(node.className).not.toContain("hover:")
    expect(node.firstElementChild!.className).toContain("hover:-translate-y-0.5")
  }
  const width = window.innerWidth
  try {
    window.innerWidth = 500
    act(() => window.dispatchEvent(new Event("resize")))
    for (const node of before) expect(container.querySelector(`[data-motion-id="${node.dataset.motionId}"]`)).toBe(node)
  } finally {
    window.innerWidth = width
  }
})

test("大量种子仍开启虚拟化而不是创建全部卡片", () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {})
  const torrents = Array.from({ length: 2000 }, (_, index) => ({ ...MOCK_TORRENTS[0], id: `test-${index}`, name: `种子 ${index}` }))
  const { container } = render(<Grid torrents={torrents} />)
  expect(container.querySelector("[data-grid-virtualized]")).toHaveAttribute("data-grid-virtualized", "true")
  expect(container.querySelectorAll("[data-grid-card]").length).toBeGreaterThan(0)
  expect(container.querySelectorAll("[data-grid-card]").length).toBeLessThan(100)
})

test("同序数值刷新不重建尺寸观察器或重新测量行高", () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {})
  const created = vi.fn()
  const original = ResizeObserver
  vi.stubGlobal("ResizeObserver", class {
    constructor() { created() }
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  try {
  const torrents = Array.from({ length: 60 }, (_, index) => ({ ...MOCK_TORRENTS[0], id: String(index) }))
  const { container, rerender, unmount } = render(<Grid torrents={torrents} />)
  expect(container.querySelectorAll("[data-grid-card]").length).toBeGreaterThan(0)
  const count = created.mock.calls.length
  const heights = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get")
  rerender(<Grid torrents={torrents.map(torrent => ({ ...torrent, rateDownload: torrent.rateDownload + 100 }))} />)
  expect(created.mock.calls).toHaveLength(count)
  expect(heights).not.toHaveBeenCalled()
  unmount()
  } finally {
    vi.stubGlobal("ResizeObserver", original)
  }
})
