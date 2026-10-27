import { describe, expect, test } from "vitest"
import { rpc } from "./rpc-client-mock"

describe("demo RPC metadata", () => {
  test("supports the add torrent dialog metadata requests", async () => {
    await expect(rpc.getTorrentCategories()).resolves.toEqual([])
    await expect(rpc.getTorrentTags()).resolves.toEqual([])
  })
})
