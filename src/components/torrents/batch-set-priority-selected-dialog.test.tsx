import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"
import { rpc } from "@/lib/rpc-client"

import { BatchSetPrioritySelectedDialog } from "./batch-set-priority-selected-dialog"

vi.mock("@/lib/rpc-client", () => ({
  rpc: {
    setTorrent: vi.fn(),
  },
}))

describe("BatchSetPrioritySelectedDialog", () => {
  const setTorrentMock = vi.mocked(rpc.setTorrent)

  beforeAll(() => {
    localStorage.removeItem("qbittorrent-next-locale")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    setTorrentMock.mockResolvedValue([])
    localStorage.removeItem("qbittorrent-next-locale")
  })

  test("多选后选择高优先级并确认会批量应用", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    render(
      <I18nProvider>
        <BatchSetPrioritySelectedDialog
          open
          onOpenChange={onOpenChange}
          selectedIds={["a", "b"]}
          onSuccess={onSuccess}
        />
      </I18nProvider>
    )

    expect(screen.getByText("为已选中的 2 个种子设置下载优先级")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "高" }))
    await user.click(screen.getByRole("button", { name: "应用到 2 个种子" }))

    await waitFor(() => {
      expect(setTorrentMock).toHaveBeenCalledWith(["a", "b"], { bandwidthPriority: 1 })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSuccess).toHaveBeenCalled()
  })

  test("不选择时默认应用常规优先级", async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <BatchSetPrioritySelectedDialog
          open
          onOpenChange={vi.fn()}
          selectedIds={["x"]}
        />
      </I18nProvider>
    )

    await user.click(screen.getByRole("button", { name: "应用到 1 个种子" }))

    await waitFor(() => {
      expect(setTorrentMock).toHaveBeenCalledWith(["x"], { bandwidthPriority: 0 })
    })
  })
})
