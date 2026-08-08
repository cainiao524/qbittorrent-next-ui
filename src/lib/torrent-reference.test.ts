import { describe, expect, it } from "vitest"
import { MOCK_TORRENTS } from "./mock-data"
import { reuseTorrentReferences } from "./torrent-reference"
import type { Torrent } from "./rpc-types"

const baseTorrent: Torrent = {
  ...MOCK_TORRENTS[0],
  id: "reference-test",
  labels: ["one", "two"],
  seedsTotal: 10,
}

describe("reuseTorrentReferences", () => {
  it("reuses unchanged torrent and nested display data", () => {
    const next: Torrent = {
      ...baseTorrent,
      labels: [...(baseTorrent.labels ?? [])],
      trackerStats: baseTorrent.trackerStats?.map((tracker) => ({ ...tracker })),
    }

    const current = [baseTorrent]
    const result = reuseTorrentReferences(current, [next])

    expect(result).toBe(current)
    expect(result[0]).toBe(baseTorrent)
  })

  it("keeps new objects when required row fields change", () => {
    const changes: Array<Partial<Torrent>> = [
      { status: baseTorrent.status === 0 ? 4 : 0 },
      { percentDone: baseTorrent.percentDone + 0.01 },
      { size: baseTorrent.size + 1 },
      { totalSize: baseTorrent.totalSize + 1 },
      { downloadedEver: baseTorrent.downloadedEver + 1 },
      { rateDownload: baseTorrent.rateDownload + 1 },
      { rateUpload: baseTorrent.rateUpload + 1 },
      { uploadRatio: baseTorrent.uploadRatio + 0.01 },
      { name: `${baseTorrent.name} changed` },
      { downloadDir: `${baseTorrent.downloadDir}/changed` },
      { peersConnected: baseTorrent.peersConnected + 1 },
      { peersSendingToUs: baseTorrent.peersSendingToUs + 1 },
      { peersGettingFromUs: baseTorrent.peersGettingFromUs + 1 },
      { seedsTotal: (baseTorrent.seedsTotal ?? 0) + 1 },
    ]

    for (const change of changes) {
      const next = { ...baseTorrent, ...change }
      expect(reuseTorrentReferences([baseTorrent], [next])[0]).toBe(next)
    }
  })

  it("preserves the server order while reusing matching items", () => {
    const second = { ...baseTorrent, id: "reference-test-2" }
    const result = reuseTorrentReferences([baseTorrent, second], [{ ...second }, { ...baseTorrent }])

    expect(result).not.toBe([baseTorrent, second])
    expect(result).toEqual([second, baseTorrent])
    expect(result[0]).toBe(second)
    expect(result[1]).toBe(baseTorrent)
  })
})
