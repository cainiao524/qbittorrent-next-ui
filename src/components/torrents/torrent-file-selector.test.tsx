import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"

import { TorrentFileSelector } from "./torrent-file-selector"

const files = [
  { index: 0, path: "示例/视频/正片.mkv", length: 1024 },
  { index: 1, path: "示例/说明.txt", length: 512 },
]

const manyFiles = Array.from({ length: 250 }, (_, index) => ({
  index,
  path: `大型种子/文件-${index}.bin`,
  length: 1024,
}))

describe("TorrentFileSelector", () => {
  beforeEach(() => {
    localStorage.setItem("qbittorrent-next-locale", "zh")
    localStorage.setItem("transmission-vibemod-locale", "zh")
  })

  test("可切换单个文件并保留后端文件编号", async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    render(
      <I18nProvider>
        <TorrentFileSelector files={files} selectedFileIndexes={[0, 1]} onSelectionChange={onSelectionChange} />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: /文件详情展开/ }))
    await user.click(screen.getByRole("checkbox", { name: /说明\.txt/ }))
    expect(onSelectionChange).toHaveBeenCalledWith([0])
  })

  test("全选按钮可清空或恢复全部文件", async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    const { rerender } = render(
      <I18nProvider>
        <TorrentFileSelector files={files} selectedFileIndexes={[0, 1]} onSelectionChange={onSelectionChange} />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("checkbox", { name: /全选/ }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([])

    rerender(
      <I18nProvider>
        <TorrentFileSelector files={files} selectedFileIndexes={[]} onSelectionChange={onSelectionChange} />
      </I18nProvider>,
    )
    await user.click(screen.getByRole("checkbox", { name: /全选/ }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([0, 1])
  })

  test("文件详情文案会随展开状态切换", async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <TorrentFileSelector files={files} selectedFileIndexes={[0, 1]} onSelectionChange={vi.fn()} />
      </I18nProvider>,
    )

    expect(screen.getByRole("button", { name: /文件详情展开/ })).toBeInTheDocument()
    expect(screen.queryByText("示例/视频/正片.mkv")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /文件详情展开/ }))
    expect(screen.getByRole("button", { name: /文件详情收起/ })).toBeInTheDocument()
    expect(screen.getByText("示例/视频/正片.mkv")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /文件详情收起/ }))
    expect(screen.getByRole("button", { name: /文件详情展开/ })).toBeInTheDocument()
    expect(screen.queryByText("示例/视频/正片.mkv")).not.toBeInTheDocument()
  })

  test("超大文件列表只渲染可视区域", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <I18nProvider>
        <TorrentFileSelector files={manyFiles} selectedFileIndexes={manyFiles.map((file) => file.index)} onSelectionChange={vi.fn()} />
      </I18nProvider>,
    )

    await user.click(screen.getByRole("button", { name: /文件详情展开/ }))
    const list = container.querySelector('[data-file-list-virtualized="true"]') as HTMLElement
    expect(list).toBeInTheDocument()
    expect(within(list).getByText("大型种子/文件-0.bin")).toBeInTheDocument()
    expect(within(list).queryByText("大型种子/文件-249.bin")).not.toBeInTheDocument()
    expect(within(list).getAllByRole("checkbox").length).toBeLessThan(manyFiles.length)
  })
})
