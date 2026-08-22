import { describe, expect, test } from "vitest"

import {
  comparePreferenceKeys,
  getPreferenceCategory,
  getPreferenceChanges,
  getPreferenceDependencyKeys,
  isPreferenceApplicable,
  isConnectionCriticalPreference,
  isSensitivePreference,
  PREFERENCE_CATEGORY_ORDER,
} from "./application-preferences"

describe("application preference helpers", () => {
  test("groups version-dependent preferences into useful sections", () => {
    expect(getPreferenceCategory("locale")).toBe("behavior")
    expect(getPreferenceCategory("save_path")).toBe("downloads")
    expect(getPreferenceCategory("alt_dl_limit")).toBe("speed")
    expect(getPreferenceCategory("proxy_ip")).toBe("connection")
    expect(getPreferenceCategory("max_active_torrents")).toBe("bittorrent")
    expect(getPreferenceCategory("dht")).toBe("bittorrent")
    expect(getPreferenceCategory("web_ui_port")).toBe("webui")
    expect(getPreferenceCategory("rss_refresh_interval")).toBe("rss")
    expect(getPreferenceCategory("mail_notification_enabled")).toBe("downloads")
    expect(getPreferenceCategory("file_log_enabled")).toBe("behavior")
    expect(getPreferenceCategory("current_network_interface")).toBe("advanced")
    expect(getPreferenceCategory("torrent_content_layout")).toBe("downloads")
    expect(getPreferenceCategory("future_setting")).toBe("advanced")
  })

  test("sorts categories and fields in the official preferences order", () => {
    expect(PREFERENCE_CATEGORY_ORDER).toEqual([
      "behavior",
      "downloads",
      "connection",
      "speed",
      "bittorrent",
      "rss",
      "webui",
      "advanced",
    ])
    expect(["up_limit", "scheduler_enabled", "dl_limit", "future_speed"]
      .sort(comparePreferenceKeys)).toEqual([
        "dl_limit",
        "up_limit",
        "scheduler_enabled",
        "future_speed",
      ])
  })

  test("exposes official parent controls for dependent settings", () => {
    expect(getPreferenceDependencyKeys("temp_path")).toEqual(["temp_path_enabled"])
    expect(isPreferenceApplicable("temp_path", { temp_path_enabled: false })).toBe(false)
    expect(isPreferenceApplicable("temp_path", { temp_path_enabled: true })).toBe(true)
    expect(isPreferenceApplicable("mail_notification_username", {
      mail_notification_enabled: true,
      mail_notification_auth_enabled: false,
    })).toBe(false)
  })

  test("returns only changed values including structured settings", () => {
    const original = {
      dht: true,
      listen_port: 6881,
      scan_dirs: { "/watch": 0 },
    }
    const draft = {
      dht: false,
      listen_port: 6881,
      scan_dirs: { "/watch": "/downloads" },
    }

    expect(getPreferenceChanges(original, draft)).toEqual({
      dht: false,
      scan_dirs: { "/watch": "/downloads" },
    })
  })

  test("identifies sensitive and connection-critical preferences", () => {
    expect(isSensitivePreference("proxy_password")).toBe(true)
    expect(isSensitivePreference("save_path")).toBe(false)
    expect(isConnectionCriticalPreference("web_ui_port")).toBe(true)
    expect(isConnectionCriticalPreference("dht")).toBe(false)
  })
})
