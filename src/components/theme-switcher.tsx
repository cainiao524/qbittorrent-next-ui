"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)

  const themes = [
    { name: "light", icon: Sun, label: t("ui.theme_light") },
    { name: "dark", icon: Moon, label: t("ui.theme_dark") },
    { name: "system", icon: Monitor, label: t("ui.theme_system") },
  ]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full h-10 w-10 relative",
            open && "bg-muted text-primary"
          )}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("ui.toggle_theme")}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-48 rounded-2xl border bg-background/90 p-2 shadow-xl backdrop-blur-md duration-200 motion-reduce:animate-none"
      >
        <div className="flex flex-col gap-1">
          {themes.map((themeOption) => (
            <DropdownMenuItem
              key={themeOption.name}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                theme === themeOption.name ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
              onSelect={() => setTheme(themeOption.name)}
            >
                <div className="flex items-center gap-3">
                  <themeOption.icon className="h-4 w-4" />
                  <span>{themeOption.label}</span>
                </div>
                {theme === themeOption.name && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
