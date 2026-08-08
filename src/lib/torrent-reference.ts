import type { Torrent } from "./rpc-types"

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((value, index) => valuesEqual(value, right[index]))
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])
  for (const key of keys) {
    if (!valuesEqual(leftRecord[key], rightRecord[key])) return false
  }
  return true
}

export function reuseTorrentReferences(current: Torrent[], next: Torrent[]): Torrent[] {
  if (!current.length) return next

  const currentById = new Map(current.map((torrent) => [torrent.id, torrent]))
  const reused = next.map((torrent) => {
    const previous = currentById.get(torrent.id)
    return previous && valuesEqual(previous, torrent) ? previous : torrent
  })

  return current.length === reused.length && current.every((torrent, index) => torrent === reused[index])
    ? current
    : reused
}
