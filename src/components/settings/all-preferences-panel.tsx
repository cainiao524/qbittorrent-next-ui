import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getPreferenceCategory,
  getPreferenceChanges,
  getPreferenceValueType,
  isConnectionCriticalPreference,
  isSensitivePreference,
  isStructuredPreference,
  PREFERENCE_CATEGORY_ORDER,
  type PreferenceCategory,
} from "@/lib/application-preferences"
import { useI18n } from "@/lib/i18n-context"
import { rpc } from "@/lib/rpc-client"
import type { ApplicationPreferences, ApplicationPreferenceValue } from "@/lib/rpc-types"
import { cn } from "@/lib/utils"

const MULTILINE_KEY = /(trackers|headers|whitelist|banned|program|filters|certificate|_path$)/i

function formatStructuredValue(value: ApplicationPreferenceValue): string {
  return JSON.stringify(value, null, 2)
}

function createStructuredDrafts(preferences: ApplicationPreferences): Record<string, string> {
  return Object.fromEntries(
    Object.entries(preferences)
      .filter(([, value]) => isStructuredPreference(value))
      .map(([key, value]) => [key, formatStructuredValue(value)]),
  )
}

function categoryTranslationKey(category: PreferenceCategory): string {
  return `settings.all.categories.${category}`
}

export function AllPreferencesPanel() {
  const { t } = useI18n()
  const [preferences, setPreferences] = useState<ApplicationPreferences | null>(null)
  const [draft, setDraft] = useState<ApplicationPreferences>({})
  const [structuredDrafts, setStructuredDrafts] = useState<Record<string, string>>({})
  const [parseErrors, setParseErrors] = useState<Record<string, string>>({})
  const [query, setQuery] = useState("")
  const [changedOnly, setChangedOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPreferences = useCallback(async () => {
    setLoading(true)
    try {
      const data = await rpc.getApplicationPreferences()
      setPreferences(data)
      setDraft(data)
      setStructuredDrafts(createStructuredDrafts(data))
      setParseErrors({})
    } catch (error) {
      console.error("Failed to fetch qBittorrent preferences:", error)
      toast.error(t("settings.all.load_failed", "无法读取全部偏好设置"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const changes = useMemo(
    () => preferences ? getPreferenceChanges(preferences, draft) : {},
    [draft, preferences],
  )
  const changedKeys = useMemo(() => new Set(Object.keys(changes)), [changes])
  const hasParseErrors = Object.keys(parseErrors).length > 0
  const hasCriticalChanges = Object.keys(changes).some(isConnectionCriticalPreference)

  const groupedPreferences = useMemo(() => {
    if (!preferences) return []
    const normalizedQuery = query.trim().toLowerCase()
    const entries = Object.entries(draft)
      .filter(([key, value]) => {
        if (changedOnly && !changedKeys.has(key)) return false
        if (!normalizedQuery) return true
        return key.toLowerCase().includes(normalizedQuery)
          || getPreferenceCategory(key).includes(normalizedQuery)
          || String(value).toLowerCase().includes(normalizedQuery)
      })
      .sort(([left], [right]) => left.localeCompare(right))

    return PREFERENCE_CATEGORY_ORDER
      .map((category) => ({
        category,
        entries: entries.filter(([key]) => getPreferenceCategory(key) === category),
      }))
      .filter((group) => group.entries.length > 0)
  }, [changedKeys, changedOnly, draft, preferences, query])

  const updatePreference = (key: string, value: ApplicationPreferenceValue) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateStructuredPreference = (key: string, raw: string) => {
    setStructuredDrafts((current) => ({ ...current, [key]: raw }))
    try {
      const parsed = JSON.parse(raw) as ApplicationPreferenceValue
      if (parsed === null || typeof parsed !== "object") throw new Error("Expected an object or array")
      updatePreference(key, parsed)
      setParseErrors((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    } catch {
      setParseErrors((current) => ({
        ...current,
        [key]: t("settings.all.invalid_json", "JSON 格式无效"),
      }))
    }
  }

  const resetDraft = () => {
    if (!preferences) return
    setDraft(preferences)
    setStructuredDrafts(createStructuredDrafts(preferences))
    setParseErrors({})
  }

  const saveChanges = async () => {
    if (!preferences || !Object.keys(changes).length || hasParseErrors) return
    setSaving(true)
    try {
      await rpc.setApplicationPreferences(changes)
      toast.success(t("settings.all.save_success", "偏好设置已保存"), {
        description: t(
          "settings.all.save_success_desc",
          "服务器已接收 {{count}} 项更改。",
        ).replace("{{count}}", String(Object.keys(changes).length)),
      })
      await fetchPreferences()
    } catch (error) {
      console.error("Failed to save qBittorrent preferences:", error)
      toast.error(t("settings.all.save_failed", "保存偏好设置失败"), {
        description: t(
          "settings.all.save_failed_desc",
          "连接可能已被 WebUI 或网络设置更改中断，请检查 qBittorrent。",
        ),
      })
    } finally {
      setSaving(false)
    }
  }

  const renderEditor = (key: string, value: ApplicationPreferenceValue) => {
    const label = `${key} (${getPreferenceValueType(value)})`
    if (typeof value === "boolean") {
      return (
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={label}
          onClick={() => updatePreference(key, !value)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2",
            value
              ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]"
              : "bg-muted ring-1 ring-border",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
              value ? "left-6" : "left-1",
            )}
          />
        </button>
      )
    }

    if (typeof value === "number") {
      return (
        <Input
          aria-label={label}
          type="number"
          step="any"
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) updatePreference(key, next)
          }}
          className="h-10 bg-background/70 font-mono text-xs"
        />
      )
    }

    if (isStructuredPreference(value)) {
      return (
        <div className="space-y-2">
          <Textarea
            aria-label={label}
            value={structuredDrafts[key] ?? formatStructuredValue(value)}
            onChange={(event) => updateStructuredPreference(key, event.target.value)}
            className={cn(
              "min-h-28 bg-background/70 font-mono text-xs",
              parseErrors[key] && "border-destructive focus-visible:ring-destructive",
            )}
          />
          {parseErrors[key] && (
            <p className="text-xs text-destructive">{parseErrors[key]}</p>
          )}
        </div>
      )
    }

    const stringValue = value === null ? "" : String(value)
    if (MULTILINE_KEY.test(key) || stringValue.includes("\n") || stringValue.length > 120) {
      return (
        <Textarea
          aria-label={label}
          value={stringValue}
          placeholder={value === null ? "null" : undefined}
          onChange={(event) => updatePreference(key, event.target.value)}
          className="min-h-24 bg-background/70 font-mono text-xs"
        />
      )
    }

    return (
      <Input
        aria-label={label}
        type={isSensitivePreference(key) ? "password" : "text"}
        value={stringValue}
        placeholder={value === null ? "null" : undefined}
        autoComplete="off"
        onChange={(event) => updatePreference(key, event.target.value)}
        className="h-10 bg-background/70 font-mono text-xs"
      />
    )
  }

  if (loading && !preferences) {
    return (
      <Card className="border-none bg-card/60 shadow-xl">
        <CardContent className="flex min-h-72 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t("settings.all.loading", "正在读取 qBittorrent 全部偏好设置…")}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-card/60 shadow-xl backdrop-blur-md">
        <CardHeader className="gap-4 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                {t("settings.all.title", "全部 qBittorrent 偏好设置")}
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-xs leading-relaxed md:text-sm">
                {t(
                  "settings.all.desc",
                  "按服务器实际返回值展示所有配置项；字段数量会随 qBittorrent 版本和平台变化。",
                )}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading || saving}
              onClick={fetchPreferences}
              className="rounded-xl"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              {t("settings.all.reload", "重新读取")}
            </Button>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t(
                  "settings.all.warning",
                  "修改 WebUI 地址、端口、认证、HTTPS、代理或备用界面路径可能立即中断当前连接。保存前请确认仍有其他方式访问 qBittorrent。",
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("settings.all.search", "搜索配置键、分类或值…")}
                className="h-11 rounded-xl bg-muted/30 pl-10"
              />
            </div>
            <Button
              type="button"
              variant={changedOnly ? "default" : "outline"}
              onClick={() => setChangedOnly((current) => !current)}
              className="h-11 rounded-xl"
            >
              <Check className="mr-2 h-4 w-4" />
              {t("settings.all.changed_only", "仅显示已更改")}
              {changedKeys.size > 0 && (
                <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-[10px]">
                  {changedKeys.size}
                </span>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">
              {t("settings.all.total", "服务器返回 {{count}} 项")
                .replace("{{count}}", String(Object.keys(preferences ?? {}).length))}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {t("settings.all.visible", "当前显示 {{count}} 项")
                .replace(
                  "{{count}}",
                  String(groupedPreferences.reduce((total, group) => total + group.entries.length, 0)),
                )}
            </span>
          </div>
        </CardHeader>
      </Card>

      {groupedPreferences.map(({ category, entries }) => (
        <Card key={category} className="overflow-hidden border-none bg-card/60 shadow-lg">
          <CardHeader className="border-b border-muted/30 p-5">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{t(categoryTranslationKey(category), category)}</span>
              <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                {entries.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-muted/30 p-0">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  "grid gap-4 p-4 transition-colors md:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.2fr)] md:items-start md:p-5",
                  changedKeys.has(key) && "bg-primary/[0.04]",
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="break-all text-xs font-semibold text-foreground">{key}</code>
                    {changedKeys.has(key) && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                        {t("settings.all.changed", "已更改")}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {getPreferenceValueType(value)}
                    {isSensitivePreference(key) && ` · ${t("settings.all.sensitive", "敏感字段")}`}
                  </p>
                </div>
                {renderEditor(key, value)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {groupedPreferences.length === 0 && (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex min-h-36 items-center justify-center text-sm text-muted-foreground">
            {t("settings.all.no_results", "没有匹配的偏好设置。")}
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4 z-40 flex flex-col gap-3 rounded-2xl border border-muted/30 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {hasParseErrors
            ? t("settings.all.fix_json", "请先修复无效的 JSON 字段。")
            : hasCriticalChanges
              ? t("settings.all.critical_changes", "包含可能中断连接的 WebUI 或代理设置。")
              : t("settings.all.pending", "待保存 {{count}} 项更改。")
                  .replace("{{count}}", String(changedKeys.size))}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={saving || (changedKeys.size === 0 && !hasParseErrors)}
            onClick={resetDraft}
            className="flex-1 rounded-xl sm:flex-none"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("settings.actions.discard", "放弃更改")}
          </Button>
          <Button
            type="button"
            disabled={saving || changedKeys.size === 0 || hasParseErrors}
            onClick={saveChanges}
            className="flex-1 rounded-xl sm:flex-none"
          >
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {t("settings.all.save", "保存全部偏好")}
          </Button>
        </div>
      </div>
    </div>
  )
}
