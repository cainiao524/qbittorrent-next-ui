import { describe, expect, test } from "vitest"
import { aggregatePieceStates, summarizePieceStates } from "./piece-states"

describe("种子文件块状态", () => {
  test("统计未完成、下载中和已完成区块", () => {
    expect(summarizePieceStates([0, 0, 1, 2, 2, 2])).toEqual({
      total: 6,
      missing: 2,
      downloading: 1,
      complete: 3,
    })
  })

  test("大型区块数组按上限聚合且不丢失数据", () => {
    const states = Array.from({ length: 25_000 }, (_, index) => index % 3) as Array<0 | 1 | 2>
    const buckets = aggregatePieceStates(states, 384)

    expect(buckets.length).toBeLessThanOrEqual(384)
    expect(buckets.reduce((total, bucket) => total + bucket.total, 0)).toBe(states.length)
    expect(buckets[0].start).toBe(0)
    expect(buckets.at(-1)?.end).toBe(states.length - 1)
  })
})
