import { useMemo, useState } from "react"
import {
  Ban,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  Folder,
  FolderOpen,
  LoaderCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatSize } from "@/lib/formatters"
import { useI18n } from "@/lib/i18n-context"
import type { TorrentFile, TorrentFilePriority } from "@/lib/rpc-types"
import { buildTorrentFileTree, getTorrentFolderKeys, type TorrentFileTreeNode } from "@/lib/torrent-file-tree"
import { cn } from "@/lib/utils"

const PRIORITIES: TorrentFilePriority[] = [0, 1, 6, 7]

interface TorrentFileTreeProps {
  files: TorrentFile[]
  updatingFileIds: ReadonlySet<number>
  onPriorityChange: (fileIds: number[], priority: TorrentFilePriority) => void
}

export function TorrentFileTree({ files, updatingFileIds, onPriorityChange }: TorrentFileTreeProps) {
  const { t } = useI18n()
  const tree = useMemo(() => buildTorrentFileTree(files), [files])
  const folderKeys = useMemo(() => getTorrentFolderKeys(tree), [tree])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folderKeys))

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

  const renderNodes = (nodes: TorrentFileTreeNode[], depth = 0): React.ReactNode => nodes.map((node) => {
    const isFolder = node.kind === "folder"
    const isExpanded = isFolder && expanded.has(node.key)
    const progress = node.length > 0 ? Math.min(100, node.bytesCompleted / node.length * 100) : 0
    const fileIds = node.files.map((file) => file.index)
    const isUpdating = fileIds.some((id) => updatingFileIds.has(id))

    return (
      <div key={node.key}>
        <div className="group grid min-h-14 grid-cols-[minmax(320px,1fr)_120px_minmax(180px,260px)_150px] items-center border-b border-muted/30 transition-colors last:border-b-0 hover:bg-muted/25">
          <div
            className="flex min-w-0 items-center gap-2.5 py-3 pr-4 font-medium"
            style={{ paddingLeft: `${24 + depth * 22}px` }}
          >
            {isFolder ? (
              <button
                type="button"
                className="flex min-w-0 items-center gap-2.5 text-left"
                onClick={() => toggleFolder(node.key)}
                aria-expanded={isExpanded}
              >
                {isExpanded
                  ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                {isExpanded
                  ? <FolderOpen className="size-4 shrink-0 text-emerald-500" />
                  : <Folder className="size-4 shrink-0 text-emerald-500" />}
                <span className="truncate">{node.name}</span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {node.files.length} {t("details.file_count")}
                </span>
              </button>
            ) : (
              <>
                <span className="w-4 shrink-0" />
                <FileText className="size-4 shrink-0 text-primary/55 transition-colors group-hover:text-primary" />
                <span className="truncate" title={node.path}>{node.name}</span>
              </>
            )}
          </div>

          <div className="pr-5 text-right text-xs font-medium tabular-nums text-muted-foreground">
            {formatSize(node.length)}
          </div>

          <div className="flex items-center gap-3 pr-6">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", node.priority === 0 ? "bg-muted-foreground/35" : "bg-primary")}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-12 text-right text-[11px] font-medium tabular-nums">{progress.toFixed(1)}%</span>
          </div>

          <div className="pr-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-between rounded-lg font-medium",
                    node.priority === 0 && "text-muted-foreground",
                    node.priority === 6 && "border-amber-500/30 text-amber-500",
                    node.priority === 7 && "border-emerald-500/30 text-emerald-500",
                  )}
                  disabled={isUpdating}
                  aria-label={`${node.name} ${t("details.priority")}`}
                >
                  {isUpdating ? <LoaderCircle className="animate-spin" /> : priorityLabel(node.priority)}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1.5">
                <DropdownMenuLabel>{isFolder ? t("details.folder_priority") : t("details.file_priority")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={node.priority === null ? "" : String(node.priority)}
                  onValueChange={(value) => onPriorityChange(fileIds, Number(value) as TorrentFilePriority)}
                >
                  {PRIORITIES.map((priority) => (
                    <DropdownMenuRadioItem key={priority} value={String(priority)} className="py-2">
                      {priority === 0 && <Ban className="text-muted-foreground" />}
                      <span>{priorityLabel(priority)}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isExpanded && renderNodes(node.children, depth + 1)}
      </div>
    )
  })

  if (!files.length) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">{t("details.no_files")}</div>
  }

  return (
    <div className="min-w-[850px] md:min-w-0">
      <div className="flex items-center justify-between gap-4 border-b border-muted/30 bg-muted/15 px-5 py-3 md:px-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Folder className="size-4 text-emerald-500" />
          <span>{files.length} {t("details.file_count")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set(folderKeys))}>
            <ChevronsUpDown /> {t("details.expand_all")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set())}>
            <ChevronsDownUp /> {t("details.collapse_all")}
          </Button>
        </div>
      </div>
      <div className="grid h-12 grid-cols-[minmax(320px,1fr)_120px_minmax(180px,260px)_150px] items-center bg-muted/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground md:text-xs">
        <div className="pl-6">{t("details.file_name")}</div>
        <div className="pr-5 text-right">{t("common.size", "Size")}</div>
        <div>{t("common.progress")}</div>
        <div>{t("details.priority")}</div>
      </div>
      {renderNodes(tree)}
    </div>
  )
}
