import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { I18nProvider } from "@/lib/i18n-context"

import { AddTorrentDialog } from "./add-torrent-dialog"

const rpcMock = vi.hoisted(() => ({
  addTorrent: vi.fn(),
  getSession: vi.fn(),
  getTorrentCategories: vi.fn(),
  getTorrentTags: vi.fn(),
}))

vi.mock("@/lib/rpc-client", () => ({ rpc: rpcMock }))
vi.mock("@/lib/torrent-metainfo-async", () => ({
  parseTorrentMetainfoAsync: async () => ({
    name: "示例",
    torrentId: "abc123",
    files: [
      { index: 0, path: "示例/视频.mkv", length: 2048 },
      { index: 1, path: "示例/说明.txt", length: 128 },
    ],
  }),
}))
vi.mock("@/components/location-input", () => ({
  LocationInput: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe("AddTorrentDialog file selection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem("qbittorrent-next-locale", "zh")
    localStorage.setItem("transmission-vibemod-locale", "zh")
    rpcMock.addTorrent.mockResolvedValue({})
  })

  test("提交未勾选文件编号和种子标识", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <I18nProvider>
        <AddTorrentDialog><button type="button">打开</button></AddTorrentDialog>
      </I18nProvider>,
    )
    const torrent = new File([new Uint8Array([100, 101])], "example.torrent", { type: "application/x-bittorrent" })
    Object.defineProperty(torrent, "arrayBuffer", { value: vi.fn().mockResolvedValue(new ArrayBuffer(2)) })

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, torrent)
    await user.click(await screen.findByRole("button", { name: /文件详情展开/ }))
    const readme = await screen.findByRole("checkbox", { name: /说明\.txt/ })
    await user.click(readme)
    await user.click(screen.getByRole("button", { name: "添加 1 个任务" }))

    await waitFor(() => expect(rpcMock.addTorrent).toHaveBeenCalledWith(expect.objectContaining({
      torrentId: "abc123",
      "files-unwanted": [1],
      paused: false,
    })))
  })

  test("允许全部文件不选并以暂停状态添加", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <I18nProvider>
        <AddTorrentDialog><button type="button">打开</button></AddTorrentDialog>
      </I18nProvider>,
    )
    const torrent = new File([new Uint8Array([100, 101])], "example.torrent", { type: "application/x-bittorrent" })
    Object.defineProperty(torrent, "arrayBuffer", { value: vi.fn().mockResolvedValue(new ArrayBuffer(2)) })

    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, torrent)
    await user.click(await screen.findByRole("checkbox", { name: /全选/ }))
    const addButton = screen.getByRole("button", { name: "添加 1 个任务" })
    expect(addButton).not.toBeDisabled()
    await user.click(addButton)

    await waitFor(() => expect(rpcMock.addTorrent).toHaveBeenCalledWith(expect.objectContaining({
      torrentId: "abc123",
      "files-unwanted": [0, 1],
      paused: true,
    })))
  })

  test("链接添加保持原有直接提交流程", async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <AddTorrentDialog><button type="button">打开</button></AddTorrentDialog>
      </I18nProvider>,
    )

    await user.type(screen.getByPlaceholderText("每行输入一个链接"), "magnet:?xt=urn:btih:abc123")
    await user.click(screen.getByRole("button", { name: "添加 1 个任务" }))

    await waitFor(() => expect(rpcMock.addTorrent).toHaveBeenCalledWith(expect.objectContaining({
      filename: "magnet:?xt=urn:btih:abc123",
      paused: false,
    })))
  })
})
