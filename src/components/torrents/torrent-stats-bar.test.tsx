import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { MOCK_STATS } from "@/lib/mock-data"
import { TorrentStatsBar } from "./torrent-stats-bar"

const history = [
  { time: 1, download: 100, upload: 10 },
  { time: 2, download: 300, upload: 20 },
]

function renderBar(chartExpanded = false, freeSpace: { path: string; "size-bytes": number; total_size: number } | null = { path: "/downloads", "size-bytes": 250, total_size: 1000 }) {
  const onToggleChart = vi.fn()
  const view = render(
    <I18nProvider>
      <TorrentStatsBar stats={MOCK_STATS} freeSpace={freeSpace} downloadSpeed={2048} uploadSpeed={1024} history={history} chartExpanded={chartExpanded} onToggleChart={onToggleChart} />
    </I18nProvider>,
  )
  return { ...view, onToggleChart }
}

test("速度格展示当前速度和迷你曲线，点击切换速度图", () => {
  const { container, onToggleChart } = renderBar()
  const toggles = screen.getAllByRole("button")
  expect(toggles).toHaveLength(2)
  expect(toggles[0]).toHaveAttribute("aria-expanded", "false")
  expect(container.querySelectorAll("polyline")).toHaveLength(2)
  fireEvent.click(toggles[1])
  expect(onToggleChart).toHaveBeenCalledOnce()
})

test("剩余空间显示百分比，拿不到总量时退回显示路径", () => {
  renderBar(true)
  expect(screen.getByText(/25%/)).toBeInTheDocument()
  expect(screen.getAllByRole("button")[0]).toHaveAttribute("aria-expanded", "true")

  renderBar(false, { path: "/mnt/data", "size-bytes": 250, total_size: 0 })
  expect(screen.getByText("/mnt/data")).toBeInTheDocument()
})
