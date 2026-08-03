import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"

import { BatchSetFilePriorityDialog } from "./batch-set-file-priority-dialog"

describe("BatchSetFilePriorityDialog", () => {
  beforeAll(() => {
    localStorage.removeItem("qbittorrent-next-locale")
  })

  beforeEach(() => {
    localStorage.removeItem("qbittorrent-next-locale")
  })

  test("选择高优先级并确认后回调对应文件优先级", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <I18nProvider>
        <BatchSetFilePriorityDialog
          open
          onOpenChange={vi.fn()}
          selectedFileCount={2}
          onConfirm={onConfirm}
        />
      </I18nProvider>
    )

    expect(screen.getByText("为已选中的 2 个文件设置下载优先级")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "高" }))
    await user.click(screen.getByRole("button", { name: "应用到 2 个文件" }))

    expect(onConfirm).toHaveBeenCalledWith(6)
  })

  test("不选择时默认应用普通优先级", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <I18nProvider>
        <BatchSetFilePriorityDialog
          open
          onOpenChange={vi.fn()}
          selectedFileCount={1}
          onConfirm={onConfirm}
        />
      </I18nProvider>
    )

    await user.click(screen.getByRole("button", { name: "应用到 1 个文件" }))

    expect(onConfirm).toHaveBeenCalledWith(1)
  })
})
