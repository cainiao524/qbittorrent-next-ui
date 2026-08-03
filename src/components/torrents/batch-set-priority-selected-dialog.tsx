"use client"

import * as React from "react"
import { Gauge, RefreshCw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { rpc } from "@/lib/rpc-client"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"
import type { TorrentId } from "@/lib/rpc-types"

type TorrentBandwidthPriority = -1 | 0 | 1

interface BatchSetPrioritySelectedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: TorrentId[]
  onSuccess?: () => void
}

const PRIORITY_OPTIONS: { value: TorrentBandwidthPriority; labelKey: string }[] = [
  { value: -1, labelKey: "common.priority_low" },
  { value: 0, labelKey: "common.priority_normal" },
  { value: 1, labelKey: "common.priority_high" },
]

export function BatchSetPrioritySelectedDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BatchSetPrioritySelectedDialogProps) {
  const { t } = useI18n()
  const [priority, setPriority] = React.useState<TorrentBandwidthPriority>(0)
  const [isApplying, setIsApplying] = React.useState(false)

  React.useEffect(() => {
    if (open) setPriority(0)
  }, [open])

  const handleApply = async () => {
    if (!selectedIds.length) return
    setIsApplying(true)
    try {
      await rpc.setTorrent(selectedIds, { bandwidthPriority: priority })
      toast.success(t("common.set_priority_success", { count: selectedIds.length }))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Batch set priority failed:", error)
      toast.error(t("common.action_failed"))
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!isApplying) onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl bg-card border border-muted/20 p-0 overflow-hidden flex flex-col max-h-[calc(100svh-2rem)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-muted/50 bg-muted/20 shrink-0">
          <div>
            <DialogTitle className="text-2xl font-medium tracking-tight">
              {t("common.set_torrent_priority")}
            </DialogTitle>
            <DialogDescription className="text-base font-medium opacity-70">
              {t("common.set_torrent_priority_desc", { count: selectedIds.length })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
              {t("common.bandwidth_priority")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={cn(
                    "h-12 rounded-2xl text-sm font-bold transition-all border",
                    priority === option.value
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 text-muted-foreground border-muted/30 hover:bg-muted/50"
                  )}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t border-muted/50 shrink-0">
          <Button
            className="w-full h-12 rounded-2xl font-medium tracking-widest uppercase transition-all shadow-lg shadow-primary/20 bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs"
            onClick={handleApply}
            disabled={isApplying || selectedIds.length === 0}
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Gauge className="h-4 w-4 mr-2" />
                {t("common.set_priority_confirm", { count: selectedIds.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
