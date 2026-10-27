type LocaleTree = { [key: string]: string | LocaleTree }

function isTree(value: unknown): value is LocaleTree {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Deep-merges a backend locale overlay onto the shared locale strings. */
export function mergeLocale<T extends object>(base: T, overlay: object): T {
  const result: LocaleTree = { ...(base as LocaleTree) }
  for (const [key, value] of Object.entries(overlay)) {
    const current = result[key]
    result[key] = isTree(current) && isTree(value) ? mergeLocale(current, value) : value
  }
  return result as T
}
