import type { TorrentPieceState } from "./rpc-types"

export interface PieceStateSummary {
  total: number
  missing: number
  downloading: number
  complete: number
}

export interface PieceStateBucket extends PieceStateSummary {
  start: number
  end: number
}

export function summarizePieceStates(states: readonly TorrentPieceState[]): PieceStateSummary {
  return states.reduce<PieceStateSummary>((summary, state) => {
    if (state === 2) summary.complete += 1
    else if (state === 1) summary.downloading += 1
    else summary.missing += 1
    summary.total += 1
    return summary
  }, { total: 0, missing: 0, downloading: 0, complete: 0 })
}

export function aggregatePieceStates(states: readonly TorrentPieceState[], maxBuckets = 512): PieceStateBucket[] {
  if (!states.length || maxBuckets <= 0) return []
  const bucketSize = Math.max(1, Math.ceil(states.length / maxBuckets))
  const buckets: PieceStateBucket[] = []

  for (let start = 0; start < states.length; start += bucketSize) {
    const end = Math.min(states.length, start + bucketSize)
    const summary = summarizePieceStates(states.slice(start, end))
    buckets.push({ start, end: end - 1, ...summary })
  }

  return buckets
}
