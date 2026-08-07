"use client"

import * as React from "react"
import { Clipboard, FileIcon, FileUp, FolderOpen, Link, Plus, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LocationInput } from "@/components/location-input"
import { rpc } from "@/lib/rpc-client"
import { useI18n } from "@/lib/i18n-context"
import type { TorrentAddArgs } from "@/lib/rpc-types"
import { cn } from "@/lib/utils"

interface AddTorrentDialogProps {
  children?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialFiles?: File[]
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
  reader.onerror = reject
})

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-green-500" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

export function AddTorrentDialog({ children, onSuccess, open: controlledOpen, onOpenChange, initialFiles }: AddTorrentDialogProps) {
  const { t } = useI18n()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [magnetLink, setMagnetLink] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [downloadPath, setDownloadPath] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([])
  const [availableTags, setAvailableTags] = React.useState<string[]>([])
  const [startImmediately, setStartImmediately] = React.useState(true)
  const [autoTMM, setAutoTMM] = React.useState(false)
  const [addToTop, setAddToTop] = React.useState(false)
  const [skipChecking, setSkipChecking] = React.useState(false)
  const [sequential, setSequential] = React.useState(false)
  const [firstLast, setFirstLast] = React.useState(false)
  const [forced, setForced] = React.useState(false)
  const [useDownloadPath, setUseDownloadPath] = React.useState(false)
  const [contentLayout, setContentLayout] = React.useState<TorrentAddArgs["contentLayout"]>("Original")
  const [rename, setRename] = React.useState("")
  const [upLimit, setUpLimit] = React.useState("")
  const [dlLimit, setDlLimit] = React.useState("")
  const [ratioLimit, setRatioLimit] = React.useState("")
  const [seedingTime, setSeedingTime] = React.useState("")
  const [inactiveTime, setInactiveTime] = React.useState("")
  const [shareAction, setShareAction] = React.useState<TorrentAddArgs["shareLimitAction"]>("Default")
  const [stopCondition, setStopCondition] = React.useState<TorrentAddArgs["stopCondition"]>("None")
  const [sslCertificate, setSslCertificate] = React.useState("")
  const [sslPrivateKey, setSslPrivateKey] = React.useState("")
  const [sslDhParams, setSslDhParams] = React.useState("")
  const [isDragging, setIsDragging] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const open = controlledOpen ?? internalOpen

  const setOpen = React.useCallback((value: boolean) => {
    if (!value) {
      setFiles([])
      setMagnetLink("")
      setIsDragging(false)
    }
    setInternalOpen(value)
    onOpenChange?.(value)
  }, [onOpenChange])

  React.useEffect(() => {
    if (!open) return
    if (initialFiles?.length) setFiles(initialFiles)
    void Promise.all([rpc.getSession(), rpc.getTorrentCategories(), rpc.getTorrentTags()]).then(([session, categories, remoteTags]) => {
      setLocation((current) => current || session["download-dir"] || "")
      setAvailableCategories(categories.map((item) => item.name))
      setAvailableTags(remoteTags)
    }).catch(() => undefined)
  }, [initialFiles, open])

  const addFiles = (input: File[]) => {
    const torrentFiles = input.filter((file) => file.name.toLowerCase().endsWith(".torrent"))
    if (torrentFiles.length !== input.length) toast.info(t("add_dialog.ignored_files"))
    setFiles((current) => [...current, ...torrentFiles])
  }

  const links = magnetLink.split(/[\r\n]+/).map((item) => item.trim()).filter(Boolean)
  const itemCount = links.length + files.length
  const numeric = (value: string, multiplier = 1) => value.trim() === "" ? undefined : Number(value) * multiplier

  const commonArgs = (): TorrentAddArgs => ({
    "download-dir": location.trim() || undefined,
    paused: !startImmediately,
    category: category.trim() || undefined,
    tags,
    autoTMM,
    addToTopOfQueue: addToTop,
    skipChecking,
    sequentialDownload: sequential,
    firstLastPiecePrio: firstLast,
    forced: startImmediately && forced,
    contentLayout,
    rename: itemCount === 1 ? rename.trim() || undefined : undefined,
    useDownloadPath: autoTMM ? undefined : useDownloadPath,
    downloadPath: !autoTMM && useDownloadPath ? downloadPath.trim() : undefined,
    upLimit: numeric(upLimit, 1024),
    dlLimit: numeric(dlLimit, 1024),
    ratioLimit: numeric(ratioLimit),
    seedingTimeLimit: numeric(seedingTime),
    inactiveSeedingTimeLimit: numeric(inactiveTime),
    shareLimitAction: shareAction,
    stopCondition,
    sslCertificate: sslCertificate.trim() || undefined,
    sslPrivateKey: sslPrivateKey.trim() || undefined,
    sslDhParams: sslDhParams.trim() || undefined,
  })

  const handleSubmit = async () => {
    if (!itemCount) return toast.error(t("add_dialog.missing_input"))
    setIsAdding(true)
    try {
      for (const link of links) await rpc.addTorrent({ ...commonArgs(), filename: link })
      for (const file of files) await rpc.addTorrent({ ...commonArgs(), metainfo: await toBase64(file) })
      toast.success(t("add_dialog.submitted", { count: itemCount }))
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error(t("add_dialog.failed"), { description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-5 overflow-hidden border-none bg-background/95 p-6 shadow-2xl backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl">{t("add_dialog.title")}</DialogTitle>
          <DialogDescription>{t("add_dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-1">
          <input ref={fileInputRef} type="file" accept=".torrent" multiple className="hidden" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = "" }} />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(Array.from(event.dataTransfer.files)) }}
            className={cn("flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-5 transition-colors", isDragging ? "border-green-500 bg-green-500/10" : "border-muted-foreground/20 hover:border-green-500/50")}
          >
            <FileUp className="h-6 w-6 text-green-500" />
            <div><p className="text-sm font-medium">{t("add_dialog.drop_title")}</p><p className="text-xs text-muted-foreground">{t("add_dialog.drop_desc")}</p></div>
          </div>
          {files.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/30 p-2.5">
              <FileIcon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}</div>}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium"><Link className="h-4 w-4" />{t("add_dialog.link_label")}</label>
            <div className="relative">
              <Textarea value={magnetLink} onChange={(event) => setMagnetLink(event.target.value)} placeholder={t("add_dialog.link_placeholder")} className="min-h-24 pr-12 font-mono text-xs" />
              <Button variant="ghost" size="icon" className="absolute bottom-2 right-2" onClick={() => void navigator.clipboard.readText().then((text) => setMagnetLink((current) => current ? `${current}\n${text}` : text))}><Clipboard className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><label className="flex items-center gap-2 text-sm font-medium"><FolderOpen className="h-4 w-4" />{t("add_dialog.save_path")}</label><LocationInput value={location} onChange={setLocation} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.category")}</label><Input list="torrent-category-list" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={t("add_dialog.category_placeholder")} /><datalist id="torrent-category-list">{availableCategories.map((item) => <option key={item} value={item} />)}</datalist></div>
            <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.tags")}</label><Input value={tags.join(", ")} onChange={(event) => setTags(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder={t("add_dialog.tags_placeholder")} /></div>
          </div>
          {availableTags.length > 0 && <div className="flex flex-wrap gap-2">{availableTags.map((tag) => <Button key={tag} type="button" size="sm" variant={tags.includes(tag) ? "default" : "outline"} className="h-7 rounded-full text-xs" onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{tag}</Button>)}</div>}

          <details className="group rounded-2xl border border-border/60 bg-muted/10 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Settings2 className="h-4 w-4 text-green-500" />{t("add_dialog.advanced")}<span className="ml-auto text-xs text-muted-foreground group-open:hidden">{t("add_dialog.expand")}</span></summary>
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Toggle checked={autoTMM} onChange={setAutoTMM} label={t("add_dialog.auto_management")} description={t("add_dialog.auto_management_desc")} />
                <Toggle checked={addToTop} onChange={setAddToTop} label={t("add_dialog.queue_top")} />
                <Toggle checked={skipChecking} onChange={setSkipChecking} label={t("add_dialog.skip_checking")} />
                <Toggle checked={sequential} onChange={setSequential} label={t("add_dialog.sequential")} />
                <Toggle checked={firstLast} onChange={setFirstLast} label={t("add_dialog.first_last")} />
                <Toggle checked={forced} onChange={setForced} label={t("add_dialog.force_start")} description={!startImmediately ? t("add_dialog.force_requires_start") : undefined} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.content_layout")}</label><select value={contentLayout} onChange={(event) => setContentLayout(event.target.value as TorrentAddArgs["contentLayout"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="Original">{t("add_dialog.layout_original")}</option><option value="Subfolder">{t("add_dialog.layout_subfolder")}</option><option value="NoSubfolder">{t("add_dialog.layout_no_subfolder")}</option></select></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.rename")}</label><Input value={rename} onChange={(event) => setRename(event.target.value)} disabled={itemCount > 1} placeholder={itemCount > 1 ? t("add_dialog.rename_batch_disabled") : t("add_dialog.rename_placeholder")} /></div>
                <div className="space-y-2 sm:col-span-2"><Toggle checked={useDownloadPath} onChange={setUseDownloadPath} label={t("add_dialog.temporary_path")} description={t("add_dialog.temporary_path_desc")} />{useDownloadPath && <LocationInput value={downloadPath} onChange={setDownloadPath} disabled={autoTMM} placeholder={autoTMM ? t("add_dialog.auto_path_placeholder") : t("add_dialog.incomplete_path")} />}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.download_limit")}</label><Input type="number" min="0" value={dlLimit} onChange={(event) => setDlLimit(event.target.value)} placeholder={t("add_dialog.global_placeholder")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.upload_limit")}</label><Input type="number" min="0" value={upLimit} onChange={(event) => setUpLimit(event.target.value)} placeholder={t("add_dialog.global_placeholder")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.ratio_limit")}</label><Input type="number" min="0" step="0.1" value={ratioLimit} onChange={(event) => setRatioLimit(event.target.value)} placeholder={t("add_dialog.global_placeholder")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.seeding_time")}</label><Input type="number" min="0" value={seedingTime} onChange={(event) => setSeedingTime(event.target.value)} placeholder={t("add_dialog.global_placeholder")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.inactive_time")}</label><Input type="number" min="0" value={inactiveTime} onChange={(event) => setInactiveTime(event.target.value)} placeholder={t("add_dialog.global_placeholder")} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.share_action")}</label><select value={shareAction} onChange={(event) => setShareAction(event.target.value as TorrentAddArgs["shareLimitAction"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="Default">{t("add_dialog.global_setting")}</option><option value="Stop">{t("add_dialog.stop_task")}</option><option value="Remove">{t("add_dialog.remove_task")}</option><option value="RemoveWithContent">{t("add_dialog.remove_with_files")}</option><option value="EnableSuperSeeding">{t("add_dialog.enable_super_seeding")}</option></select></div>
                <div className="space-y-2"><label className="text-sm font-medium">{t("add_dialog.stop_condition")}</label><select value={stopCondition} onChange={(event) => setStopCondition(event.target.value as TorrentAddArgs["stopCondition"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="None">{t("add_dialog.none")}</option><option value="MetadataReceived">{t("add_dialog.metadata_received")}</option><option value="FilesChecked">{t("add_dialog.files_checked")}</option></select></div>
              </div>

              <details className="rounded-xl border border-border/50 p-3">
                <summary className="cursor-pointer text-sm font-medium">{t("add_dialog.ssl_parameters")}</summary>
                <div className="mt-3 grid gap-3"><Textarea value={sslCertificate} onChange={(event) => setSslCertificate(event.target.value)} placeholder={t("add_dialog.ssl_certificate")} /><Textarea value={sslPrivateKey} onChange={(event) => setSslPrivateKey(event.target.value)} placeholder={t("add_dialog.ssl_private_key")} /><Textarea value={sslDhParams} onChange={(event) => setSslDhParams(event.target.value)} placeholder={t("add_dialog.ssl_dh_parameters")} /></div>
              </details>
            </div>
          </details>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 sm:justify-between">
          <Toggle checked={startImmediately} onChange={setStartImmediately} label={t("add_dialog.start_immediately")} />
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>{t("add_dialog.cancel")}</Button><Button disabled={isAdding || !itemCount} onClick={() => void handleSubmit()}>{isAdding ? t("add_dialog.adding") : <><Plus className="mr-2 h-4 w-4" />{t("add_dialog.add_count", { count: itemCount || "" })}</>}</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
