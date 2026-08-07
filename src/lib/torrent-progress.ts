import { TorrentStatus, type Torrent } from "@/lib/rpc-types"

type ProgressTone = "error" | "download" | "downloadWait" | "seed" | "seedWait" | "check" | "stopped"

const PROGRESS_COLORS: Record<ProgressTone, { bar: string; stroke: string }> = {
  error: { bar: "bg-red-500/70 dark:bg-red-400/70", stroke: "stroke-red-500/70 dark:stroke-red-400/70" },
  download: { bar: "bg-emerald-500/70 dark:bg-emerald-400/70", stroke: "stroke-emerald-500/70 dark:stroke-emerald-400/70" },
  downloadWait: { bar: "bg-amber-500/70 dark:bg-amber-400/70", stroke: "stroke-amber-500/70 dark:stroke-amber-400/70" },
  seed: { bar: "bg-teal-500/70 dark:bg-teal-400/70", stroke: "stroke-teal-500/70 dark:stroke-teal-400/70" },
  seedWait: { bar: "bg-sky-500/70 dark:bg-sky-400/70", stroke: "stroke-sky-500/70 dark:stroke-sky-400/70" },
  check: { bar: "bg-violet-500/70 dark:bg-violet-400/70", stroke: "stroke-violet-500/70 dark:stroke-violet-400/70" },
  stopped: { bar: "bg-slate-400/70 dark:bg-slate-500/70", stroke: "stroke-slate-400/70 dark:stroke-slate-500/70" },
}

function getTorrentProgressTone(torrent: Pick<Torrent, "status" | "error" | "errorString">): ProgressTone {
  if (torrent.error > 0 || torrent.errorString) {
    return "error"
  }

  switch (torrent.status) {
    case TorrentStatus.DOWNLOAD:
      return "download"
    case TorrentStatus.DOWNLOAD_WAIT:
      return "downloadWait"
    case TorrentStatus.SEED:
      return "seed"
    case TorrentStatus.SEED_WAIT:
      return "seedWait"
    case TorrentStatus.CHECK:
    case TorrentStatus.CHECK_WAIT:
      return "check"
    default:
      return "stopped"
  }
}

export function getTorrentProgressColor(torrent: Pick<Torrent, "status" | "error" | "errorString">) {
  return PROGRESS_COLORS[getTorrentProgressTone(torrent)].bar
}

export function getTorrentProgressStrokeColor(torrent: Pick<Torrent, "status" | "error" | "errorString">) {
  return PROGRESS_COLORS[getTorrentProgressTone(torrent)].stroke
}
