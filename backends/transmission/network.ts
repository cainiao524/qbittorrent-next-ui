export function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "")

  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true
  if (/^10(?:\.\d{1,3}){3}$/.test(host)) return true
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return true

  const private172 = host.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/)
  if (private172) {
    const secondOctet = Number(private172[1])
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }

  return /^(?:fc|fd|fe8|fe9|fea|feb)[0-9a-f:]*$/.test(host)
}
