import type { TorrentFile, TorrentFilePriority } from "./rpc-types"

export interface TorrentFileTreeNode {
  kind: "file" | "folder"
  key: string
  name: string
  path: string
  children: TorrentFileTreeNode[]
  file?: TorrentFile
  fileCount: number
  length: number
  bytesCompleted: number
  priority: TorrentFilePriority | null
}

export interface VisibleTorrentFileTreeNode {
  node: TorrentFileTreeNode
  depth: number
}

export type TorrentFileTreeSortKey = "name" | "size" | "progress" | "priority"
export type TorrentFileTreeSortDirection = "asc" | "desc"

export interface TorrentFileTreeSort {
  key: TorrentFileTreeSortKey
  direction: TorrentFileTreeSortDirection
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

function sortNodes(nodes: TorrentFileTreeNode[]): void {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1
    return collator.compare(left.name, right.name)
  })
  nodes.forEach((node) => {
    if (node.children.length) sortNodes(node.children)
  })
}

function summarizeFolder(node: TorrentFileTreeNode): void {
  let commonPriority: TorrentFilePriority | null | undefined
  for (const child of node.children) {
    if (child.kind === "folder") summarizeFolder(child)
    node.fileCount += child.fileCount
    node.length += child.length
    node.bytesCompleted += child.bytesCompleted
    if (commonPriority === undefined) commonPriority = child.priority
    else if (commonPriority !== child.priority) commonPriority = null
  }
  node.priority = commonPriority ?? null
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
      fileCount: 0,
      length: 0,
      bytesCompleted: 0,
      priority: null,
    }
    folders.set(path, folder)
    if (segments.length === 1) roots.push(folder)
    else ensureFolder(segments.slice(0, -1)).children.push(folder)
    return folder
  }

  for (const file of files) {
    const segments = file.name.replaceAll("\\", "/").split("/").filter(Boolean)
    const fileName = segments.pop() ?? file.name
    const normalizedPath = [...segments, fileName].join("/")
    const node: TorrentFileTreeNode = {
      kind: "file",
      key: `file:${file.index}`,
      name: fileName,
      path: normalizedPath,
      children: [],
      file,
      fileCount: 1,
      length: file.length,
      bytesCompleted: file.bytesCompleted,
      priority: file.priority,
    }
    if (segments.length) ensureFolder(segments).children.push(node)
    else roots.push(node)
  }

  sortNodes(roots)
  roots.forEach((node) => {
    if (node.kind === "folder") summarizeFolder(node)
  })
  return roots
}

export function getTorrentFolderKeys(nodes: TorrentFileTreeNode[]): string[] {
  const result: string[] = []
  const stack = [...nodes].reverse()
  while (stack.length) {
    const node = stack.pop()!
    if (node.kind !== "folder") continue
    result.push(node.key)
    for (let index = node.children.length - 1; index >= 0; index--) stack.push(node.children[index])
  }
  return result
}

export function collectTorrentFileIds(node: TorrentFileTreeNode): number[] {
  if (node.file) return [node.file.index]
  const result: number[] = []
  const stack = [...node.children]
  while (stack.length) {
    const child = stack.pop()!
    if (child.file) result.push(child.file.index)
    else stack.push(...child.children)
  }
  return result
}

export function getTorrentFileSearchKeys(nodes: TorrentFileTreeNode[], query: string): Set<string> | null {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return null
  const result = new Set<string>()
  const stack = [...nodes]
  while (stack.length) {
    const node = stack.pop()!
    if (node.kind === "folder") {
      stack.push(...node.children)
      continue
    }
    if (!node.path.toLocaleLowerCase().includes(normalized)) continue
    result.add(node.key)
    const segments = node.path.split("/")
    segments.pop()
    for (let index = 1; index <= segments.length; index++) result.add(`folder:${segments.slice(0, index).join("/")}`)
  }
  return result
}

export function flattenVisibleTorrentFileTree(
  nodes: TorrentFileTreeNode[],
  expanded: ReadonlySet<string>,
  searchKeys: ReadonlySet<string> | null = null,
  sort: TorrentFileTreeSort = { key: "name", direction: "asc" },
): VisibleTorrentFileTreeNode[] {
  const value = (node: TorrentFileTreeNode): string | number => {
    if (sort.key === "size") return node.length
    if (sort.key === "progress") return node.length > 0 ? node.bytesCompleted / node.length : 0
    if (sort.key === "priority") return node.priority ?? -1
    return node.name
  }
  const compare = (left: TorrentFileTreeNode, right: TorrentFileTreeNode) => {
    if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1
    const leftValue = value(left)
    const rightValue = value(right)
    const result = typeof leftValue === "string" && typeof rightValue === "string"
      ? collator.compare(leftValue, rightValue)
      : Number(leftValue) - Number(rightValue)
    return sort.direction === "asc" ? result : -result
  }
  const ordered = (items: TorrentFileTreeNode[]) => [...items].sort(compare)
  const result: VisibleTorrentFileTreeNode[] = []
  const stack = ordered(nodes).map((node) => ({ node, depth: 0 })).reverse()
  while (stack.length) {
    const current = stack.pop()!
    if (searchKeys && !searchKeys.has(current.node.key)) continue
    result.push(current)
    const shouldExpand = current.node.kind === "folder" && (searchKeys !== null || expanded.has(current.node.key))
    if (!shouldExpand) continue
    const children = ordered(current.node.children)
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ node: children[index], depth: current.depth + 1 })
    }
  }
  return result
}
