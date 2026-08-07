import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"
import type { TorrentFile, TorrentFilePriority } from "@/lib/rpc-types"

import { TorrentFileTree } from "./torrent-file-tree"

const files: TorrentFile[] = [
  { index: 0, name: "视频/正片.mkv", length: 100, bytesCompleted: 50, priority: 1 },
  { index: 1, name: "视频/花絮/片段.mp4", length: 20, bytesCompleted: 20, priority: 6 },
  { index: 2, name: "说明.txt", length: 10, bytesCompleted: 0, priority: 0 },
]

function renderTree(onPriorityChange: (fileIds: number[], priority: TorrentFilePriority) => void = vi.fn()) {
  render(
    <I18nProvider>
      <TorrentFileTree files={files} updatingFileIds={new Set()} onPriorityChange={onPriorityChange} />
    </I18nProvider>
  )
}

describe("TorrentFileTree", () => {
  beforeAll(() => {
    localStorage.setItem("qbittorrent-next-locale", "zh")
    ;(window as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({
      top: 0,
      bottom: 768,
      height: 768,
      left: 0,
      right: 1024,
      width: 1024,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
  })

  beforeEach(() => {
    localStorage.setItem("qbittorrent-next-locale", "zh")
  })

  test("勾选文件夹后可通过底部菜单批量设置其下文件优先级", async () => {
    const user = userEvent.setup()
    const onPriorityChange = vi.fn()
    renderTree(onPriorityChange)

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes).toHaveLength(5)
    await user.click(checkboxes[1])

    expect(screen.getByText("已选 2 个文件")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "批量设置优先级" }))
    await user.click(await screen.findByRole("menuitem", { name: "高" }))

    const [ids, priority] = onPriorityChange.mock.calls[0] as [number[], TorrentFilePriority]
    expect([...ids].sort((left, right) => left - right)).toEqual([0, 1])
    expect(priority).toBe(6)
  })

  test("表头全选所有文件并通过底部菜单批量设置优先级", async () => {
    const user = userEvent.setup()
    const onPriorityChange = vi.fn()
    renderTree(onPriorityChange)

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])

    expect(screen.getByText("已选 3 个文件")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "批量设置优先级" }))
    await user.click(await screen.findByRole("menuitem", { name: "不下载" }))

    expect(onPriorityChange).toHaveBeenCalledWith([0, 1, 2], 0)
  })

  test("搜索后仍可折叠和重新展开匹配文件夹", async () => {
    const user = userEvent.setup()
    renderTree()

    await user.type(screen.getByPlaceholderText("搜索文件或路径"), "片段")
    expect(screen.getByText("片段.mp4")).toBeTruthy()

    await user.click(screen.getByText("花絮"))
    expect(screen.queryByText("片段.mp4")).toBeNull()

    await user.click(screen.getByText("花絮"))
    expect(screen.getByText("片段.mp4")).toBeTruthy()
  })
})
