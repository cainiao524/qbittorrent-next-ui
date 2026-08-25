import { Check, Minus } from "lucide-react"
import { useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import { formatSize } from "@/lib/formatters"
import { useI18n } from "@/lib/i18n-context"
import type { TorrentMetainfoFile } from "@/lib/torrent-metainfo"
import { cn } from "@/lib/utils"

interface TorrentFileSelectorProps {
  files: TorrentMetainfoFile[]
  selectedFileIndexes: number[]
  onSelectionChange: (indexes: number[]) => void
}

const VIRTUALIZATION_THRESHOLD = 100

function SelectionCheckbox({ checked }: { checked: boolean | "mixed" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
        checked ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/40",
      )}
    >
      {checked === true ? <Check className="h-3 w-3" /> : checked === "mixed" ? <Minus className="h-3 w-3" /> : null}
    </span>
  )
}

export function TorrentFileSelector({ files, selectedFileIndexes, onSelectionChange }: TorrentFileSelectorProps) {
  const { t } = useI18n()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const fileListRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = files.length >= VIRTUALIZATION_THRESHOLD
  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => fileListRef.current,
    estimateSize: () => 44,
    enabled: detailsOpen && shouldVirtualize,
    initialRect: { width: 0, height: 224 },
    overscan: 8,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const renderedVirtualRows = virtualRows.length > 0
    ? virtualRows
    : Array.from({ length: Math.min(files.length, 14) }, (_, index) => ({ index, start: index * 44 }))
  const selected = new Set(selectedFileIndexes)
  const selectedCount = files.reduce((count, file) => count + Number(selected.has(file.index)), 0)
  const allSelected = files.length > 0 && selectedCount === files.length
  const someSelected = selectedCount > 0
  const selectedBytes = files.reduce((total, file) => total + (selected.has(file.index) ? file.length : 0), 0)

  const toggleFile = (index: number) => {
    onSelectionChange(
      selected.has(index)
        ? selectedFileIndexes.filter((fileIndex) => fileIndex !== index)
        : [...selectedFileIndexes, index].sort((left, right) => left - right),
    )
  }

  return (
    <div className="overflow-hidden border-t border-border/50">
      <button
        type="button"
        role="checkbox"
        aria-checked={allSelected ? true : someSelected ? "mixed" : false}
        className="flex min-h-11 w-full items-center gap-3 bg-muted/20 px-3 text-left text-xs font-medium hover:bg-muted/40"
        onClick={() => onSelectionChange(allSelected ? [] : files.map((file) => file.index))}
      >
        <SelectionCheckbox checked={allSelected ? true : someSelected ? "mixed" : false} />
        <span className="flex-1">{t("add_dialog.select_all")}</span>
        <span className="text-right text-muted-foreground">
          {t("add_dialog.selection_summary", { selected: selectedCount, total: files.length, size: formatSize(selectedBytes) })}
        </span>
      </button>

      <div className="border-t border-border/40">
        <button
          type="button"
          aria-expanded={detailsOpen}
          className="flex min-h-10 w-full items-center px-3 text-left text-xs text-muted-foreground hover:bg-muted/30"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <span>{t("common.file_details")}</span>
          <span className="ml-auto">{detailsOpen ? t("common.collapse") : t("common.expand")}</span>
        </button>
        {detailsOpen ? (
          <div ref={fileListRef} data-file-list-virtualized={shouldVirtualize ? "true" : "false"} className="h-56 overflow-y-auto border-t border-border/40">
            {shouldVirtualize ? (
              <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {renderedVirtualRows.map((virtualRow) => {
                  const file = files[virtualRow.index]
                  const checked = selected.has(file.index)
                  return (
                    <button
                      key={file.index}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      className="absolute left-0 top-0 flex min-h-11 w-full items-center gap-3 border-b border-border/30 px-3 py-2 text-left last:border-0 hover:bg-muted/30"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                      onClick={() => toggleFile(file.index)}
                    >
                      <SelectionCheckbox checked={checked} />
                      <span className="min-w-0 flex-1 break-all text-xs" title={file.path}>{file.path}</span>
                      <span className="w-20 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{formatSize(file.length)}</span>
                    </button>
                  )
                })}
              </div>
            ) : files.map((file) => {
              const checked = selected.has(file.index)
              return (
                <button
                  key={file.index}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  className="flex min-h-11 w-full items-center gap-3 border-b border-border/30 px-3 py-2 text-left last:border-0 hover:bg-muted/30"
                  onClick={() => toggleFile(file.index)}
                >
                  <SelectionCheckbox checked={checked} />
                  <span className="min-w-0 flex-1 break-all text-xs" title={file.path}>{file.path}</span>
                  <span className="w-20 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{formatSize(file.length)}</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
