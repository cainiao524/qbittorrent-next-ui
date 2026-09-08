import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

test("键盘焦点即时打开工具提示时匹配入场动画", async () => {
  const user = userEvent.setup()
  render(<TooltipProvider><Tooltip><TooltipTrigger>提示按钮</TooltipTrigger><TooltipContent>提示内容</TooltipContent></Tooltip></TooltipProvider>)
  await user.tab()
  expect(screen.getByRole("button", { name: "提示按钮" })).toHaveFocus()
  const content = document.querySelector('[data-slot="tooltip-content"]')!
  expect(content).toHaveAttribute("data-state", "instant-open")
  expect(content.className).toContain("data-[state=instant-open]:animate-in")
})
