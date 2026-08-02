"use client"

import { Keyboard } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n-context"

export function KeyboardShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n()
  const shortcuts = [
    ["A", t("shortcuts.add", "打开添加种子窗口")],
    ["Ctrl/⌘ + A", t("shortcuts.select_all", "选择当前筛选结果")],
    ["Shift + 单击", t("shortcuts.range", "连续范围选择")],
    ["S", t("shortcuts.start", "开始选中的任务")],
    ["P", t("shortcuts.stop", "停止选中的任务")],
    ["Delete", t("shortcuts.delete", "删除选中的任务")],
    ["R", t("shortcuts.refresh", "刷新任务列表")],
    ["Esc", t("shortcuts.clear", "清除选择")],
    ["?", t("shortcuts.help", "显示快捷键说明")],
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-none bg-background/95 shadow-2xl backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl"><Keyboard className="h-5 w-5 text-primary" />{t("shortcuts.title", "键盘快捷键")}</DialogTitle>
          <DialogDescription>{t("shortcuts.description", "在任务页面使用；输入框和弹窗处于焦点时不会触发。")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {shortcuts.map(([key, description]) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-xl bg-muted/35 px-4 py-3">
              <span className="text-sm text-muted-foreground">{description}</span>
              <kbd className="shrink-0 rounded-lg border bg-background px-2.5 py-1 font-mono text-xs font-semibold shadow-sm">{key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
