"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      <ThemeMotion />
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

// 首次主题落定后才启用颜色过渡，避免加载时从默认主题渐变。
function ThemeMotion() {
  React.useEffect(() => {
    let readyFrame = 0
    const frame = requestAnimationFrame(() => {
      readyFrame = requestAnimationFrame(() => {
        document.documentElement.dataset.themeMotion = "ready"
      })
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(readyFrame)
      delete document.documentElement.dataset.themeMotion
    }
  }, [])
  return null
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
