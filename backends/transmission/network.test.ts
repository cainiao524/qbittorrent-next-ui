import { describe, expect, test } from "vitest"

import { isPrivateNetworkHost } from "./network"

describe("内网地址识别", () => {
  test.each([
    "localhost",
    "nas.local",
    "127.0.0.1",
    "10.0.0.8",
    "172.16.0.8",
    "172.31.255.254",
    "192.168.1.10",
    "::1",
    "fd12::8",
    "fe80::1",
  ])("将 %s 识别为内网", (hostname) => {
    expect(isPrivateNetworkHost(hostname)).toBe(true)
  })

  test.each(["example.com", "8.8.8.8", "172.15.0.1", "172.32.0.1", "192.169.1.1"])(
    "不将 %s 识别为内网",
    (hostname) => {
      expect(isPrivateNetworkHost(hostname)).toBe(false)
    },
  )
})
