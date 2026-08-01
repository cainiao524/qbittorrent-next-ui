import { describe, expect, test } from "vitest"

import { getPreferenceLabel } from "./application-preference-labels"

describe("application preference labels", () => {
  test("provides Chinese names for common qBittorrent preferences", () => {
    expect(getPreferenceLabel("save_path", "zh")).toBe("默认保存路径")
    expect(getPreferenceLabel("web_ui_csrf_protection_enabled", "zh")).toBe("启用 WebUI 跨站请求伪造防护")
    expect(getPreferenceLabel("max_active_torrents", "zh")).toBe("最大活动种子数")
  })

  test("keeps unknown version-specific preferences readable", () => {
    expect(getPreferenceLabel("future_cache_limit", "zh")).toBe("高级设置：FUTURE · 缓存 · 限制")
    expect(getPreferenceLabel("future_cache_limit", "en")).toBe("Future Cache Limit")
  })
})
