import { expect, test } from "vitest"

// `duration-*` sets transition-duration as well as animation-duration, and transition-property
// defaults to `all`. An entrance animation without a transition-* utility therefore also
// animates every later style change of that element (theme switches, layout) for its duration.
const sources = import.meta.glob<string>(["./**/*.tsx", "!./ui/**", "!./**/*.test.tsx"], { query: "?raw", import: "default", eager: true })

// Class strings that sit next to a transition utility in another string of the same cn() call.
const ALLOWED = new Set([
  "./torrents/torrent-list-view.tsx: shouldAnimateEntrance (row base classes set transition-colors)",
])

test("入场动画同时声明过渡属性，避免 duration-* 让所有属性变化都过渡", () => {
  const offenders: string[] = []
  for (const [file, source] of Object.entries(sources)) {
    source.split("\n").forEach((line, index) => {
      for (const match of line.matchAll(/"([^"]*animate-in[^"]*)"|`([^`]*animate-in[^`]*)`/g)) {
        const classes = (match[1] ?? match[2]).split(/\s+/)
        const hasDuration = classes.some((name) => /^(data-\[[^\]]+\]:)?duration-\d+$/.test(name))
        const hasTransition = classes.some((name) => /(^|:)transition/.test(name))
        if (!hasDuration || hasTransition) continue
        const allowed = [...ALLOWED].some((entry) => entry.startsWith(`${file}:`) && line.includes(entry.split(": ")[1].split(" ")[0]))
        if (!allowed) offenders.push(`${file}:${index + 1}`)
      }
    })
  }
  expect(offenders).toEqual([])
})
