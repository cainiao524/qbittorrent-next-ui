import type { TorrentFile, TorrentFilePriority } from "./rpc-types"

export interface TorrentFileTreeNode {
  kind: "file" | "folder"
  key: string
  name: string
  path: string
  children: TorrentFileTreeNode[]
  files: TorrentFile[]
  length: number
  bytesCompleted: number
  priority: TorrentFilePriority | null
}

function sortNodes(nodes: TorrentFileTreeNode[]): void {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1
    return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" })
  })
  nodes.forEach((node) => sortNodes(node.children))
}

function summarizeFolder(node: TorrentFileTreeNode): void {
  node.children.forEach((child) => {
    if (child.kind === "folder") summarizeFolder(child)
  })

  node.files = node.children.flatMap((child) => child.files)
  node.length = node.files.reduce((total, file) => total + file.length, 0)
  node.bytesCompleted = node.files.reduce((total, file) => total + file.bytesCompleted, 0)
  const priorities = new Set(node.files.map((file) => file.priority))
  node.priority = priorities.size === 1 ? node.files[0]?.priority ?? 1 : null
}

export function buildTorrentFileTree(files: TorrentFile[]): TorrentFileTreeNode[] {
  const roots: TorrentFileTreeNode[] = []
  const folders = new Map<string, TorrentFileTreeNode>()

  const ensureFolder = (segments: string[]): TorrentFileTreeNode => {
    const path = segments.join("/")
    const existing = folders.get(path)
    if (existing) return existing

    const folder: TorrentFileTreeNode = {
      kind: "folder",
      key: `folder:${path}`,
      name: segments.at(-1) ?? path,
      path,
      children: [],
      files: [],
      length: 0,
      bytesCompleted: 0,
      priority: null,
    }
    folders.set(path, folder)

    if (segments.length === 1) roots.push(folder)
    else ensureFolder(segments.slice(0, -1)).children.push(folder)
    return folder
  }

  files.forEach((file) => {
    const segments = file.name.replaceAll("\\", "/").split("/").filter(Boolean)
    const fileName = segments.pop() ?? file.name
    const normalizedPath = [...segments, fileName].join("/")
    const node: TorrentFileTreeNode = {
      kind: "file",
      key: `file:${file.index}`,
      name: fileName,
      path: normalizedPath,
      children: [],
      files: [file],
      length: file.length,
      bytesCompleted: file.bytesCompleted,
      priority: file.priority,
    }

    if (segments.length) ensureFolder(segments).children.push(node)
    else roots.push(node)
  })

  sortNodes(roots)
  roots.forEach((node) => {
    if (node.kind === "folder") summarizeFolder(node)
  })
  return roots
}

export function getTorrentFolderKeys(nodes: TorrentFileTreeNode[]): string[] {
  return nodes.flatMap((node) => node.kind === "folder"
    ? [node.key, ...getTorrentFolderKeys(node.children)]
    : [])
}
