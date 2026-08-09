"use client"

import { useState, useEffect, useMemo } from "react"
import { TORRENT_COLUMNS, DEFAULT_VISIBLE_COLUMNS, type ColumnConfig } from "@/lib/columns"
import { PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useI18n } from "@/lib/i18n-context"

export type LabeledColumnConfig = ColumnConfig & { label: string }

function normalizeVisibleColumns(columns: string[]) {
  const uniqueColumns = Array.from(new Set(columns.filter((column) => column !== "name")))
  return ["name", ...uniqueColumns]
}

const MIN_COLUMN_WIDTH = 72
const MAX_COLUMN_WIDTH = 720

const COLUMN_MIN_WIDTHS: Record<string, number> = {
  name: 280,
  status: 128,
  progress: 190,
  size: 140,
  totalSize: 136,
  addedDate: 176,
  editDate: 176,
  uploadedEver: 144,
  uploadRatio: 104,
  rateDownload: 140,
  rateUpload: 140,
  eta: 132,
  seeds: 112,
  peers: 112,
  category: 120,
  labels: 140,
  dateCreated: 176,
  timeElapsed: 144,
  lastSeenComplete: 180,
  availability: 120,
  tracker: 180,
  downloadedEver: 140,
  amountLeft: 140,
  doneDate: 176,
  downloadLimit: 144,
  uploadLimit: 144,
  downloadDir: 200,
}

function minimumColumnWidth(column: ColumnConfig) {
  return COLUMN_MIN_WIDTHS[column.id] ?? MIN_COLUMN_WIDTH
}

function defaultColumnWidth(column: ColumnConfig) {
  const minimumWidth = minimumColumnWidth(column)
  if (column.width.endsWith("px")) return Math.max(minimumWidth, Number.parseInt(column.width, 10))
  return Math.max(minimumWidth, Number.parseInt(column.minWidth ?? "0", 10) || 0, column.id === "name" ? 360 : 120)
}

function defaultColumnWidths() {
  return Object.fromEntries(TORRENT_COLUMNS.map((column) => [column.id, defaultColumnWidth(column)]))
}

function readColumnWidths() {
  const defaults = defaultColumnWidths()
  try {
    const saved = JSON.parse(localStorage.getItem("torrent-column-widths") ?? "{}") as Record<string, number>
    for (const column of TORRENT_COLUMNS) {
      const value = saved[column.id]
      if (Number.isFinite(value)) defaults[column.id] = Math.min(MAX_COLUMN_WIDTH, Math.max(minimumColumnWidth(column), Math.round(value)))
    }
  } catch { /* 使用默认列宽 */ }
  return defaults
}

export function useColumnManager() {
  const { t } = useI18n()

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('torrent-visible-columns')
    return saved ? normalizeVisibleColumns(JSON.parse(saved) as string[]) : DEFAULT_VISIBLE_COLUMNS
  })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(readColumnWidths)
  const [actionsColumnPinned, setActionsColumnPinned] = useState(
    () => localStorage.getItem("torrent-actions-column-pinned") !== "false"
  )

  const columnDnDSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  )

  useEffect(() => {
    localStorage.setItem('torrent-visible-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    localStorage.setItem("torrent-column-widths", JSON.stringify(columnWidths))
  }, [columnWidths])

  useEffect(() => {
    localStorage.setItem("torrent-actions-column-pinned", String(actionsColumnPinned))
  }, [actionsColumnPinned])

  const setColumnWidth = (id: string, width: number) => {
    const column = TORRENT_COLUMNS.find((item) => item.id === id)
    if (!column) return
    const nextWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(minimumColumnWidth(column), Math.round(width)))
    setColumnWidths((current) => current[id] === nextWidth ? current : { ...current, [id]: nextWidth })
  }

  const toggleColumn = (id: string) => {
    if (id === "name") return
    setVisibleColumns(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev
        return normalizeVisibleColumns(prev.filter(c => c !== id))
      }
      return normalizeVisibleColumns([...prev, id])
    })
  }

  const resetVisibleColumns = () => {
    setVisibleColumns(normalizeVisibleColumns(DEFAULT_VISIBLE_COLUMNS))
  }

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setVisibleColumns((prev) => {
      const oldIndex = prev.indexOf(String(active.id))
      const newIndex = prev.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return prev
      return normalizeVisibleColumns(arrayMove(prev, oldIndex, newIndex))
    })
  }

  const allColumns = useMemo<LabeledColumnConfig[]>(() =>
    TORRENT_COLUMNS.map(col => ({ ...col, label: t(col.labelKey, col.defaultLabel) })),
    [t]
  )

  const hiddenColumns = useMemo(
    () => allColumns.filter((column) => !visibleColumns.includes(column.id)),
    [allColumns, visibleColumns]
  )

  const orderedVisibleColumnConfigs = useMemo(
    () => visibleColumns
      .map((columnId) => allColumns.find((column) => column.id === columnId))
      .filter((column): column is LabeledColumnConfig => Boolean(column)),
    [allColumns, visibleColumns]
  )

  const tableMinWidth = useMemo(() => {
    const fixedWidths = 220
    const columnsWidth = visibleColumns.reduce((acc, id) => acc + (columnWidths[id] ?? MIN_COLUMN_WIDTH), 0)
    return fixedWidths + columnsWidth
  }, [columnWidths, visibleColumns])

  return {
    visibleColumns,
    columnDnDSensors,
    toggleColumn,
    resetVisibleColumns,
    handleColumnDragEnd,
    allColumns,
    hiddenColumns,
    orderedVisibleColumnConfigs,
    tableMinWidth,
    columnWidths,
    setColumnWidth,
    actionsColumnPinned,
    setActionsColumnPinned,
  }
}
