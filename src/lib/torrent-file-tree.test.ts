import { describe, expect, test } from "vitest"
import type { TorrentFile } from "./rpc-types"
import { buildTorrentFileTree, collectTorrentFileIds, flattenVisibleTorrentFileTree, getTorrentFileSearchKeys, getTorrentFolderKeys } from "./torrent-file-tree"

const files: TorrentFile[] = [
  { index: 0, name: "视频/正片.mkv", length: 100, bytesCompleted: 50, priority: 1 },
  { index: 1, name: "视频/花絮/片段.mp4", length: 20, bytesCompleted: 20, priority: 6 },
  { index: 2, name: "说明.txt", length: 10, bytesCompleted: 0, priority: 0 },
]

describe("种子文件树", () => {
  test("按路径构建目录并以常量级摘要代替重复子文件数组", () => {
    const tree = buildTorrentFileTree(files)
    const folder = tree[0]
    expect(folder).toMatchObject({ kind: "folder", name: "视频", fileCount: 2, length: 120, bytesCompleted: 70, priority: null })
    expect(folder).not.toHaveProperty("files")
    expect(collectTorrentFileIds(folder).sort((a, b) => a - b)).toEqual([0, 1])
    expect(folder.children[0]).toMatchObject({ kind: "folder", name: "花絮", priority: 6 })
    expect(tree[1]).toMatchObject({ kind: "file", name: "说明.txt", priority: 0 })
  })

  test("返回文件夹键并只展平已展开目录", () => {
    const tree = buildTorrentFileTree(files)
    expect(getTorrentFolderKeys(tree)).toEqual(["folder:视频", "folder:视频/花絮"])
    expect(flattenVisibleTorrentFileTree(tree, new Set()).map(({ node }) => node.name)).toEqual(["视频", "说明.txt"])
    expect(flattenVisibleTorrentFileTree(tree, new Set(["folder:视频"])).map(({ node }) => node.name)).toEqual(["视频", "花絮", "正片.mkv", "说明.txt"])
  })

  test("搜索文件路径时自动保留祖先目录", () => {
    const tree = buildTorrentFileTree(files)
    const keys = getTorrentFileSearchKeys(tree, "片段")
    expect(flattenVisibleTorrentFileTree(tree, new Set(), keys).map(({ node }) => node.name)).toEqual(["视频", "花絮", "片段.mp4"])
  })

  test("支持按名称、大小、进度和优先级排序", () => {
    const tree = buildTorrentFileTree([
      { index: 0, name: "b.mkv", length: 100, bytesCompleted: 50, priority: 1 },
      { index: 1, name: "a.mp4", length: 20, bytesCompleted: 20, priority: 6 },
      { index: 2, name: "c.txt", length: 10, bytesCompleted: 0, priority: 0 },
    ])
    const names = (key: "name" | "size" | "progress" | "priority", direction: "asc" | "desc") =>
      flattenVisibleTorrentFileTree(tree, new Set(), null, { key, direction })
        .filter(({ node }) => node.kind === "file")
        .map(({ node }) => node.name)

    expect(names("name", "asc")).toEqual(["a.mp4", "b.mkv", "c.txt"])
    expect(names("size", "desc")).toEqual(["b.mkv", "a.mp4", "c.txt"])
    expect(names("progress", "asc")).toEqual(["c.txt", "b.mkv", "a.mp4"])
    expect(names("priority", "desc")).toEqual(["a.mp4", "b.mkv", "c.txt"])
  })

  test("可处理二万五千个文件且折叠时只产生根节点", () => {
    const largeFiles: TorrentFile[] = Array.from({ length: 25_000 }, (_, index) => ({
      index,
      name: `TLMC/分组-${Math.floor(index / 1000)}/专辑-${Math.floor(index / 50)}/音轨-${index}.flac`,
      length: 1024,
      bytesCompleted: index % 2 ? 1024 : 0,
      priority: 1,
    }))
    const tree = buildTorrentFileTree(largeFiles)
    expect(tree).toHaveLength(1)
    expect(tree[0].fileCount).toBe(25_000)
    expect(flattenVisibleTorrentFileTree(tree, new Set())).toHaveLength(1)
    expect(collectTorrentFileIds(tree[0])).toHaveLength(25_000)
  })
})
