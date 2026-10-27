import { describe, expect, test } from "vitest"

import { getPreferenceLabel, getPreferenceOptions } from "./application-preference-labels"

describe("application preference labels", () => {
  test("provides Chinese names for common qBittorrent preferences", () => {
    expect(getPreferenceLabel("save_path", "zh")).toBe("默认保存路径")
    expect(getPreferenceLabel("web_ui_csrf_protection_enabled", "zh")).toBe("启用 WebUI 跨站请求伪造防护")
    expect(getPreferenceLabel("max_active_torrents", "zh")).toBe("最大活动种子数")
    expect(getPreferenceLabel("resume_data_storage_type", "zh")).toBe("恢复数据存储类型")
    expect(getPreferenceLabel("web_ui_reverse_proxy_enabled", "zh")).toBe("启用反向代理支持")
  })

  test("provides localized choices from qBittorrent preferences", () => {
    expect(getPreferenceOptions("encryption", "zh", 0)).toEqual([
      { value: 0, label: "允许加密" },
      { value: 1, label: "强制加密" },
      { value: 2, label: "禁用加密" },
    ])
    expect(getPreferenceOptions("torrent_content_layout", "zh", "Original")?.[1]).toEqual({
      value: "Subfolder",
      label: "创建子文件夹",
    })
    expect(getPreferenceOptions("proxy_type", "zh", -1)?.[0]).toEqual({ value: -1, label: "无" })
    expect(getPreferenceOptions("file_log_age_type", "zh", 0)?.[2]).toEqual({ value: 2, label: "年" })
    expect(getPreferenceOptions("save_path", "zh", "/downloads")).toBeUndefined()
  })

  test("keeps unknown version-specific preferences readable", () => {
    expect(getPreferenceLabel("future_cache_limit", "zh")).toBe("高级设置：FUTURE · 缓存 · 限制")
    expect(getPreferenceLabel("future_cache_limit", "en")).toBe("Future Cache Limit")
  })
})
