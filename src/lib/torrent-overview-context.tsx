"use client"

import * as React from "react"
import type { TorrentOverview } from "@/lib/torrent-list-utils"

export type FacetKind = "tracker" | "dir" | "label" | "category"

interface TorrentOverviewContextType {
  overview: TorrentOverview | null
  setOverview: (overview: TorrentOverview) => void
  trackerFilter: string[]
  dirFilter: string[]
  labelFilter: string[]
  categoryFilter: string[]
  toggleFacet: (kind: FacetKind, value: string) => void
  clearFilters: () => void
}

const TorrentOverviewContext = React.createContext<TorrentOverviewContextType | undefined>(undefined)

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

/**
 * Shares list-wide counts and the tracker / directory / label filters between the
 * torrent list and the sidebar, so both stay in sync across status routes.
 */
export function TorrentOverviewProvider({ children }: { children: React.ReactNode }) {
  const [overview, setOverview] = React.useState<TorrentOverview | null>(null)
  const [trackerFilter, setTrackerFilter] = React.useState<string[]>([])
  const [dirFilter, setDirFilter] = React.useState<string[]>([])
  const [labelFilter, setLabelFilter] = React.useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([])

  const toggleFacet = React.useCallback((kind: FacetKind, value: string) => {
    if (kind === "tracker") setTrackerFilter((current) => toggleValue(current, value))
    else if (kind === "dir") setDirFilter((current) => toggleValue(current, value))
    else if (kind === "label") setLabelFilter((current) => toggleValue(current, value))
    else setCategoryFilter((current) => toggleValue(current, value))
  }, [])

  const clearFilters = React.useCallback(() => {
    setTrackerFilter([])
    setDirFilter([])
    setLabelFilter([])
    setCategoryFilter([])
  }, [])

  const value = React.useMemo(() => ({
    overview,
    setOverview,
    trackerFilter,
    dirFilter,
    labelFilter,
    categoryFilter,
    toggleFacet,
    clearFilters,
  }), [overview, trackerFilter, dirFilter, labelFilter, categoryFilter, toggleFacet, clearFilters])

  return <TorrentOverviewContext.Provider value={value}>{children}</TorrentOverviewContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTorrentOverview() {
  const context = React.useContext(TorrentOverviewContext)
  if (context === undefined) {
    throw new Error("useTorrentOverview must be used within a TorrentOverviewProvider")
  }
  return context
}
