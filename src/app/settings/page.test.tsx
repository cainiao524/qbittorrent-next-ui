import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { I18nProvider } from "@/lib/i18n-context"
import { MOCK_SESSION } from "@/lib/mock-data"
import SettingsPage from "./page"

vi.mock("@/lib/rpc-client", () => ({ rpc: { getSession: async () => MOCK_SESSION } }))
vi.mock("@/lib/app-settings-context", () => ({
  useAppSettings: () => ({ refreshInterval: 3000, autoRefresh: true, setRefreshInterval: vi.fn(), setAutoRefresh: vi.fn() }),
}))
vi.mock("@/components/settings/interface-settings-panel", () => ({ InterfaceSettingsPanel: () => null }))
vi.mock("@/components/settings/all-preferences-panel", () => ({ AllPreferencesPanel: () => null }))

test("自动刷新卡片只有一个开关，鼠标和键盘每次只切换一次且无按钮嵌套", async () => {
  localStorage.setItem("qbittorrent-next-locale", "zh")
  localStorage.setItem("transmission-vibemod-locale", "zh")
  const errors = vi.spyOn(console, "error")
  const user = userEvent.setup()
  render(<I18nProvider><SettingsPage /></I18nProvider>)
  await user.click(await screen.findByRole("button", { name: "页面设置" }))
  const control = screen.getByRole("switch", { name: "启动自动刷新" })
  expect(control).toHaveAttribute("aria-checked", "true")
  expect(control.querySelector("button, [role=switch]")).toBeNull()
  const thumb = control.querySelector('[aria-hidden="true"] > span')
  await user.click(control)
  expect(control).toHaveAttribute("aria-checked", "false")
  await user.keyboard(" ")
  expect(control).toHaveAttribute("aria-checked", "true")
  await user.keyboard("{Enter}")
  expect(control).toHaveAttribute("aria-checked", "false")
  expect(control.querySelector('[aria-hidden="true"] > span')).toBe(thumb)
  expect(errors).not.toHaveBeenCalled()
})
