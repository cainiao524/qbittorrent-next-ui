import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"
import { AuthGate } from "./auth-gate"

vi.mock("@/lib/rpc-client", () => ({
  rpc: {
    checkAuthentication: vi.fn(() => new Promise<boolean>(() => {})),
    login: vi.fn(),
  },
}))

describe("AuthGate", () => {
  it("认证检查完成前不显示登录界面", () => {
    localStorage.setItem("qbittorrent-next-locale", "zh")

    render(
      <I18nProvider>
        <AuthGate>
          <div>主界面</div>
        </AuthGate>
      </I18nProvider>,
    )

    expect(screen.queryByRole("heading", { name: "登录" })).not.toBeInTheDocument()
    expect(screen.queryByText("主界面")).not.toBeInTheDocument()
    expect(screen.getByText("正在连接 qBittorrent...")).toHaveClass("sr-only")
  })
})
