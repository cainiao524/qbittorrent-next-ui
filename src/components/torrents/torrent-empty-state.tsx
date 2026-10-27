"use client"

import { Inbox, Plus, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"

interface TorrentEmptyStateProps {
  /** Whether the client has any torrents at all, before status / search / facet filtering. */
  hasTorrents: boolean
  /** Whether a search query or a tracker / folder / label filter is narrowing the list. */
  isFiltered: boolean
  onAdd: () => void
  onClearFilters: () => void
}

export function TorrentEmptyState({ hasTorrents, isFiltered, onAdd, onClearFilters }: TorrentEmptyStateProps) {
  const { t } = useI18n()
  const variant = !hasTorrents ? "none" : isFiltered ? "no_match" : "status"
  const Icon = variant === "no_match" ? SearchX : Inbox

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-muted/50 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold">{t(`empty.${variant}_title`)}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t(`empty.${variant}_desc`)}</p>
      </div>
      {variant === "none" && (
        <Button size="sm" className="mt-2 gap-1.5 rounded-lg" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {t("common.add_torrent", "添加种子")}
        </Button>
      )}
      {variant === "no_match" && (
        <Button size="sm" variant="secondary" className="mt-2 rounded-lg" onClick={onClearFilters}>
          {t("empty.clear")}
        </Button>
      )}
    </div>
  )
}
