"use client"

import * as React from "react"
import { Activity, ArrowDown, ArrowUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatSpeed } from "@/lib/formatters"
import type { SessionStats } from "@/lib/rpc-types"

interface SpeedPoint { time: number; download: number; upload: number }

function pointsToPath(values: number[], max: number) {
  if (!values.length) return ""
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 1000
    const y = 170 - (value / max) * 150
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
}

export function SpeedHistoryChart({ stats }: { stats: SessionStats }) {
  const [history, setHistory] = React.useState<SpeedPoint[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("speed_history") ?? "[]") as SpeedPoint[] } catch { return [] }
  })

  React.useEffect(() => {
    const point = { time: Date.now(), download: stats.downloadSpeed, upload: stats.uploadSpeed }
    setHistory((current) => {
      const next = [...current, point].slice(-60)
      sessionStorage.setItem("speed_history", JSON.stringify(next))
      return next
    })
  }, [stats.downloadSpeed, stats.uploadSpeed])

  const max = Math.max(1, ...history.flatMap((point) => [point.download, point.upload]))
  const downloadPath = pointsToPath(history.map((point) => point.download), max)
  const uploadPath = pointsToPath(history.map((point) => point.upload), max)

  return (
    <Card className="overflow-hidden border-none bg-sidebar/30 py-0 shadow-md">
      <CardHeader className="flex-row items-center justify-between border-b border-muted/30 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-green-500" />传输速度历史</CardTitle>
        <div className="flex gap-4 text-xs font-medium"><span className="flex items-center gap-1 text-green-500"><ArrowDown className="h-3.5 w-3.5" />{formatSpeed(stats.downloadSpeed)}</span><span className="flex items-center gap-1 text-blue-500"><ArrowUp className="h-3.5 w-3.5" />{formatSpeed(stats.uploadSpeed)}</span></div>
      </CardHeader>
      <CardContent className="relative h-52 p-4">
        <div className="absolute inset-4 flex flex-col justify-between text-[10px] text-muted-foreground/50"><span>{formatSpeed(max)}</span><span>{formatSpeed(max / 2)}</span><span>0 B/s</span></div>
        <svg viewBox="0 0 1000 180" preserveAspectRatio="none" className="absolute inset-x-4 bottom-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] overflow-visible" aria-label="最近六十次刷新的传输速度">
          {[20, 95, 170].map((y) => <line key={y} x1="0" y1={y} x2="1000" y2={y} className="stroke-border" strokeWidth="1" strokeDasharray="6 8" />)}
          <path d={downloadPath} fill="none" className="stroke-green-500" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          <path d={uploadPath} fill="none" className="stroke-blue-500" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {history.length < 2 && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">等待下一次刷新以绘制趋势</div>}
        <span className="absolute bottom-1 right-4 text-[10px] text-muted-foreground/50">最近 {history.length}/60 个采样点</span>
      </CardContent>
    </Card>
  )
}
