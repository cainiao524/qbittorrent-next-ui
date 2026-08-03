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
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"
import type { TorrentFilePriority } from "@/lib/rpc-types"

interface BatchSetFilePriorityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFileCount: number
  onConfirm: (priority: TorrentFilePriority) => void
}

const FILE_PRIORITIES: TorrentFilePriority[] = [0, 1, 6, 7]

export function BatchSetFilePriorityDialog({
  open,
  onOpenChange,
  selectedFileCount,
  onConfirm,
}: BatchSetFilePriorityDialogProps) {
  const { t } = useI18n()
  const [priority, setPriority] = React.useState<TorrentFilePriority>(1)
  const [isApplying, setIsApplying] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setPriority(1)
      setIsApplying(false)
    }
  }, [open])

  const priorityLabel = (value: TorrentFilePriority) => {
    if (value === 0) return t("details.priority_skip")
    if (value === 6) return t("details.priority_high")
    if (value === 7) return t("details.priority_max")
    return t("details.priority_normal")
  }

  const handleConfirm = () => {
    if (!selectedFileCount) return
    setIsApplying(true)
    onConfirm(priority)
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
              {t("details.batch_priority")}
            </DialogTitle>
            <DialogDescription className="text-base font-medium opacity-70">
              {t("details.batch_priority_desc", { count: selectedFileCount })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
              {t("details.priority")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FILE_PRIORITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={cn(
                    "h-12 rounded-2xl text-sm font-bold transition-all border",
                    priority === value
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 text-muted-foreground border-muted/30 hover:bg-muted/50"
                  )}
                >
                  {priorityLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t border-muted/50 shrink-0">
          <Button
            className="w-full h-12 rounded-2xl font-medium tracking-widest uppercase transition-all shadow-lg shadow-primary/20 bg-primary hover:scale-[1.01] active:scale-[0.99] text-xs"
            onClick={handleConfirm}
            disabled={isApplying || selectedFileCount === 0}
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Gauge className="h-4 w-4 mr-2" />
                {t("details.batch_priority_confirm", { count: selectedFileCount })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
