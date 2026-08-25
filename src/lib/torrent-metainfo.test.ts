import bencode from "bencode"
import { expect, test } from "vitest"

import { parseTorrentMetainfo } from "./torrent-metainfo"

async function expectedTorrentId(data: Uint8Array, algorithm: "SHA-1" | "SHA-256") {
  const marker = new TextEncoder().encode("4:info")
  const markerIndex = data.findIndex((_, index) => marker.every((byte, offset) => data[index + offset] === byte))
  const infoStart = markerIndex + marker.length
  const infoEnd = data.length - 1
  const digest = await crypto.subtle.digest(algorithm, Uint8Array.from(data.subarray(infoStart, infoEnd)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 40)
}

test("parses a multi-file v1 torrent in backend file order", async () => {
  const data = bencode.encode({
    announce: "https://tracker.example/announce",
    info: {
      name: "Linux",
      files: [
        { length: 1024, path: ["images", "disk.iso"] },
        { length: 42, path: ["README.txt"] },
      ],
      "piece length": 16384,
      pieces: new Uint8Array(20),
    },
  })

  expect(parseTorrentMetainfo(data)).toEqual({
    name: "Linux",
    torrentId: await expectedTorrentId(data, "SHA-1"),
    files: [
      { index: 0, path: "Linux/images/disk.iso", length: 1024 },
      { index: 1, path: "Linux/README.txt", length: 42 },
    ],
  })
})

test("parses a single-file torrent", () => {
  const data = bencode.encode({ info: { name: "video.mkv", length: 2048 } })

  expect(parseTorrentMetainfo(data).files).toEqual([
    { index: 0, path: "video.mkv", length: 2048 },
  ])
})

test("parses a v2 file tree and derives qBittorrent's truncated v2 id", async () => {
  const data = bencode.encode({
    info: {
      name: "Media",
      "meta version": 2,
      "file tree": {
        audio: { "track.flac": { "": { length: 4096 } } },
        "cover.jpg": { "": { length: 512 } },
      },
    },
  })

  expect(parseTorrentMetainfo(data)).toEqual({
    name: "Media",
    torrentId: await expectedTorrentId(data, "SHA-256"),
    files: [
      { index: 0, path: "Media/audio/track.flac", length: 4096 },
      { index: 1, path: "Media/cover.jpg", length: 512 },
    ],
  })
})

test("rejects malformed metadata", () => {
  expect(() => parseTorrentMetainfo(bencode.encode({ announce: "tracker" }))).toThrow("missing its info dictionary")
})
