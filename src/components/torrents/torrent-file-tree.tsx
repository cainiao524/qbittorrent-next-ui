import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  Folder,
  FolderOpen,
  Info,
  ListChecks,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatSize } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/lib/i18n-context";
import type { TorrentFile, TorrentFilePriority } from "@/lib/rpc-types";
import {
  buildTorrentFileTree,
  collectTorrentFileIds,
  collapseVisibleNode,
  expandVisibleNode,
  flattenVisibleTorrentFileTree,
  getTorrentFileSearchKeys,
  getTorrentFolderKeys,
  type TorrentFileTreeNode,
  type TorrentFileTreeSort,
  type TorrentFileTreeSortKey,
  type VisibleTorrentFileTreeNode,
} from "@/lib/torrent-file-tree";
import { cn } from "@/lib/utils";

const PRIORITIES: TorrentFilePriority[] = [0, 1, 6, 7];
const ROW_HEIGHT = 56;
const MOBILE_ROW_HEIGHT = 49;

function CircularProgress({
  progress,
  priority,
  size = 26,
}: {
  progress: number;
  priority: TorrentFilePriority | null;
  size?: number;
}) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={progress.toFixed(1) + "%"}
    >
      <svg
        width={size}
        height={size}
        viewBox={"0 0 " + size + " " + size}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted/70"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={
            priority === 0 ? "stroke-muted-foreground/40" : "stroke-primary"
          }
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-foreground"
        style={{ fontSize: size * 0.34 }}
      >
        {Math.round(clamped)}
        <span
          className="text-muted-foreground"
          style={{ fontSize: size * 0.2 }}
        >
          %
        </span>
      </span>
    </div>
  );
}
const OVERSCAN = 8;
const noop = () => {};
interface FileRowProps {
  node: TorrentFileTreeNode;
  depth: number;
  isExpanded: boolean;
  progress: number;
  isUpdating: boolean;
  selected: boolean | "indeterminate";
  onToggleFolder: (key: string) => void;
  onToggleSelection: (node: TorrentFileTreeNode) => void;
}

interface DesktopFileRowProps extends FileRowProps {
  onPriorityChange: (fileIds: number[], priority: TorrentFilePriority) => void;
}

interface MobileFileRowProps extends FileRowProps {
  onOpenDetails: (node: TorrentFileTreeNode) => void;
}

function makePriorityLabel(t: (key: string, fallback?: string) => string) {
  return (priority: TorrentFilePriority | null) => {
    if (priority === null) return t("details.priority_mixed");
    if (priority === 0) return t("details.priority_skip");
    if (priority === 6) return t("details.priority_high");
    if (priority === 7) return t("details.priority_max");
    return t("details.priority_normal");
  };
}

const DesktopFileRow = memo(function DesktopFileRow({
  node,
  depth,
  isExpanded,
  progress,
  isUpdating,
  selected,
  onToggleFolder,
  onToggleSelection,
  onPriorityChange,
}: DesktopFileRowProps) {
  const { t } = useI18n();
  const isFolder = node.kind === "folder";
  const priorityLabel = makePriorityLabel(t);
  return (
    <div className="group grid h-14 grid-cols-[44px_minmax(320px,1fr)_120px_minmax(180px,260px)_150px_48px] items-center border-b border-muted/30 transition-colors hover:bg-muted/25">
      <div className="flex items-center justify-center">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelection(node)}
          disabled={isUpdating}
          aria-label={`${node.name} ${t("details.select_all")}`}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2.5 self-stretch pr-4 font-medium">
        {isFolder ? (
          <button
            type="button"
            className="flex h-full w-full min-w-0 items-center gap-2.5 text-left"
            style={{ paddingLeft: `${18 + depth * 22}px` }}
            onClick={() => onToggleFolder(node.key)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <Folder className="size-4 shrink-0 text-emerald-500" />
            )}
            <span className="truncate" title={node.path}>
              {node.name}
            </span>
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {node.fileCount}
            </span>
          </button>
        ) : (
          <div
            className="flex min-w-0 items-center gap-2.5"
            style={{ paddingLeft: `${18 + depth * 22}px` }}
          >
            <span className="w-4 shrink-0" />
            <FileText className="size-4 shrink-0 text-primary/55 group-hover:text-primary" />
            <span className="truncate" title={node.path}>
              {node.name}
            </span>
          </div>
        )}
      </div>
      <div className="pr-5 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {formatSize(node.length)}
      </div>
      <div className="flex items-center gap-3 pr-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              node.priority === 0 ? "bg-muted-foreground/35" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-12 text-right text-[11px] font-medium tabular-nums">
          {progress.toFixed(1)}%
        </span>
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
              {isUpdating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                priorityLabel(node.priority)
              )}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 p-1.5">
            <DropdownMenuLabel>
              {isFolder
                ? t("details.folder_priority")
                : t("details.file_priority")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={node.priority === null ? "" : String(node.priority)}
              onValueChange={(value) =>
                onPriorityChange(
                  collectTorrentFileIds(node),
                  Number(value) as TorrentFilePriority,
                )
              }
            >
              {PRIORITIES.map((priority) => (
                <DropdownMenuRadioItem
                  key={priority}
                  value={String(priority)}
                  className="py-2"
                >
                  {priority === 0 && <Ban className="text-muted-foreground" />}
                  <span>{priorityLabel(priority)}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="pr-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              disabled={isUpdating}
              aria-label={`${node.name} ${t("details.view_details")}`}
            >
              <Info className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-[min(420px,90vw)] overflow-hidden p-0"
          >
            <FileDetailPanel
              node={node}
              isExpanded={isExpanded}
              progress={progress}
              isUpdating={isUpdating}
              onToggleFolder={onToggleFolder}
              onPriorityChange={onPriorityChange}
              onClose={noop}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
});

const MobileFileRow = memo(function MobileFileRow({
  node,
  depth,
  isExpanded,
  progress,
  isUpdating,
  selected,
  onToggleFolder,
  onToggleSelection,
  onOpenDetails,
}: MobileFileRowProps) {
  const { t } = useI18n();
  const isFolder = node.kind === "folder";
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex h-12 items-center gap-2 border-b border-muted/30 px-3 transition-colors last:border-b-0 active:bg-muted/30",
        isFolder && "cursor-pointer",
      )}
      onClick={() => {
        if (isFolder) onToggleFolder(node.key);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (isFolder) onToggleFolder(node.key);
        }
      }}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelection(node)}
        disabled={isUpdating}
        onClick={(event) => event.stopPropagation()}
        aria-label={`${node.name} ${t("details.select_all")}`}
      />
      <div
        className="flex min-w-0 flex-1 items-center gap-2"
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {isFolder ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFolder(node.key);
            }}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <Folder className="size-4 shrink-0 text-emerald-500" />
            )}
            <span className="truncate text-sm font-medium" title={node.path}>
              {node.name}
            </span>
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {node.fileCount}
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="w-4 shrink-0" />
            <FileText className="size-4 shrink-0 text-primary/55" />
            <span className="truncate text-sm font-medium" title={node.path}>
              {node.name}
            </span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <CircularProgress progress={progress} priority={node.priority} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails(node);
          }}
          disabled={isUpdating}
          aria-label={`${node.name} ${t("details.view_details")}`}
        >
          <Info className="size-4" />
        </Button>
      </div>
    </div>
  );
});

interface FileDetailPanelProps {
  node: TorrentFileTreeNode;
  isExpanded: boolean;
  progress: number;
  isUpdating: boolean;
  onToggleFolder: (key: string) => void;
  onPriorityChange: (fileIds: number[], priority: TorrentFilePriority) => void;
  onClose: () => void;
}

const FileDetailPanel = memo(function FileDetailPanel({
  node,
  isExpanded,
  progress,
  isUpdating,
  onToggleFolder,
  onPriorityChange,
  onClose,
}: FileDetailPanelProps) {
  const { t } = useI18n();
  const isFolder = node.kind === "folder";
  const priorityLabel = makePriorityLabel(t);
  return (
    <>
      <div className="flex items-start gap-2.5 border-b border-muted/10 p-4 pb-3 pr-10">
        {isFolder ? (
          <Folder className="mt-0.5 size-5 shrink-0 text-emerald-500" />
        ) : (
          <FileText className="mt-0.5 size-5 shrink-0 text-primary/70" />
        )}
        <div className="min-w-0">
          <h4 className="break-words font-heading text-base font-medium leading-snug text-foreground">
            {node.name}
          </h4>
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
            {node.path}
          </p>
        </div>
      </div>
      <div className="flex max-h-[min(60vh,480px)] flex-col gap-4 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-4 rounded-xl border border-muted/30 bg-card/40 p-3">
          <CircularProgress
            size={64}
            progress={progress}
            priority={node.priority}
          />
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("common.size")}
              </p>
              <p className="mt-0.5 font-medium tabular-nums">
                {formatSize(node.length)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("details.total_downloaded")}
              </p>
              <p className="mt-0.5 font-medium tabular-nums">
                {formatSize(node.bytesCompleted)}
              </p>
            </div>
            {isFolder && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">
                  {t("details.file_count")}
                </p>
                <p className="mt-0.5 font-medium tabular-nums">
                  {node.fileCount}
                </p>
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {isFolder
              ? t("details.folder_priority")
              : t("details.file_priority")}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map((priority) => (
              <Button
                key={priority}
                variant={node.priority === priority ? "default" : "outline"}
                size="sm"
                className="h-9 px-1 text-[11px]"
                disabled={isUpdating}
                onClick={() =>
                  onPriorityChange(collectTorrentFileIds(node), priority)
                }
              >
                {priority === 0 && <Ban className="size-3.5" />}
                {priorityLabel(priority)}
              </Button>
            ))}
          </div>
        </div>
        {isFolder && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              onToggleFolder(node.key);
              onClose();
            }}
          >
            {isExpanded ? t("common.collapse") : t("common.expand")}
          </Button>
        )}
      </div>
    </>
  );
});

interface TorrentFileTreeProps {
  files: TorrentFile[];
  updatingFileIds: ReadonlySet<number>;
  onPriorityChange: (fileIds: number[], priority: TorrentFilePriority) => void;
}

function findScrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement;
  while (parent) {
    const overflow = getComputedStyle(parent).overflowY;
    if (
      (overflow === "auto" || overflow === "scroll") &&
      parent.scrollHeight > parent.clientHeight + 1
    )
      return parent;
    parent = parent.parentElement;
  }
  return window;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: TorrentFileTreeSortKey;
  sort: TorrentFileTreeSort;
  onSort: (key: TorrentFileTreeSortKey) => void;
  align?: "left" | "right";
}) {
  const Icon =
    sort.key !== sortKey
      ? ArrowUpDown
      : sort.direction === "asc"
        ? ArrowUp
        : ArrowDown;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-1.5 transition-colors hover:text-foreground",
        align === "right" && "justify-end",
      )}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <Icon
        className={cn(
          "size-3.5",
          sort.key === sortKey ? "text-primary" : "opacity-35",
        )}
      />
    </button>
  );
}

export function TorrentFileTree({
  files,
  updatingFileIds,
  onPriorityChange,
}: TorrentFileTreeProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const tree = useMemo(() => buildTorrentFileTree(files), [files]);
  const folderKeys = useMemo(() => getTorrentFolderKeys(tree), [tree]);
  const rootFolderKeys = useMemo(
    () => tree.filter((node) => node.kind === "folder").map((node) => node.key),
    [tree],
  );
  const fileIdsByKey = useMemo(() => {
    const map = new Map<string, number[]>();
    const visit = (node: TorrentFileTreeNode) => {
      const ids = node.file
        ? [node.file.index]
        : node.children.flatMap((child) => {
            visit(child);
            return map.get(child.key) ?? [];
          });
      map.set(node.key, ids);
    };
    tree.forEach(visit);
    return map;
  }, [tree]);
  const [selectedFileIds, setSelectedFileIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(rootFolderKeys),
  );
  const [query, setQuery] = useState("");
  const [detailNode, setDetailNode] = useState<TorrentFileTreeNode | null>(
    null,
  );
  const [sort, setSort] = useState<TorrentFileTreeSort>({
    key: "name",
    direction: "asc",
  });
  const deferredQuery = useDeferredValue(query);
  const searchKeys = useMemo(
    () => getTorrentFileSearchKeys(tree, deferredQuery),
    [deferredQuery, tree],
  );
  const nodeByKey = useMemo(() => {
    const map = new Map<string, TorrentFileTreeNode>();
    const stack = [...tree];
    while (stack.length) {
      const node = stack.pop()!;
      map.set(node.key, node);
      for (let index = node.children.length - 1; index >= 0; index--)
        stack.push(node.children[index]);
    }
    return map;
  }, [tree]);
  const [visibleNodes, setVisibleNodes] = useState<
    VisibleTorrentFileTreeNode[]
  >(() => flattenVisibleTorrentFileTree(tree, expanded, searchKeys, sort));
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);
  useEffect(() => {
    setVisibleNodes(
      flattenVisibleTorrentFileTree(
        tree,
        expandedRef.current,
        searchKeys,
        sort,
      ),
    );
  }, [searchKeys, sort, tree]);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const rowsRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const rowsScrollRef = useRef<HTMLDivElement>(null);

  const syncHorizontalScroll = (
    source: HTMLDivElement,
    target: HTMLDivElement | null,
  ) => {
    if (target && target.scrollLeft !== source.scrollLeft)
      target.scrollLeft = source.scrollLeft;
  };

  useEffect(() => {
    const rows = rowsRef.current;
    if (!rows) return;
    const scrollParent = findScrollParent(rows);
    let frame = 0;
    const updateRange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rowsRect = rows.getBoundingClientRect();
        const parentRect =
          scrollParent instanceof Window
            ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
            : scrollParent.getBoundingClientRect();
        setScrollTop(Math.max(0, parentRect.top - rowsRect.top));
        setViewportHeight(Math.max(1, parentRect.height));
      });
    };
    scrollParent.addEventListener("scroll", updateRange, { passive: true });
    window.addEventListener("resize", updateRange, { passive: true });
    const observer = new ResizeObserver(updateRange);
    observer.observe(rows);
    updateRange();
    return () => {
      cancelAnimationFrame(frame);
      scrollParent.removeEventListener("scroll", updateRange);
      window.removeEventListener("resize", updateRange);
      observer.disconnect();
    };
  }, [isMobile, visibleNodes.length]);

  const updateQuery = (value: string) => {
    setQuery(value);
    const keys = getTorrentFileSearchKeys(tree, value);
    if (!keys) return;
    setExpanded((current) => {
      const next = new Set(current);
      keys.forEach((key) => {
        if (key.startsWith("folder:")) next.add(key);
      });
      return next;
    });
  };

  const updateSort = (key: TorrentFileTreeSortKey) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    visibleNodes.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const renderedNodes = visibleNodes.slice(startIndex, endIndex);
  const mobileStartIndex = Math.max(
    0,
    Math.floor(scrollTop / MOBILE_ROW_HEIGHT) - OVERSCAN,
  );
  const mobileEndIndex = Math.min(
    visibleNodes.length,
    Math.ceil((scrollTop + viewportHeight) / MOBILE_ROW_HEIGHT) + OVERSCAN,
  );
  const mobileRenderedNodes = visibleNodes.slice(
    mobileStartIndex,
    mobileEndIndex,
  );
  const matchingFileCount = searchKeys
    ? [...searchKeys].filter((key) => key.startsWith("file:")).length
    : files.length;
  const globallyUpdating = updatingFileIds.size > 0;
  const selectedCountByKey = useMemo(() => {
    const counts = new Map<string, number>();
    fileIdsByKey.forEach((ids, key) => {
      let count = 0;
      for (const id of ids) {
        if (selectedFileIds.has(id)) count++;
      }
      counts.set(key, count);
    });
    return counts;
  }, [fileIdsByKey, selectedFileIds]);
  const allSelected = files.length > 0 && selectedFileIds.size === files.length;
  const someSelected = selectedFileIds.size > 0;

  const toggleFolder = useCallback(
    (key: string) => {
      const nextExpanded = new Set(expandedRef.current);
      if (nextExpanded.has(key)) nextExpanded.delete(key);
      else nextExpanded.add(key);
      const incremental =
        searchKeys === null && sort.key === "name" && sort.direction === "asc";
      startTransition(() => {
        setExpanded(nextExpanded);
        if (incremental) {
          setVisibleNodes((current) => {
            if (nextExpanded.has(key)) {
              const target = nodeByKey.get(key);
              if (!target) return current;
              return expandVisibleNode(current, target, key);
            }
            return collapseVisibleNode(current, key);
          });
        } else {
          setVisibleNodes(
            flattenVisibleTorrentFileTree(tree, nextExpanded, searchKeys, sort),
          );
        }
      });
    },
    [nodeByKey, searchKeys, sort, tree],
  );

  const toggleNodeSelection = useCallback(
    (node: TorrentFileTreeNode) => {
      const ids =
        fileIdsByKey.get(node.key) ?? (node.file ? [node.file.index] : []);
      if (!ids.length) return;
      setSelectedFileIds((current) => {
        const next = new Set(current);
        const allIncluded = ids.every((id) => next.has(id));
        if (allIncluded) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [fileIdsByKey],
  );

  const toggleSelectAll = () => {
    if (allSelected) setSelectedFileIds(new Set());
    else setSelectedFileIds(new Set(files.map((file) => file.index)));
  };

  const expandAllFolders = useCallback(() => {
    const next = new Set(folderKeys);
    startTransition(() => {
      setExpanded(next);
      setVisibleNodes(
        flattenVisibleTorrentFileTree(tree, next, searchKeys, sort),
      );
    });
  }, [folderKeys, searchKeys, sort, tree]);

  const collapseAllFolders = useCallback(() => {
    const next = new Set<string>();
    startTransition(() => {
      setExpanded(next);
      setVisibleNodes(
        flattenVisibleTorrentFileTree(tree, next, searchKeys, sort),
      );
    });
  }, [searchKeys, sort, tree]);

  const nodeSelection = (
    node: TorrentFileTreeNode,
  ): boolean | "indeterminate" => {
    const ids =
      fileIdsByKey.get(node.key) ?? (node.file ? [node.file.index] : []);
    const selectedCount = selectedCountByKey.get(node.key) ?? 0;
    if (selectedCount === 0) return false;
    if (selectedCount === ids.length) return true;
    return "indeterminate";
  };

  const priorityLabel = makePriorityLabel(t);
  const openDetails = useCallback((node: TorrentFileTreeNode) => {
    setDetailNode(node);
  }, []);
  const closeDetails = useCallback(() => setDetailNode(null), []);
  const handlePriorityChange = useCallback(
    (fileIds: number[], priority: TorrentFilePriority) => {
      onPriorityChange(fileIds, priority);
    },
    [onPriorityChange],
  );

  const sortKeyLabel = (key: TorrentFileTreeSortKey) => {
    if (key === "name") return t("details.file_name");
    if (key === "size") return t("common.size", "大小");
    if (key === "progress") return t("common.progress");
    return t("details.priority");
  };

  if (!files.length)
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        {t("details.no_files")}
      </div>
    );

  return (
    <div className="w-full min-w-0 rounded-2xl border border-muted/30 bg-card/35 shadow-sm">
      <div className="sticky top-[var(--detail-tabs-offset)] z-20 before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-background before:content-['']">
        <div className="overflow-hidden rounded-t-2xl border-b border-muted/30 bg-background/95 shadow-md shadow-black/5 backdrop-blur-xl dark:shadow-black/25">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-muted/30 bg-muted/15 px-5 py-3 md:px-6">
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <Folder className="size-4 text-emerald-500" />
                {files.length} {t("details.file_count")}
              </span>
              {searchKeys && (
                <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-600 dark:text-green-400">
                  {t("details.search_results", { count: matchingFileCount })}
                </span>
              )}
              {files.length >= 5000 && (
                <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                  {t("details.large_torrent_optimization")}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <div className="relative w-full max-w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder={t("details.search_files")}
                  className="h-9 rounded-xl bg-background/70 pl-9 pr-9 text-sm"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => updateQuery("")}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={expandAllFolders}>
                <ChevronsUpDown />
                {t("details.expand_all")}
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAllFolders}>
                <ChevronsDownUp />
                {t("details.collapse_all")}
              </Button>
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("details.sort_by", "排序方式")}
                    >
                      <ArrowUpDown />
                      {sortKeyLabel(sort.key)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 p-1.5">
                    <DropdownMenuLabel>
                      {t("details.sort_by", "排序方式")}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sort.key}
                      onValueChange={(value) =>
                        updateSort(value as TorrentFileTreeSortKey)
                      }
                    >
                      {(
                        [
                          "name",
                          "size",
                          "progress",
                          "priority",
                        ] as TorrentFileTreeSortKey[]
                      ).map((key) => (
                        <DropdownMenuRadioItem
                          key={key}
                          value={key}
                          className="py-2"
                        >
                          {sortKeyLabel(key)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {!isMobile && (
            <div
              ref={headerScrollRef}
              className="overflow-x-auto overscroll-x-contain touch-auto no-scrollbar md:overflow-visible"
              onScroll={(event) =>
                syncHorizontalScroll(event.currentTarget, rowsScrollRef.current)
              }
            >
              <div className="grid h-12 min-w-[900px] grid-cols-[44px_minmax(320px,1fr)_120px_minmax(180px,260px)_150px_48px] items-center border-b border-muted/30 bg-muted/30 text-[10px] font-medium uppercase tracking-widest text-muted-foreground md:min-w-0 md:text-xs">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label={t("details.select_all")}
                  />
                </div>
                <div className="pl-2">
                  <SortHeader
                    label={t("details.file_name")}
                    sortKey="name"
                    sort={sort}
                    onSort={updateSort}
                  />
                </div>
                <div className="pr-5">
                  <SortHeader
                    label={t("common.size", "大小")}
                    sortKey="size"
                    sort={sort}
                    onSort={updateSort}
                    align="right"
                  />
                </div>
                <div>
                  <SortHeader
                    label={t("common.progress")}
                    sortKey="progress"
                    sort={sort}
                    onSort={updateSort}
                  />
                </div>
                <div>
                  <SortHeader
                    label={t("details.priority")}
                    sortKey="priority"
                    sort={sort}
                    onSort={updateSort}
                  />
                </div>
                <div className="pr-3 text-right">
                  <Info className="ml-auto size-3.5 opacity-40" />
                  <span className="sr-only">{t("details.view_details")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isMobile && (
        <div
          ref={rowsScrollRef}
          className="overflow-x-auto overscroll-x-contain rounded-b-2xl touch-auto no-scrollbar md:overflow-visible"
          onScroll={(event) =>
            syncHorizontalScroll(event.currentTarget, headerScrollRef.current)
          }
        >
          <div className="min-w-[900px] md:min-w-0">
            <div
              ref={rowsRef}
              className="relative"
              style={{ height: `${visibleNodes.length * ROW_HEIGHT}px` }}
            >
              <div
                className="absolute inset-x-0 top-0"
                style={{
                  transform: `translateY(${startIndex * ROW_HEIGHT}px)`,
                }}
              >
                {renderedNodes.map(({ node, depth }) => {
                  const isFolder = node.kind === "folder";
                  const isExpanded = isFolder && expanded.has(node.key);
                  const progress =
                    node.length > 0
                      ? Math.min(100, (node.bytesCompleted / node.length) * 100)
                      : 0;
                  const isUpdating = node.file
                    ? updatingFileIds.has(node.file.index)
                    : globallyUpdating;
                  return (
                    <DesktopFileRow
                      key={node.key}
                      node={node}
                      depth={depth}
                      isExpanded={isExpanded}
                      progress={progress}
                      isUpdating={isUpdating}
                      selected={nodeSelection(node)}
                      onToggleFolder={toggleFolder}
                      onToggleSelection={toggleNodeSelection}
                      onPriorityChange={handlePriorityChange}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <>
          <div
            ref={rowsRef}
            className="relative"
            style={{ height: visibleNodes.length * MOBILE_ROW_HEIGHT }}
          >
            <div
              className="absolute inset-x-0 top-0"
              style={{
                transform:
                  "translateY(" + mobileStartIndex * MOBILE_ROW_HEIGHT + "px)",
              }}
            >
              {mobileRenderedNodes.map(({ node, depth }) => {
                const isFolder = node.kind === "folder";
                const isExpanded = isFolder && expanded.has(node.key);
                const progress =
                  node.length > 0
                    ? Math.min(100, (node.bytesCompleted / node.length) * 100)
                    : 0;
                const isUpdating = node.file
                  ? updatingFileIds.has(node.file.index)
                  : globallyUpdating;
                return (
                  <MobileFileRow
                    key={node.key}
                    node={node}
                    depth={depth}
                    isExpanded={isExpanded}
                    progress={progress}
                    isUpdating={isUpdating}
                    selected={nodeSelection(node)}
                    onToggleFolder={toggleFolder}
                    onToggleSelection={toggleNodeSelection}
                    onOpenDetails={openDetails}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
      {isMobile && (
        <Sheet
          open={detailNode !== null}
          onOpenChange={(open) => {
            if (!open) closeDetails();
          }}
        >
          <SheetContent
            side="bottom"
            className="gap-0 p-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            {detailNode &&
              (() => {
                const node = detailNode;
                const isFolder = node.kind === "folder";
                const isExpanded = isFolder && expanded.has(node.key);
                const progress =
                  node.length > 0
                    ? Math.min(100, (node.bytesCompleted / node.length) * 100)
                    : 0;
                const isUpdating = node.file
                  ? updatingFileIds.has(node.file.index)
                  : globallyUpdating;
                return (
                  <FileDetailPanel
                    node={node}
                    isExpanded={isExpanded}
                    progress={progress}
                    isUpdating={isUpdating}
                    onToggleFolder={toggleFolder}
                    onPriorityChange={handlePriorityChange}
                    onClose={closeDetails}
                  />
                );
              })()}
          </SheetContent>
        </Sheet>
      )}

      {someSelected && (
        <div className="selected-toolbar-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-full max-w-[calc(100%-2rem)] md:max-w-fit px-2 sm:px-0">
          <div className="relative rounded-[2.5rem] border border-primary/20 shadow-[0_8px_40px_rgba(var(--primary),0.15)]">
            <div className="selected-toolbar-bg absolute inset-0 rounded-[2.5rem] bg-background/80" />
            <div className="relative flex items-center gap-2 md:gap-6 px-3 py-2.5 md:px-6 md:py-4 justify-between md:justify-start">
              <div className="flex items-center gap-2 border-r pr-3 md:pr-6 mr-1 md:mr-2 shrink-0">
                <div className="bg-primary text-primary-foreground text-[10px] md:text-xs font-bold h-5 w-5 md:h-6 md:w-6 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                  {selectedFileIds.size}
                </div>
                <span className="text-sm font-bold tracking-tight hidden lg:inline">
                  {t("details.selected_files", { count: selectedFileIds.size })}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9 md:h-10 rounded-2xl md:rounded-xl font-bold gap-1.5 md:gap-2 px-2.5 md:px-4"
                    disabled={globallyUpdating}
                  >
                    <ListChecks className="h-4 w-4" />
                    {t("details.batch_priority")}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-44 p-1.5"
                >
                  <DropdownMenuLabel>
                    {t("details.batch_priority")}
                  </DropdownMenuLabel>
                  {PRIORITIES.map((priority) => (
                    <DropdownMenuItem
                      key={priority}
                      className="py-2"
                      onSelect={(event) => {
                        event.preventDefault();
                        onPriorityChange([...selectedFileIds], priority);
                      }}
                    >
                      {priority === 0 && (
                        <Ban className="text-muted-foreground" />
                      )}
                      <span>{priorityLabel(priority)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 md:h-9 md:w-9 rounded-full shrink-0 hover:bg-muted/50"
                onClick={() => setSelectedFileIds(new Set())}
                aria-label={t("details.clear_selection")}
              >
                <X className="h-4 w-4 opacity-50" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
