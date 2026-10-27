import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { expect, test } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { APP_CONFIG } from "@/lib/config"
import { MOCK_TORRENTS } from "@/lib/mock-data"
import { getTorrentOverview } from "@/lib/torrent-list-utils"
import { TorrentOverviewProvider, useTorrentOverview } from "@/lib/torrent-overview-context"
import { SidebarFacetGroups } from "./sidebar-facet-groups"

function PublishOverview() {
  const { setOverview } = useTorrentOverview()
  React.useEffect(() => setOverview(getTorrentOverview(MOCK_TORRENTS)), [setOverview])
  return null
}

function ActiveFilters() {
  const { trackerFilter } = useTorrentOverview()
  return <output data-testid="tracker-filter">{trackerFilter.join(",")}</output>
}

function renderSidebar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nProvider>
        <TorrentOverviewProvider>
          <PublishOverview />
          <SidebarFacetGroups />
          <ActiveFilters />
          <Routes>
            <Route path="/" element={<p>list page</p>} />
            <Route path="/settings" element={<p>settings page</p>} />
          </Routes>
        </TorrentOverviewProvider>
      </I18nProvider>
    </MemoryRouter>,
  )
}

test("按数量展示 Tracker，点击切换筛选并与列表共享状态", () => {
  renderSidebar()
  const overview = getTorrentOverview(MOCK_TORRENTS)
  const top = overview.trackers[0]
  const row = screen.getByRole("button", { name: new RegExp(top.value) })
  expect(row).toHaveTextContent(String(top.count))
  fireEvent.click(row)
  expect(row).toHaveAttribute("aria-pressed", "true")
  expect(screen.getByTestId("tracker-filter")).toHaveTextContent(top.value)
  fireEvent.click(row)
  expect(screen.getByTestId("tracker-filter")).toHaveTextContent("")
})

test("在非列表页点击筛选会回到列表", () => {
  renderSidebar("/settings")
  fireEvent.click(screen.getByRole("button", { name: new RegExp(getTorrentOverview(MOCK_TORRENTS).trackers[0].value) }))
  expect(screen.getByText("list page")).toBeInTheDocument()
})

test("分类分组只在后端支持分类时出现", () => {
  renderSidebar()
  const hasCategoryGroup = screen.queryByRole("button", { name: /Categories/ }) !== null
  const hasCategories = getTorrentOverview(MOCK_TORRENTS).categories.length > 0
  expect(hasCategoryGroup).toBe(APP_CONFIG.capabilities.categories && hasCategories)
})
