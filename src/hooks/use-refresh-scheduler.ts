import { useCallback, useEffect, useRef } from "react"

export function useRefreshScheduler(
  load: (signal: AbortSignal, manual: boolean) => Promise<void>,
  interval: number,
  automatic: boolean,
  enabled = true,
) {
  const runRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    let disposed = false
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    let pending: Promise<void> | undefined
    const stop = () => { clearTimeout(timer); controller?.abort(); pending = undefined }
    const run = (manual: boolean): Promise<void> => {
      if (disposed || !enabled || (!manual && document.hidden)) return Promise.resolve()
      if (pending) return pending
      clearTimeout(timer)
      const current = new AbortController()
      controller = current
      pending = Promise.resolve().then(() => {
        if (!current.signal.aborted) return load(current.signal, manual)
      }).then(() => { if (controller === current && !current.signal.aborted) failures = 0 }).catch(error => {
        if (!current.signal.aborted) { failures++; console.error("数据刷新失败", error) }
      }).finally(() => {
        if (controller !== current || current.signal.aborted || disposed) return
        pending = undefined
        if (automatic && !document.hidden) {
          const delay = failures ? Math.max(interval, Math.min(30000, 5000 * 2 ** (failures - 1))) : interval
          timer = setTimeout(() => { void run(false) }, delay)
        }
      })
      return pending
    }
    runRef.current = () => run(true)
    const visible = () => {
      if (document.hidden) stop()
      else if (automatic) void run(false)
    }
    document.addEventListener("visibilitychange", visible)
    void run(false)
    return () => { disposed = true; stop(); document.removeEventListener("visibilitychange", visible) }
  }, [load, interval, automatic, enabled])
  return useCallback(() => runRef.current(), [])
}
