import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Ban, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, FileText, Folder, FolderOpen, LoaderCircle, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatSize } from "@/lib/formatters"
import { useI18n } from "@/lib/i18n-context"
import type { TorrentFile, TorrentFilePriority } from "@/lib/rpc-types"
import { buildTorrentFileTree, collectTorrentFileIds, flattenVisibleTorrentFileTree, getTorrentFileSearchKeys, getTorrentFolderKeys } from "@/lib/torrent-file-tree"
import { cn } from "@/lib/utils"

const PRIORITIES: TorrentFilePriority[] = [0, 1, 6, 7]
const ROW_HEIGHT = 56
const OVERSCAN = 8

interface TorrentFileTreeProps {
  files: TorrentFile[]
  updatingFileIds: ReadonlySet<number>
  onPriorityChange: (fileIds: number[], priority: TorrentFilePriority) => void
}

export function TorrentFileTree({ files, updatingFileIds, onPriorityChange }: TorrentFileTreeProps) {
  const { t } = useI18n()
  const tree = useMemo(() => buildTorrentFileTree(files), [files])
  const folderKeys = useMemo(() => getTorrentFolderKeys(tree), [tree])
  const rootFolderKeys = useMemo(() => tree.filter((node) => node.kind === "folder").map((node) => node.key), [tree])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(rootFolderKeys))
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const searchKeys = useMemo(() => getTorrentFileSearchKeys(tree, deferredQuery), [deferredQuery, tree])
  const visibleNodes = useMemo(() => flattenVisibleTorrentFileTree(tree, expanded, searchKeys), [expanded, searchKeys, tree])
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(560)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const updateHeight = () => setViewportHeight(viewport.clientHeight || 560)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const updateQuery = (value: string) => {
    setQuery(value)
    setScrollTop(0)
    viewportRef.current?.scrollTo({ top: 0 })
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(visibleNodes.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)
  const renderedNodes = visibleNodes.slice(startIndex, endIndex)
  const matchingFileCount = searchKeys ? [...searchKeys].filter((key) => key.startsWith("file:")).length : files.length
  const globallyUpdating = updatingFileIds.size > 0

  const toggleFolder = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const priorityLabel = (priority: TorrentFilePriority | null) => {
    if (priority === null) return t("details.priority_mixed")
    if (priority === 0) return t("details.priority_skip")
    if (priority === 6) return t("details.priority_high")
    if (priority === 7) return t("details.priority_max")
    return t("details.priority_normal")
  }

  if (!files.length) return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">{t("details.no_files")}</div>

  return (
    <div className="min-w-[850px] md:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-muted/30 bg-muted/15 px-5 py-3 md:px-6">
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-2"><Folder className="size-4 text-emerald-500" />{files.length} {t("details.file_count")}</span>
          {searchKeys && <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-600 dark:text-green-400">找到 {matchingFileCount} 个文件</span>}
          {files.length >= 5000 && <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">大型种子优化已启用</span>}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="relative w-full max-w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="搜索文件或路径" className="h-9 rounded-xl bg-background/70 pl-9 pr-9 text-sm" />
            {query && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => updateQuery("")}><X className="size-3.5" /></Button>}
          </div>
          <Button variant="ghost" size="sm" disabled={Boolean(searchKeys)} onClick={() => setExpanded(new Set(folderKeys))}><ChevronsUpDown />全部展开</Button>
          <Button variant="ghost" size="sm" disabled={Boolean(searchKeys)} onClick={() => setExpanded(new Set())}><ChevronsDownUp />全部折叠</Button>
        </div>
      </div>

      <div className="grid h-12 grid-cols-[minmax(320px,1fr)_120px_minmax(180px,260px)_150px] items-center bg-muted/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground md:text-xs">
        <div className="pl-6">{t("details.file_name")}</div><div className="pr-5 text-right">{t("common.size", "大小")}</div><div>{t("common.progress")}</div><div>{t("details.priority")}</div>
      </div>

      <div ref={viewportRef} className="h-[min(62vh,680px)] min-h-80 overflow-y-auto overscroll-contain" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div className="relative" style={{ height: `${visibleNodes.length * ROW_HEIGHT}px` }}>
          <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}>
            {renderedNodes.map(({ node, depth }) => {
              const isFolder = node.kind === "folder"
              const isExpanded = isFolder && (searchKeys !== null || expanded.has(node.key))
              const progress = node.length > 0 ? Math.min(100, node.bytesCompleted / node.length * 100) : 0
              const isUpdating = node.file ? updatingFileIds.has(node.file.index) : globallyUpdating
              return (
                <div key={node.key} className="group grid h-14 grid-cols-[minmax(320px,1fr)_120px_minmax(180px,260px)_150px] items-center border-b border-muted/30 transition-colors hover:bg-muted/25">
                  <div className="flex min-w-0 items-center gap-2.5 pr-4 font-medium" style={{ paddingLeft: `${24 + depth * 22}px` }}>
                    {isFolder ? <button type="button" className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => !searchKeys && toggleFolder(node.key)} aria-expanded={isExpanded}>
                      {isExpanded ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                      {isExpanded ? <FolderOpen className="size-4 shrink-0 text-emerald-500" /> : <Folder className="size-4 shrink-0 text-emerald-500" />}
                      <span className="truncate" title={node.path}>{node.name}</span><span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{node.fileCount}</span>
                    </button> : <><span className="w-4 shrink-0" /><FileText className="size-4 shrink-0 text-primary/55 group-hover:text-primary" /><span className="truncate" title={node.path}>{node.name}</span></>}
                  </div>
                  <div className="pr-5 text-right text-xs font-medium tabular-nums text-muted-foreground">{formatSize(node.length)}</div>
                  <div className="flex items-center gap-3 pr-6"><div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", node.priority === 0 ? "bg-muted-foreground/35" : "bg-primary")} style={{ width: `${progress}%` }} /></div><span className="w-12 text-right text-[11px] font-medium tabular-nums">{progress.toFixed(1)}%</span></div>
                  <div className="pr-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-between rounded-lg font-medium", node.priority === 0 && "text-muted-foreground", node.priority === 6 && "border-amber-500/30 text-amber-500", node.priority === 7 && "border-emerald-500/30 text-emerald-500")} disabled={isUpdating} aria-label={`${node.name} ${t("details.priority")}`}>{isUpdating ? <LoaderCircle className="animate-spin" /> : priorityLabel(node.priority)}<ChevronsUpDown className="opacity-50" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 p-1.5"><DropdownMenuLabel>{isFolder ? t("details.folder_priority") : t("details.file_priority")}</DropdownMenuLabel><DropdownMenuRadioGroup value={node.priority === null ? "" : String(node.priority)} onValueChange={(value) => onPriorityChange(collectTorrentFileIds(node), Number(value) as TorrentFilePriority)}>{PRIORITIES.map((priority) => <DropdownMenuRadioItem key={priority} value={String(priority)} className="py-2">{priority === 0 && <Ban className="text-muted-foreground" />}<span>{priorityLabel(priority)}</span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-muted/30 bg-muted/10 px-5 py-2 text-[10px] text-muted-foreground"><span>当前仅渲染 {renderedNodes.length} 行，共 {visibleNodes.length} 个可见节点</span><span>滚动时按需加载，不会一次创建全部文件行</span></div>
    </div>
  )
}
