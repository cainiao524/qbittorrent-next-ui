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

describe("backend locale overlays", () => {
  const overlays = import.meta.glob<Record<string, unknown>>("../../backends/*/locales/*.json", { eager: true, import: "default" })
  const sharedKeys = new Set(Object.keys(flattenLocale(en)))
  // Strings for backend-only features may live in a single backend's overlay.
  const backendOnlyPrefixes = ["creator."]

  it("provide every backend-specific string that is missing from the shared locale", () => {
    const overlayKeys = Object.values(overlays).flatMap((overlay) => Object.keys(flattenLocale(overlay)))
    const required = new Set(overlayKeys.filter((key) => !sharedKeys.has(key) && !backendOnlyPrefixes.some((prefix) => key.startsWith(prefix))))
    for (const [file, overlay] of Object.entries(overlays)) {
      const keys = new Set(Object.keys(flattenLocale(overlay)))
      for (const key of required) expect(keys.has(key), `${file}: ${key}`).toBe(true)
    }
  })

  it("keeps each backend's English and Chinese overlays aligned", () => {
    const byBackend = new Map<string, Record<string, Record<string, string>>>()
    for (const [file, overlay] of Object.entries(overlays)) {
      const [, backend, locale] = file.match(/backends\/([^/]+)\/locales\/(\w+)\.json$/) ?? []
      byBackend.set(backend, { ...byBackend.get(backend), [locale]: flattenLocale(overlay) })
    }
    expect(byBackend.size).toBeGreaterThanOrEqual(2)
    for (const [backend, locales] of byBackend) {
      expect(Object.keys(locales.zh).sort(), backend).toEqual(Object.keys(locales.en).sort())
    }
  })
})
