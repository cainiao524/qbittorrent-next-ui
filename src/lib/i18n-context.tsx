"use client"

import * as React from "react"
import en from "@/locales/en.json"
import zh from "@/locales/zh.json"

type Locale = "en" | "zh"

const I18nContext = React.createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: (path: string, args?: Record<string, unknown> | string, defaultValue?: string) => string
} | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    const savedLocale = localStorage.getItem("qbittorrent-next-locale")
    if (savedLocale === "en" || savedLocale === "zh") return savedLocale
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en"
  })

  React.useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en"
  }, [locale])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem("qbittorrent-next-locale", l)
  }

  const t = (path: string, args?: Record<string, unknown> | string, defaultValue?: string): string => {
    const data = locale === "en" ? en : zh
    const fallbackData = locale === "en" ? zh : en
    const keys = path.split(".")
    let current: unknown = data
    let fallback: unknown = fallbackData
    for (const key of keys) {
      current = typeof current === 'object' && current !== null && key in current
        ? (current as Record<string, unknown>)[key]
        : undefined
      fallback = typeof fallback === 'object' && fallback !== null && key in fallback
        ? (fallback as Record<string, unknown>)[key]
        : undefined
    }

    let result = typeof current === "string"
      ? current
      : typeof fallback === "string"
        ? fallback
        : (typeof args === 'string' ? args : defaultValue) || path
    if (typeof args === 'object' && args !== null) {
      Object.entries(args).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
      })
    }

    return result
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = React.useContext(I18nContext)
  if (!context) throw new Error("useI18n must be used within I18nProvider")
  return context
}
