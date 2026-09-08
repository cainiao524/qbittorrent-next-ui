import { expect, test } from "vitest"
import { sortTorrentEntries } from "./torrent-sort"

test("全部两万条任务先排序，分页切片仍保持全局顺序", () => {
  const entries = Array.from({ length: 20000 }, (_, i) => ({ id: String(i), value: 20000 - i }))
  const ascending = sortTorrentEntries(entries, "asc")
  expect(ascending.map(entry => entry.value)).toEqual(Array.from({ length: 20000 }, (_, i) => i + 1))
  expect(ascending.slice(100, 200).map(entry => entry.value)).toEqual(Array.from({ length: 100 }, (_, i) => i + 101))
  expect(sortTorrentEntries(entries, "desc")).toEqual(entries)
  expect(entries[0].value).toBe(20000)
})

test("同值顺序不受服务端返回顺序和升降序影响", () => {
  const entries = [{ id: "b", value: "相同" }, { id: "a", value: "相同" }]
  expect(sortTorrentEntries(entries, "asc").map(entry => entry.id)).toEqual(["a", "b"])
  expect(sortTorrentEntries([...entries].reverse(), "desc").map(entry => entry.id)).toEqual(["a", "b"])
})
