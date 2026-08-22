"use client"

import * as React from "react"
import { Languages, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all",
            isOpen && "bg-muted text-primary"
          )}
          title={t("ui.language")}
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-48 rounded-2xl border bg-background/90 p-2 shadow-xl backdrop-blur-md duration-200 motion-reduce:animate-none"
      >
        <div className="flex flex-col gap-1">
          <DropdownMenuItem
            onSelect={() => setLocale("en")}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium",
              locale === "en" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )}
          >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-4 text-center">EN</span>
                <span>English</span>
              </div>
              {locale === "en" && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setLocale("zh")}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium",
              locale === "zh" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )}
          >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-4 text-center">ZH</span>
                <span>简体中文</span>
              </div>
              {locale === "zh" && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
