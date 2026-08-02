import { describe, expect, test } from "vitest"
import { formatPeerRegion, peerCountryFlag } from "./peer-region"

describe("用户国家地区", () => {
  test("把两位国家代码转换为旗帜", () => {
    expect(peerCountryFlag("cn")).toBe("🇨🇳")
    expect(peerCountryFlag("--")).toBe("")
  })

  test("优先使用浏览器本地化地区名称并保留回退值", () => {
    expect(formatPeerRegion("JP", "Japan", "zh-CN")).toContain("日本")
    expect(formatPeerRegion(undefined, "局域网", "zh-CN")).toBe("局域网")
    expect(formatPeerRegion(undefined, "Local network", "zh-CN")).toBe("本地网络")
    expect(formatPeerRegion()).toBe("未知")
  })
})
