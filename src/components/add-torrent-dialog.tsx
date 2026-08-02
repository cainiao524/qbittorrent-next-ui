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
    if (torrentFiles.length !== input.length) toast.info("已忽略非 .torrent 文件")
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
    if (!itemCount) return toast.error("请选择种子文件或输入磁力链接")
    setIsAdding(true)
    try {
      for (const link of links) await rpc.addTorrent({ ...commonArgs(), filename: link })
      for (const file of files) await rpc.addTorrent({ ...commonArgs(), metainfo: await toBase64(file) })
      toast.success(`已提交 ${itemCount} 个下载任务`)
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error("添加任务失败", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-5 overflow-hidden border-none bg-background/95 p-6 shadow-2xl backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl">添加种子</DialogTitle>
          <DialogDescription>支持多个种子文件和多个磁力链接，所有选项会应用到本次提交的任务。</DialogDescription>
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
            <div><p className="text-sm font-medium">拖放或选择 .torrent 文件</p><p className="text-xs text-muted-foreground">支持一次选择多个文件</p></div>
          </div>
          {files.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/30 p-2.5">
              <FileIcon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}</div>}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium"><Link className="h-4 w-4" />磁力链接或种子网址</label>
            <div className="relative">
              <Textarea value={magnetLink} onChange={(event) => setMagnetLink(event.target.value)} placeholder="每行输入一个链接" className="min-h-24 pr-12 font-mono text-xs" />
              <Button variant="ghost" size="icon" className="absolute bottom-2 right-2" onClick={() => void navigator.clipboard.readText().then((text) => setMagnetLink((current) => current ? `${current}\n${text}` : text))}><Clipboard className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><label className="flex items-center gap-2 text-sm font-medium"><FolderOpen className="h-4 w-4" />完成保存路径</label><LocationInput value={location} onChange={setLocation} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">分类</label><Input list="torrent-category-list" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="可选择或输入分类" /><datalist id="torrent-category-list">{availableCategories.map((item) => <option key={item} value={item} />)}</datalist></div>
            <div className="space-y-2"><label className="text-sm font-medium">标签</label><Input value={tags.join(", ")} onChange={(event) => setTags(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="多个标签用逗号分隔" /></div>
          </div>
          {availableTags.length > 0 && <div className="flex flex-wrap gap-2">{availableTags.map((tag) => <Button key={tag} type="button" size="sm" variant={tags.includes(tag) ? "default" : "outline"} className="h-7 rounded-full text-xs" onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{tag}</Button>)}</div>}

          <details className="group rounded-2xl border border-border/60 bg-muted/10 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Settings2 className="h-4 w-4 text-green-500" />高级添加选项<span className="ml-auto text-xs text-muted-foreground group-open:hidden">点击展开</span></summary>
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Toggle checked={autoTMM} onChange={setAutoTMM} label="自动种子管理" description="路径可能由分类规则接管" />
                <Toggle checked={addToTop} onChange={setAddToTop} label="添加到队列顶部" />
                <Toggle checked={skipChecking} onChange={setSkipChecking} label="跳过哈希检查" />
                <Toggle checked={sequential} onChange={setSequential} label="顺序下载" />
                <Toggle checked={firstLast} onChange={setFirstLast} label="优先下载首尾区块" />
                <Toggle checked={forced} onChange={setForced} label="强制启动" description={!startImmediately ? "需同时开启立即开始" : undefined} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">内容布局</label><select value={contentLayout} onChange={(event) => setContentLayout(event.target.value as TorrentAddArgs["contentLayout"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="Original">原始布局</option><option value="Subfolder">创建子文件夹</option><option value="NoSubfolder">不创建子文件夹</option></select></div>
                <div className="space-y-2"><label className="text-sm font-medium">重命名任务</label><Input value={rename} onChange={(event) => setRename(event.target.value)} disabled={itemCount > 1} placeholder={itemCount > 1 ? "批量添加时不可用" : "留空保留原名称"} /></div>
                <div className="space-y-2 sm:col-span-2"><Toggle checked={useDownloadPath} onChange={setUseDownloadPath} label="使用临时下载目录" description="下载完成后移动到完成保存路径" />{useDownloadPath && <LocationInput value={downloadPath} onChange={setDownloadPath} disabled={autoTMM} placeholder={autoTMM ? "自动种子管理会接管此路径" : "未完成文件路径"} />}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2"><label className="text-sm font-medium">下载限速（KiB/s）</label><Input type="number" min="0" value={dlLimit} onChange={(event) => setDlLimit(event.target.value)} placeholder="留空使用全局设置" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">上传限速（KiB/s）</label><Input type="number" min="0" value={upLimit} onChange={(event) => setUpLimit(event.target.value)} placeholder="留空使用全局设置" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">分享率限制</label><Input type="number" min="0" step="0.1" value={ratioLimit} onChange={(event) => setRatioLimit(event.target.value)} placeholder="留空使用全局设置" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">做种时间限制（分钟）</label><Input type="number" min="0" value={seedingTime} onChange={(event) => setSeedingTime(event.target.value)} placeholder="留空使用全局设置" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">非活跃做种限制（分钟）</label><Input type="number" min="0" value={inactiveTime} onChange={(event) => setInactiveTime(event.target.value)} placeholder="留空使用全局设置" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">达到分享限制后</label><select value={shareAction} onChange={(event) => setShareAction(event.target.value as TorrentAddArgs["shareLimitAction"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="Default">使用全局设置</option><option value="Stop">停止任务</option><option value="Remove">移除任务</option><option value="RemoveWithContent">移除任务和文件</option><option value="EnableSuperSeeding">启用超级做种</option></select></div>
                <div className="space-y-2"><label className="text-sm font-medium">停止条件</label><select value={stopCondition} onChange={(event) => setStopCondition(event.target.value as TorrentAddArgs["stopCondition"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="None">无</option><option value="MetadataReceived">收到元数据</option><option value="FilesChecked">文件检查完成</option></select></div>
              </div>

              <details className="rounded-xl border border-border/50 p-3">
                <summary className="cursor-pointer text-sm font-medium">SSL 种子参数</summary>
                <div className="mt-3 grid gap-3"><Textarea value={sslCertificate} onChange={(event) => setSslCertificate(event.target.value)} placeholder="SSL 证书（PEM）" /><Textarea value={sslPrivateKey} onChange={(event) => setSslPrivateKey(event.target.value)} placeholder="SSL 私钥（PEM）" /><Textarea value={sslDhParams} onChange={(event) => setSslDhParams(event.target.value)} placeholder="DH 参数（PEM，可选）" /></div>
              </details>
            </div>
          </details>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 sm:justify-between">
          <Toggle checked={startImmediately} onChange={setStartImmediately} label="立即开始" />
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>取消</Button><Button disabled={isAdding || !itemCount} onClick={() => void handleSubmit()}>{isAdding ? "正在添加…" : <><Plus className="mr-2 h-4 w-4" />添加 {itemCount || ""} 个任务</>}</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
