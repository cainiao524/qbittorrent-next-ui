import { describe, expect, test } from "vitest"
import { MIN_REFRESH_INTERVAL, normalizeRefreshInterval } from "./refresh-interval"

describe("normalizeRefreshInterval", () => {
  test("clamps finite values to the supported minimum", () => {
    expect(normalizeRefreshInterval(0)).toBe(MIN_REFRESH_INTERVAL)
    expect(normalizeRefreshInterval(-100)).toBe(MIN_REFRESH_INTERVAL)
    expect(normalizeRefreshInterval(750.4)).toBe(750)
  })

  test("uses the fallback for non-finite values", () => {
    expect(normalizeRefreshInterval(Number.NaN, 1200)).toBe(1200)
    expect(normalizeRefreshInterval(Number.POSITIVE_INFINITY, 1200)).toBe(1200)
  })
})
