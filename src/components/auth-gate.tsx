import * as React from "react"
import { DownloadCloud, LoaderCircle, LockKeyhole } from "lucide-react"
import { rpc } from "@/lib/rpc-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n-context"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
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
      setError(t("auth.login_error"))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "authenticated") return children

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px]" style={{ borderColor: "rgba(128, 128, 128, 0.22)", borderTopColor: "#2f9e44" }} />
        <span className="sr-only">{t("auth.checking")}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
        <div className="hidden lg:flex min-w-0 relative overflow-hidden bg-primary text-primary-foreground p-10 xl:p-12 flex-col justify-between">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_10%,white_0,transparent_38%),radial-gradient(circle_at_85%_80%,white_0,transparent_32%)]" />
          <div className="relative flex items-center gap-3 text-xl font-semibold">
            <div className="h-11 w-11 rounded-2xl bg-white/15 grid place-items-center backdrop-blur"><DownloadCloud /></div>
            qBittorrent Next
          </div>
          <div className="relative max-w-xl">
            <p className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.08] break-words">{t("auth.tagline")}</p>
            <p className="mt-6 text-lg text-primary-foreground/70">{t("auth.connect_desc")}</p>
          </div>
          <p className="relative text-sm text-primary-foreground/55">{t("auth.version_hint")}</p>
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
                  <h1 className="text-3xl font-semibold tracking-tight">{t("auth.login_title")}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{t("auth.login_desc")}</p>
                </div>
                <div className="space-y-3">
                  <Input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t("auth.username")} className="h-12 rounded-xl bg-muted/40 border-none" />
                  <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("auth.password")} className="h-12 rounded-xl bg-muted/40 border-none" />
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" disabled={submitting || !username || !password} className="w-full h-12 rounded-xl font-semibold">
                  {submitting ? <LoaderCircle className="animate-spin" /> : t("auth.connect_login")}
                </Button>
                <p className="text-xs text-muted-foreground leading-relaxed">{t("auth.session_hint")}</p>
              </form>
          </div>
        </div>
    </div>
  )
}
