import { expect, test } from "vitest"
import { rpc } from "@backend/rpc-client-mock"
import { APP_CONFIG } from "@/lib/config"
import { MOCK_TORRENTS } from "@/lib/mock-data"

const ids = [MOCK_TORRENTS[0].id]

test("demo mock 支持界面始终提供的批量与队列操作", async () => {
  await expect(rpc.verifyTorrents(ids)).resolves.not.toThrow()
  await expect(rpc.reannounceTorrents(ids)).resolves.not.toThrow()
  await expect(rpc.setForceStart(ids, true)).resolves.not.toThrow()
  for (const direction of ["top", "up", "down", "bottom"] as const) {
    await expect(rpc.changeQueuePriority(ids, direction)).resolves.not.toThrow()
  }
})

test("demo mock 只对后端声明不支持的功能报错", async () => {
  const { capabilities } = APP_CONFIG
  const outcomes = [
    [capabilities.piecePriorityToggles, () => rpc.toggleSequentialDownload(ids)],
    [capabilities.piecePriorityToggles, () => rpc.toggleFirstLastPiecePriority(ids)],
    [capabilities.superSeeding, () => rpc.setSuperSeeding(ids, true)],
    [capabilities.autoManagement, () => rpc.setAutoManagement(ids, true)],
  ] as const
  for (const [supported, call] of outcomes) {
    if (supported) await expect(call()).resolves.not.toThrow()
    else await expect(call()).rejects.toThrow()
  }
})
