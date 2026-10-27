"use client"

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ChevronRight, Check } from "lucide-react"

import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n-context"
import { useTorrentOverview, type FacetKind } from "@/lib/torrent-overview-context"
import type { FacetCount } from "@/lib/torrent-list-utils"
import { APP_CONFIG } from "@/lib/config"

const LIST_ROUTES = new Set(["/", "/active", "/downloading", "/seeding", "/paused", "/errors"])
const COLLAPSED_LIMIT = 6
const STORAGE_KEY = "sidebar-facet-groups"

type GroupState = Record<FacetKind, boolean>
const DEFAULT_GROUP_STATE: GroupState = { category: true, tracker: true, dir: true, label: false }

function readGroupState(): GroupState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<GroupState> | null
    return { ...DEFAULT_GROUP_STATE, ...saved }
  } catch {
    return DEFAULT_GROUP_STATE
  }
}

function folderLabel(path: string) {
  const trimmed = path.replace(/[\\/]+$/, "")
  return trimmed.split(/[\\/]/).pop() || path
}

interface FacetGroupProps {
  kind: FacetKind
  title: string
  items: FacetCount[]
  selected: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (kind: FacetKind, value: string) => void
}

function FacetGroup({ kind, title, items, selected, open, onOpenChange, onToggle }: FacetGroupProps) {
  const { t } = useI18n()
  const [showAll, setShowAll] = React.useState(false)
  if (items.length === 0) return null
  const visible = showAll ? items : items.slice(0, COLLAPSED_LIMIT)

  return (
    <div className="px-2">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
        {title}
        {selected.length > 0 && <span className="ml-auto rounded bg-primary/10 px-1.5 text-[10px] text-primary">{selected.length}</span>}
      </button>
      {open && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {visible.map(({ value, count }) => {
            const active = selected.includes(value)
            return (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => onToggle(kind, value)}
                  aria-pressed={active}
                  title={value}
                  className={cn(
                    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors",
                    active ? "bg-primary/10 font-medium text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span className="flex w-4 shrink-0 justify-center">{active && <Check className="h-3.5 w-3.5" />}</span>
                  <span className="min-w-0 flex-1 truncate">{kind === "dir" ? folderLabel(value) : value}</span>
                  <span className="text-numeric shrink-0 text-xs text-muted-foreground">{count}</span>
                </button>
              </li>
            )
          })}
          {items.length > COLLAPSED_LIMIT && (
            <li>
              <button type="button" onClick={() => setShowAll(!showAll)} className="w-full px-8 py-1 text-left text-xs text-muted-foreground hover:text-foreground">
                {showAll ? t("filters.show_less") : t("filters.show_all", { count: items.length })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/** Tracker / folder / label filters in the sidebar, sharing state with the list toolbar. */
export function SidebarFacetGroups() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { overview, trackerFilter, dirFilter, labelFilter, categoryFilter, toggleFacet } = useTorrentOverview()
  const [groupState, setGroupState] = React.useState(readGroupState)

  if (!overview) return null

  const setGroupOpen = (kind: FacetKind, open: boolean) => {
    setGroupState((current) => {
      const next = { ...current, [kind]: open }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }

  const handleToggle = (kind: FacetKind, value: string) => {
    toggleFacet(kind, value)
    if (!LIST_ROUTES.has(pathname)) navigate("/")
  }

  const groups: { kind: FacetKind; title: string; items: FacetCount[]; selected: string[] }[] = [
    ...(APP_CONFIG.capabilities.categories
      ? [{ kind: "category" as const, title: t("filters.categories"), items: overview.categories, selected: categoryFilter }]
      : []),
    { kind: "tracker", title: t("filters.trackers"), items: overview.trackers, selected: trackerFilter },
    { kind: "dir", title: t("filters.dirs"), items: overview.downloadDirs, selected: dirFilter },
    { kind: "label", title: t("filters.labels"), items: overview.labels, selected: labelFilter },
  ]
  if (groups.every((group) => group.items.length === 0)) return null

  return (
    <SidebarGroup className="border-t border-muted/30 pt-3 group-data-[collapsible=icon]:hidden">
      <SidebarGroupContent className="flex flex-col gap-2">
        {groups.map((group) => (
          <FacetGroup
            key={group.kind}
            {...group}
            open={groupState[group.kind]}
            onOpenChange={(open) => setGroupOpen(group.kind, open)}
            onToggle={handleToggle}
          />
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
