import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"
import { AuthGate } from "./auth-gate"
import { APP_CONFIG } from "@/lib/config"

vi.mock("@backend/rpc-client", () => ({
  rpc: {
    checkAuthentication: vi.fn(() => new Promise<boolean>(() => {})),
    login: vi.fn(),
  },
}))

describe("AuthGate", () => {
  it("认证检查完成前不显示登录界面", () => {
    localStorage.setItem(APP_CONFIG.storageKeys.locale, "zh")

    render(
      <I18nProvider>
        <AuthGate>
          <div>主界面</div>
        </AuthGate>
      </I18nProvider>,
    )

    expect(screen.queryByRole("heading", { name: "登录" })).not.toBeInTheDocument()
    expect(screen.queryByText("主界面")).not.toBeInTheDocument()
    expect(screen.getByText(`正在连接 ${APP_CONFIG.backendName}...`)).toHaveClass("sr-only")
  })
})
