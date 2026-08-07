import { describe, expect, it } from "vitest"

import en from "@/locales/en.json"
import zh from "@/locales/zh.json"

function flattenLocale(tree: Record<string, unknown>, prefix = "", result: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      result[fullKey] = value
    } else if (value && typeof value === "object") {
      flattenLocale(value as Record<string, unknown>, fullKey, result)
    }
  }
  return result
}

function placeholders(value: string) {
  return Array.from(value.matchAll(/\{([^{}]+)\}/g), (match) => match[1]).sort()
}

describe("locale resources", () => {
  const english = flattenLocale(en)
  const chinese = flattenLocale(zh)

  it("keeps English and Chinese keys aligned", () => {
    expect(Object.keys(chinese).sort()).toEqual(Object.keys(english).sort())
  })

  it("keeps interpolation placeholders aligned", () => {
    for (const key of Object.keys(english)) {
      expect(placeholders(chinese[key]), key).toEqual(placeholders(english[key]))
    }
  })

  it("contains no damaged Chinese text", () => {
    for (const [key, value] of Object.entries(chinese)) {
      expect(value, key).not.toContain("�")
      expect(value, key).not.toMatch(/\?{2,}/)
    }
  })
})
