import * as React from "react"
import { DownloadCloud, LoaderCircle, LockKeyhole } from "lucide-react"
import { rpc } from "@/lib/rpc-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeProvider } from "@/components/theme-provider"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<"checking" | "guest" | "authenticated">("checking")
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    let active = true
    rpc.checkAuthentication().then((authenticated) => {
      if (active) setStatus(authenticated ? "authenticated" : "guest")
    })
    return () => { active = false }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username || !password) return
    setSubmitting(true)
    setError("")
    try {
      await rpc.login(username, password)
      setStatus("authenticated")
    } catch {
      setError("登录失败，请检查地址、用户名和密码。")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "authenticated") return children

  if (status === "checking") {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background grid place-items-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] overflow-hidden">
        <div className="hidden lg:flex min-w-0 relative overflow-hidden bg-primary text-primary-foreground p-10 xl:p-12 flex-col justify-between">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_10%,white_0,transparent_38%),radial-gradient(circle_at_85%_80%,white_0,transparent_32%)]" />
          <div className="relative flex items-center gap-3 text-xl font-semibold">
            <div className="h-11 w-11 rounded-2xl bg-white/15 grid place-items-center backdrop-blur"><DownloadCloud /></div>
            qBittorrent Next
          </div>
          <div className="relative max-w-xl">
            <p className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.08] break-words">更专注、更清晰的下载管理界面。</p>
            <p className="mt-6 text-lg text-primary-foreground/70">直接连接 qBittorrent Web API，适配桌面与移动设备。</p>
          </div>
          <p className="relative text-sm text-primary-foreground/55">适用于 qBittorrent 4.4 及以上版本</p>
        </div>

        <div className="min-w-0 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-3 mb-12 text-lg font-semibold">
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center"><DownloadCloud className="h-5 w-5" /></div>
              qBittorrent Next
            </div>
            <form onSubmit={submit} className="space-y-6">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-6"><LockKeyhole /></div>
                  <h1 className="text-3xl font-semibold tracking-tight">登录</h1>
                  <p className="mt-2 text-sm text-muted-foreground">使用 qBittorrent 网页界面的账户凭据。</p>
                </div>
                <div className="space-y-3">
                  <Input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="用户名" className="h-12 rounded-xl bg-muted/40 border-none" />
                  <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" className="h-12 rounded-xl bg-muted/40 border-none" />
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" disabled={submitting || !username || !password} className="w-full h-12 rounded-xl font-semibold">
                  {submitting ? <LoaderCircle className="animate-spin" /> : "连接并登录"}
                </Button>
                <p className="text-xs text-muted-foreground leading-relaxed">若此界面由 qBittorrent 直接托管且已有会话，将自动跳过登录。</p>
              </form>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
