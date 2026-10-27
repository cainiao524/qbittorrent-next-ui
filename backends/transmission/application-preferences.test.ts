import { describe, expect, test } from "vitest"

import { getPreferenceOptions } from "./application-preference-labels"
import {
  comparePreferenceKeys,
  getPreferenceCategory,
  getPreferenceChanges,
  isPreferenceApplicable,
  isWritablePreference,
  PREFERENCE_CATEGORY_ORDER,
} from "./application-preferences"

describe("Transmission 全部偏好设置元数据", () => {
  test("分类顺序先遵循官方 Web 偏好页，再展示扩展设置", () => {
    expect(PREFERENCE_CATEGORY_ORDER).toEqual([
      "torrents",
      "speed",
      "peers",
      "network",
      "automation",
      "advanced",
      "information",
    ])

    expect(getPreferenceCategory("download-dir")).toBe("torrents")
    expect(getPreferenceCategory("alt-speed-enabled")).toBe("speed")
    expect(getPreferenceCategory("pex-enabled")).toBe("peers")
    expect(getPreferenceCategory("peer-port")).toBe("network")
    expect(getPreferenceCategory("script-torrent-done-enabled")).toBe("automation")
    expect(getPreferenceCategory("cache-size-mib")).toBe("advanced")
    expect(getPreferenceCategory("version")).toBe("information")
  })

  test("分类和列序同时兼容 Transmission 4.1 下划线字段", () => {
    expect(getPreferenceCategory("download_dir")).toBe("torrents")
    expect(getPreferenceCategory("peer_port")).toBe("network")

    const keys = ["peer_port", "incomplete_dir", "download_dir", "start_added_torrents"]
    expect(keys.sort(comparePreferenceKeys)).toEqual([
      "download_dir",
      "incomplete_dir",
      "start_added_torrents",
      "peer_port",
    ])
  })

  test("只过滤 RPC 明确声明为只读的会话属性", () => {
    expect(isWritablePreference("seed-ratio-limit")).toBe(true)
    expect(isWritablePreference("script_torrent_done_enabled")).toBe(true)
    expect(isWritablePreference("version")).toBe(false)
    expect(isWritablePreference("rpc_version_semver")).toBe(false)
    expect(isWritablePreference("session-id")).toBe(false)

    expect(getPreferenceChanges(
      { "seed-ratio-limit": 1, version: "4.1.2" },
      { "seed-ratio-limit": 2, version: "4.1.3" },
    )).toEqual({ "seed-ratio-limit": 2 })
  })

  test("依赖项关闭时禁用字段，并兼容两种字段命名", () => {
    expect(isPreferenceApplicable("seed-ratio-limit", {
      "seed-ratio-limited": false,
    })).toBe(false)
    expect(isPreferenceApplicable("seed_ratio_limit", {
      seed_ratio_limited: true,
    })).toBe(true)
  })

  test("枚举值覆盖限速日期和新旧加密字段", () => {
    expect(getPreferenceOptions("alt-speed-time-day", "zh")?.map(({ value }) => value))
      .toEqual([127, 62, 65, 1, 2, 4, 8, 16, 32, 64])
    expect(getPreferenceOptions("encryption", "en", "allowed")?.map(({ value }) => value))
      .toEqual(["preferred", "allowed", "required"])
    expect(getPreferenceOptions("encryption", "en", "tolerated")?.map(({ value }) => value))
      .toEqual(["preferred", "tolerated", "required"])
  })
})
