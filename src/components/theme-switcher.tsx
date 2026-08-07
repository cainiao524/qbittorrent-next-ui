"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const themes = [
    { name: "light", icon: Sun, label: t("ui.theme_light") },
    { name: "dark", icon: Moon, label: t("ui.theme_dark") },
    { name: "system", icon: Monitor, label: t("ui.theme_system") },
  ]

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full h-10 w-10 relative"
        onClick={() => setOpen(!open)}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">{t("ui.toggle_theme")}</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border bg-background p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden backdrop-blur-md bg-background/90">
          <div className="flex flex-col gap-1">
            {themes.map((themeOption) => (
              <button
                key={themeOption.name}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  theme === themeOption.name
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => {
                  setTheme(themeOption.name)
                  setOpen(false)
                }}
              >
                <div className="flex items-center gap-3">
                  <themeOption.icon className="h-4 w-4" />
                  <span>{themeOption.label}</span>
                </div>
                {theme === themeOption.name && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
