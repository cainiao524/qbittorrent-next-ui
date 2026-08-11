import { describe, expect, test } from "vitest"
import { getTorrentProgressMetrics } from "@/lib/torrent-progress"

describe("getTorrentProgressMetrics", () => {
  test("全部选中时进度与后端完成度一致", () => {
    expect(getTorrentProgressMetrics({ size: 100, totalSize: 100, percentDone: 0.5 })).toEqual({
      selectedSize: 100,
      totalSize: 100,
      progressRatio: 0.5,
      completedSelected: 50,
      selectionRatio: 1,
      isPartialDownload: false,
    })
  })

  test("部分下载分别计算选中内容完成度与选择比例", () => {
    expect(getTorrentProgressMetrics({ size: 40, totalSize: 100, percentDone: 0.5 })).toEqual({
      selectedSize: 40,
      totalSize: 100,
      progressRatio: 0.5,
      completedSelected: 20,
      selectionRatio: 0.4,
      isPartialDownload: true,
    })
  })

  test("限制异常完成度并容忍无效大小", () => {
    expect(getTorrentProgressMetrics({ size: Number.NaN, totalSize: -1, percentDone: 1.5 })).toMatchObject({
      selectedSize: 0,
      totalSize: 0,
      progressRatio: 1,
      completedSelected: 0,
      selectionRatio: 1,
      isPartialDownload: false,
    })
  })
})
