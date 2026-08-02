import * as React from "react"
import { Activity, Check, Gauge, Globe, Tag, X, Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EditTorrentFormState } from "@/lib/edit-torrent-form"

type Translate = (key: string, fallback?: string) => string

interface TabProps {
  form: EditTorrentFormState
  updateField: <K extends keyof EditTorrentFormState>(key: K, value: EditTorrentFormState[K]) => void
  toggleField: (
    key: "moveData" | "downloadLimited" | "uploadLimited" | "honorsSessionLimits"
  ) => void
  t: Translate
}

export function EditTorrentSpeedTab({ form, updateField, toggleField, t }: TabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{t("common.download_limit")}</label>
          <div className="relative flex items-center">
            <Input
              type="number"
              value={form.downloadLimit}
              onChange={(e) => updateField("downloadLimit", Number(e.target.value))}
              className={cn(
                "h-11 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary pl-10 transition-all",
                form.downloadLimited ? "bg-muted/40 ring-1 ring-primary/30 shadow-inner" : "bg-muted/10 opacity-50"
              )}
            />
            <Gauge className={cn(
              "absolute left-3.5 h-4 w-4 transition-all duration-300",
              form.downloadLimited ? "text-primary opacity-100 scale-110" : "text-muted-foreground opacity-30"
            )} />
          </div>
          <div className="flex items-center gap-2 px-1 cursor-pointer group" onClick={() => toggleField("downloadLimited")}>
            <div className={cn(
              "h-3.5 w-3.5 rounded border transition-all flex items-center justify-center",
              form.downloadLimited ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
            )}>
              {form.downloadLimited && <Check className="h-2.5 w-2.5" />}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t("common.enabled")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{t("common.upload_limit")}</label>
          <div className="relative flex items-center">
            <Input
              type="number"
              value={form.uploadLimit}
              onChange={(e) => updateField("uploadLimit", Number(e.target.value))}
              className={cn(
                "h-11 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary pl-10 transition-all",
                form.uploadLimited ? "bg-muted/40 ring-1 ring-primary/30 shadow-inner" : "bg-muted/10 opacity-50"
              )}
            />
            <Zap className={cn(
              "absolute left-3.5 h-4 w-4 transition-all duration-300",
              form.uploadLimited ? "text-primary opacity-100 scale-110" : "text-muted-foreground opacity-30"
            )} />
          </div>
          <div className="flex items-center gap-2 px-1 cursor-pointer group" onClick={() => toggleField("uploadLimited")}>
            <div className={cn(
              "h-3.5 w-3.5 rounded border transition-all flex items-center justify-center",
              form.uploadLimited ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
            )}>
              {form.uploadLimited && <Check className="h-2.5 w-2.5" />}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t("common.enabled")}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{t("common.bandwidth_priority")}</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: -1, label: t("common.priority_low") },
            { val: 0, label: t("common.priority_normal") },
            { val: 1, label: t("common.priority_high") },
          ].map((priority) => (
            <button
              key={priority.val}
              type="button"
              onClick={() => updateField("bandwidthPriority", priority.val)}
              className={cn(
                "h-10 rounded-xl text-xs font-bold transition-all border",
                form.bandwidthPriority === priority.val
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/10 border-transparent text-muted-foreground hover:bg-muted/30"
              )}
            >
              {priority.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-muted/10 cursor-pointer group hover:bg-muted/30 transition-all mt-2"
        onClick={() => toggleField("honorsSessionLimits")}
      >
        <div className={cn(
          "h-5 w-5 rounded-lg flex items-center justify-center transition-all",
          form.honorsSessionLimits ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/20"
        )}>
          {form.honorsSessionLimits && <Check className="h-3 w-3" />}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-tight">{t("common.honors_session_limits")}</span>
        </div>
      </div>
    </div>
  )
}

function LimitModeButtons({ mode, onChange }: { mode: number; onChange: (value: number) => void }) {
  return <div className="grid grid-cols-3 gap-2">
    {[
      { val: 0, label: "继承全局" },
      { val: 1, label: "自定义" },
      { val: 2, label: "无限制" },
    ].map((item) => (
      <button key={item.val} type="button" onClick={() => onChange(item.val)} className={cn("h-9 rounded-xl border text-[10px] font-bold transition-all", mode === item.val ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400" : "border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/40")}>{item.label}</button>
    ))}
  </div>
}

export function EditTorrentRatioTab({ form, updateField, t }: Omit<TabProps, "toggleField">) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center justify-between">
          <span>{t("common.seed_ratio_limit")}</span>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">{form.seedRatioLimit}</span>
        </label>
        <div className="space-y-3 p-3 rounded-2xl bg-muted/20 border border-muted/10">
          <Input
            type="number"
            step="0.1"
            value={form.seedRatioLimit}
            onChange={(e) => updateField("seedRatioLimit", Number(e.target.value))}
            className="h-10 rounded-xl bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <LimitModeButtons mode={form.seedRatioMode} onChange={(value) => updateField("seedRatioMode", value)} />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground"><span>做种时间限制</span><span className="rounded-full bg-green-500/10 px-2 py-0.5 font-mono text-[10px] text-green-600 dark:text-green-400">{form.seedingTimeLimit} 分钟</span></label>
        <div className="space-y-3 rounded-2xl border border-muted/10 bg-muted/20 p-3">
          <Input type="number" min="0" disabled={form.seedingTimeMode !== 1} value={form.seedingTimeLimit} onChange={(e) => updateField("seedingTimeLimit", Number(e.target.value))} className="h-10 rounded-xl border-none bg-background/50 disabled:opacity-40" />
          <LimitModeButtons mode={form.seedingTimeMode} onChange={(value) => updateField("seedingTimeMode", value)} />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center justify-between">
          <span>{t("common.seed_idle_limit")}</span>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">{form.seedIdleLimit} min</span>
        </label>
        <div className="space-y-3 p-3 rounded-2xl bg-muted/20 border border-muted/10">
          <Input
            type="number"
            min="0"
            disabled={form.seedIdleMode !== 1}
            value={form.seedIdleLimit}
            onChange={(e) => updateField("seedIdleLimit", Number(e.target.value))}
            className="h-10 rounded-xl bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <LimitModeButtons mode={form.seedIdleMode} onChange={(value) => updateField("seedIdleMode", value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">达到任一分享限制后</label>
        <select value={form.shareLimitAction} onChange={(event) => updateField("shareLimitAction", event.target.value as EditTorrentFormState["shareLimitAction"])} className="h-11 w-full rounded-xl border border-muted/20 bg-muted/20 px-3 text-sm">
          <option value="Default">继承全局动作</option>
          <option value="Stop">暂停任务</option>
          <option value="Remove">删除任务但保留文件</option>
          <option value="RemoveWithContent">删除任务和文件</option>
          <option value="EnableSuperSeeding">启用超级做种</option>
        </select>
      </div>
    </div>
  )
}

export function EditTorrentTrackersTab({ form, updateField, t }: Omit<TabProps, "toggleField">) {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
        <Globe className="h-3 w-3" /> {t("common.trackers_list")}
      </label>
      <textarea
        value={form.trackerList}
        onChange={(e) => updateField("trackerList", e.target.value)}
        className="w-full h-48 rounded-2xl bg-muted/20 border border-muted/20 focus:ring-1 focus:ring-primary outline-none p-4 text-sm font-mono leading-relaxed resize-none no-scrollbar"
        placeholder="https://tracker.example.com/announce"
      />
      <p className="text-[10px] text-muted-foreground/60 px-1 font-medium leading-normal italic">
        * {t("common.tracker_list_hint", "Enter one URL per line. Use a blank line to separate tracker tiers.")}
      </p>
    </div>
  )
}

export function EditTorrentLabelsTab({ form, updateField, t }: Omit<TabProps, "toggleField">) {
  const [draftLabel, setDraftLabel] = useLocalDraftLabel()

  const addLabel = () => {
    const label = draftLabel.trim()
    if (!label || form.labels.includes(label)) return

    updateField("labels", [...form.labels, label])
    setDraftLabel("")
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{t("common.labels")}</label>
        <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-muted/20 border border-muted/10 min-h-[44px]">
          {form.labels.map((label: string, i: number) => (
            <div key={i} className="flex items-center gap-1.5 p-1 px-2 bg-muted rounded-lg w-fit text-xs md:text-sm font-medium group animate-in zoom-in-95 duration-200">
              {label}
              <button
                type="button"
                onClick={() => updateField("labels", form.labels.filter((_: string, idx: number) => idx !== i))}
                className="p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <div className="relative flex-1 min-w-[120px]">
            <Input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addLabel()
                }
              }}
              className="h-8 border-none bg-transparent focus-visible:ring-0 px-1 text-xs font-medium placeholder:text-muted-foreground/30"
              placeholder={t("common.labels_placeholder")}
            />
          </div>
        </div>
      </div>

      {form.labels.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60 px-1 transition-all">
          Tip: Labels are stored as metadata in JSON format for compatibility.
        </p>
      )}
    </div>
  )
}

function useLocalDraftLabel() {
  return React.useState("")
}

// eslint-disable-next-line react-refresh/only-export-components
export const EDIT_TORRENT_ADVANCED_TABS = [
  { id: "speed", icon: Gauge },
  { id: "ratio", icon: Activity },
  { id: "trackers", icon: Globe },
  { id: "labels", icon: Tag },
] as const
