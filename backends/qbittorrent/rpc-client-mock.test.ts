import { describe, expect, test } from "vitest"
import type { Torrent } from "@/lib/rpc-types"
import { rpc } from "./rpc-client-mock"

describe("demo RPC metadata", () => {
  test("supports the add torrent dialog metadata requests", async () => {
    const categories = await rpc.getTorrentCategories()
    expect(categories.map((category) => category.name)).toEqual(["Movies", "TV", "Linux ISO", "Music"])
    await expect(rpc.getTorrentTags()).resolves.toEqual([])
  })

  test("demo torrents carry categories that match their folder", async () => {
    const { torrents } = await rpc.getTorrents(["category", "downloadDir"]) as { torrents: Torrent[] }
    const categorized = torrents.filter((torrent) => torrent.category)
    expect(categorized.length).toBeGreaterThan(0)
    expect(categorized.every((torrent) => torrent.category === "Linux ISO" ? torrent.downloadDir.includes("/iso") : torrent.downloadDir.toLowerCase().includes(torrent.category!.toLowerCase()))).toBe(true)
  })
})
