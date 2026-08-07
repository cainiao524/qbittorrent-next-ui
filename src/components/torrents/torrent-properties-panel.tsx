import { Boxes, Clock3, Network, RadioTower } from "lucide-react"

import { formatDuration, formatSize, formatSpeed } from "@/lib/formatters"
import { useI18n } from "@/lib/i18n-context"
import type { Torrent } from "@/lib/rpc-types"

function Property({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-muted/20 py-2.5 last:border-0"><span className="text-xs text-muted-foreground">{label}</span><span className="break-all text-right text-xs font-medium tabular-nums">{value}</span></div>
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-muted/30 bg-muted/10 p-4"><h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{icon}{title}</h4>{children}</div>
}

export function TorrentPropertiesPanel({ torrent: tor }: { torrent: Torrent }) {
  const { t, locale } = useI18n()
  const state = (value: boolean | undefined) => value ? <span className="text-green-500">{t("torrent_properties.enabled")}</span> : <span className="text-muted-foreground">{t("torrent_properties.disabled")}</span>
  const limit = (mode: number | undefined, value: number | undefined, unit = "") => mode === 0 ? t("torrent_properties.global") : mode === 2 ? t("torrent_properties.unlimited") : `${value ?? 0}${unit}`
  return (
    <div className="col-span-full grid gap-4 border-t border-muted/20 pt-6 md:grid-cols-2 xl:grid-cols-4">
      <Group title={t("torrent_properties.runtime")} icon={<RadioTower className="h-4 w-4" />}>
        <Property label={t("torrent_properties.force_start")} value={state(tor.forceStart)} />
        <Property label={t("torrent_properties.super_seeding")} value={state(tor.superSeeding)} />
        <Property label={t("torrent_properties.auto_management")} value={state(tor.autoManagement)} />
        <Property label={t("torrent_properties.sequential")} value={state(tor.sequentialDownload)} />
        <Property label={t("torrent_properties.first_last")} value={state(tor.firstLastPiecePriority)} />
        <Property label={t("torrent_properties.ratio_limit")} value={limit(tor.seedRatioMode, tor.seedRatioLimit)} />
        <Property label={t("torrent_properties.seeding_limit")} value={limit(tor.seedingTimeMode, tor.seedingTimeLimit, t("torrent_properties.minutes"))} />
        <Property label={t("torrent_properties.inactive_limit")} value={limit(tor.inactiveSeedingTimeMode, tor.inactiveSeedingTimeLimit, t("torrent_properties.minutes"))} />
        <Property label={t("torrent_properties.limit_action")} value={({ Default: t("torrent_properties.action_default"), Stop: t("torrent_properties.action_stop"), Remove: t("torrent_properties.action_remove"), RemoveWithContent: t("torrent_properties.action_remove_files"), EnableSuperSeeding: t("torrent_properties.action_super") } as const)[tor.shareLimitAction ?? "Default"]} />
      </Group>
      <Group title={t("torrent_properties.connections_time")} icon={<Network className="h-4 w-4" />}>
        <Property label={t("torrent_properties.connections_limit")} value={`${tor.peersConnected} / ${tor.connectionsLimit || "∞"}`} />
        <Property label={t("torrent_properties.seeds_total")} value={tor.seedsTotal ?? 0} />
        <Property label={t("torrent_properties.peers_total")} value={tor.peersTotal ?? 0} />
        <Property label={t("torrent_properties.active_time")} value={formatDuration(tor.timeElapsed ?? 0, locale)} />
        <Property label={t("torrent_properties.seeding_time")} value={formatDuration(tor.seedingTime ?? 0, locale)} />
        <Property label={t("torrent_properties.next_announce")} value={formatDuration(tor.nextAnnounce ?? 0, locale)} />
      </Group>
      <Group title={t("torrent_properties.pieces_availability")} icon={<Boxes className="h-4 w-4" />}>
        <Property label={t("torrent_properties.pieces_have")} value={`${tor.piecesHave ?? 0} / ${tor.piecesCount ?? 0}`} />
        <Property label={t("torrent_properties.piece_size")} value={formatSize(tor.pieceSize ?? 0)} />
        <Property label={t("torrent_properties.availability")} value={(tor.availability ?? 0).toFixed(3)} />
        <Property label={t("torrent_properties.popularity")} value={(tor.popularity ?? 0).toFixed(3)} />
        <Property label={t("torrent_properties.wasted")} value={formatSize(tor.wastedSize ?? 0)} />
      </Group>
      <Group title={t("torrent_properties.session_transfer")} icon={<Clock3 className="h-4 w-4" />}>
        <Property label={t("torrent_properties.downloaded")} value={formatSize(tor.downloadedSession ?? 0)} />
        <Property label={t("torrent_properties.uploaded")} value={formatSize(tor.uploadedSession ?? 0)} />
        <Property label={t("torrent_properties.average_download")} value={formatSpeed(tor.averageDownloadSpeed ?? 0)} />
        <Property label={t("torrent_properties.average_upload")} value={formatSpeed(tor.averageUploadSpeed ?? 0)} />
        <Property label={t("torrent_properties.last_seen_complete")} value={tor.lastSeenComplete ? new Date(tor.lastSeenComplete * 1000).toLocaleString(locale) : t("torrent_properties.never")} />
        <Property label={t("torrent_properties.download_path")} value={tor.downloadPath || t("torrent_properties.not_enabled")} />
      </Group>
    </div>
  )
}
