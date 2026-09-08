import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useTheme } from "next-themes"
import { expect, test, vi } from "vitest"
import { ThemeProvider } from "./theme-provider"

function ThemeControls() {
  const { setTheme } = useTheme()
  return <><button onClick={() => setTheme("dark")}>深色</button><button onClick={() => setTheme("light")}>浅色</button><input aria-label="输入内容" /></>
}

test("主题切换不注入全局过渡禁用规则，保留快捷键与输入保护", async () => {
  const user = userEvent.setup()
  const append = vi.spyOn(document.head, "appendChild")
  const { unmount } = render(<ThemeProvider defaultTheme="light" enableSystem={false}><ThemeControls /></ThemeProvider>)
  await waitFor(() => expect(document.documentElement.dataset.themeMotion).toBe("ready"))
  await user.click(screen.getByRole("button", { name: "深色" }))
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
  await user.click(screen.getByRole("button", { name: "浅色" }))
  await waitFor(() => expect(document.documentElement).toHaveClass("light"))
  await user.keyboard("d")
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
  await user.type(screen.getByRole("textbox", { name: "输入内容" }), "d")
  expect(document.documentElement).toHaveClass("dark")
  expect(append.mock.calls.some(([node]) => node.textContent?.includes("transition:none!important"))).toBe(false)
  unmount()
  expect(document.documentElement.dataset.themeMotion).toBeUndefined()
  document.documentElement.classList.remove("dark", "light")
})
