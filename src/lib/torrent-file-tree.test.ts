import { describe, expect, test } from "vitest"
import type { TorrentFile } from "./rpc-types"
import { buildTorrentFileTree, getTorrentFolderKeys } from "./torrent-file-tree"

const files: TorrentFile[] = [
  { index: 0, name: "视频/正片.mkv", length: 100, bytesCompleted: 50, priority: 1 },
  { index: 1, name: "视频/花絮/片段.mp4", length: 20, bytesCompleted: 20, priority: 6 },
  { index: 2, name: "说明.txt", length: 10, bytesCompleted: 0, priority: 0 },
]

describe("种子文件树", () => {
  test("按相对路径构建文件夹，并汇总大小、进度和文件编号", () => {
    const tree = buildTorrentFileTree(files)
    const folder = tree[0]

    expect(folder).toMatchObject({
      kind: "folder",
      name: "视频",
      length: 120,
      bytesCompleted: 70,
      priority: null,
    })
    expect(folder.files.map((file) => file.index)).toEqual([1, 0])
    expect(folder.children[0]).toMatchObject({ kind: "folder", name: "花絮", priority: 6 })
    expect(tree[1]).toMatchObject({ kind: "file", name: "说明.txt", priority: 0 })
  })

  test("返回所有可展开文件夹的键", () => {
    expect(getTorrentFolderKeys(buildTorrentFileTree(files))).toEqual([
      "folder:视频",
      "folder:视频/花絮",
    ])
  })
})
