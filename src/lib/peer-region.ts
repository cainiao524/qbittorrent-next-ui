export function peerCountryFlag(countryCode?: string): string {
  const normalized = countryCode?.trim().toUpperCase() ?? ""
  if (!/^[A-Z]{2}$/.test(normalized)) return ""
  return String.fromCodePoint(...[...normalized].map((character) => 127397 + character.charCodeAt(0)))
}

export function formatPeerRegion(countryCode?: string, country?: string, locale = "zh-CN"): string {
  const normalized = countryCode?.trim().toUpperCase() ?? ""
  if (/^[A-Z]{2}$/.test(normalized)) {
    try {
      const localized = new Intl.DisplayNames([locale], { type: "region" }).of(normalized)
      if (localized) return localized
    } catch {
      // 旧浏览器不支持 Intl.DisplayNames 时使用接口返回值。
    }
  }
  const fallback = country?.trim() ?? ""
  if (/^local network$/i.test(fallback)) return "本地网络"
  if (/^(unknown|n\/a)$/i.test(fallback)) return "未知"
  return fallback || normalized || "未知"
}
