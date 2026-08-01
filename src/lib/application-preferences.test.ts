import { describe, expect, test } from "vitest"

import {
  getPreferenceCategory,
  getPreferenceChanges,
  isConnectionCriticalPreference,
  isSensitivePreference,
} from "./application-preferences"

describe("application preference helpers", () => {
  test("groups version-dependent preferences into useful sections", () => {
    expect(getPreferenceCategory("save_path")).toBe("downloads")
    expect(getPreferenceCategory("alt_dl_limit")).toBe("speed")
    expect(getPreferenceCategory("proxy_ip")).toBe("connection")
    expect(getPreferenceCategory("max_active_torrents")).toBe("queue")
    expect(getPreferenceCategory("dht")).toBe("bittorrent")
    expect(getPreferenceCategory("web_ui_port")).toBe("webui")
    expect(getPreferenceCategory("rss_refresh_interval")).toBe("rss")
    expect(getPreferenceCategory("mail_notification_enabled")).toBe("automation")
    expect(getPreferenceCategory("future_setting")).toBe("advanced")
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
