const DEFAULT_ACCESS_MAX_AGE_SECONDS = 60 * 60 // 1 hour
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60 // 90 days

export interface ParsedSetCookie {
  name: string
  value: string
  attributes: Record<string, string>
}

export interface DashboardSessionCookiePair {
  accessToken: string
  refreshToken: string
  accessMaxAgeSeconds: number
  refreshMaxAgeSeconds: number
}

function isClearedCookie(cookie: ParsedSetCookie): boolean {
  if (!cookie.value) {
    return true
  }

  const rawMaxAge = cookie.attributes['max-age']
  if (rawMaxAge) {
    const maxAge = Number.parseInt(rawMaxAge, 10)
    if (Number.isFinite(maxAge) && maxAge <= 0) {
      return true
    }
  }

  return false
}

function splitSetCookieHeader(rawHeader: string): string[] {
  return rawHeader
    .split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withSetCookie = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withSetCookie.getSetCookie === 'function') {
    return withSetCookie.getSetCookie()
  }

  const raw = headers.get('set-cookie')
  return raw ? splitSetCookieHeader(raw) : []
}

function parseSetCookie(cookieHeader: string): ParsedSetCookie | null {
  const segments = cookieHeader.split(';').map((segment) => segment.trim()).filter(Boolean)
  if (segments.length === 0) return null

  const nameValue = segments[0]
  const separatorIndex = nameValue.indexOf('=')
  if (separatorIndex <= 0) return null

  const name = nameValue.slice(0, separatorIndex).trim()
  const value = nameValue.slice(separatorIndex + 1)
  if (!name) return null

  const attributes: Record<string, string> = {}
  for (let i = 1; i < segments.length; i += 1) {
    const attribute = segments[i]
    const attrSeparatorIndex = attribute.indexOf('=')
    if (attrSeparatorIndex === -1) {
      attributes[attribute.toLowerCase()] = 'true'
      continue
    }
    const attrName = attribute.slice(0, attrSeparatorIndex).trim().toLowerCase()
    const attrValue = attribute.slice(attrSeparatorIndex + 1).trim()
    attributes[attrName] = attrValue
  }

  return { name, value, attributes }
}

function safeDecodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getCookieMaxAgeSeconds(cookie: ParsedSetCookie, fallback: number): number {
  const rawMaxAge = cookie.attributes['max-age']
  if (!rawMaxAge) return fallback
  const parsed = Number.parseInt(rawMaxAge, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function pickRefreshCookie(cookies: ParsedSetCookie[]): ParsedSetCookie | null {
  const byPath = cookies.find((cookie) => (cookie.attributes.path || '').includes('/auth'))
  if (byPath) return byPath

  if (cookies.length === 0) return null
  return [...cookies].sort((a, b) => getCookieMaxAgeSeconds(b, 0) - getCookieMaxAgeSeconds(a, 0))[0]
}

function pickAccessCookie(cookies: ParsedSetCookie[], refreshCookie: ParsedSetCookie | null): ParsedSetCookie | null {
  const candidates = refreshCookie
    ? cookies.filter((cookie) => cookie.name !== refreshCookie.name || cookie.value !== refreshCookie.value)
    : cookies

  const byPath = candidates.find((cookie) => (cookie.attributes.path || '').includes('/api/v1'))
  if (byPath) return byPath

  return candidates[0] ?? null
}

export function extractSetCookieByName(headers: Headers, name: string): ParsedSetCookie | null {
  const normalizedName = name.trim()
  if (!normalizedName) return null

  const parsedCookies = getSetCookieHeaders(headers)
    .map(parseSetCookie)
    .filter((cookie): cookie is ParsedSetCookie => cookie !== null)

  return parsedCookies.find((cookie) => cookie.name === normalizedName) ?? null
}

export function extractDashboardSessionCookies(headers: Headers): DashboardSessionCookiePair | null {
  const sessionCookies = getSetCookieHeaders(headers)
    .map(parseSetCookie)
    .filter((cookie): cookie is ParsedSetCookie => cookie !== null)
    .filter((cookie) => !isClearedCookie(cookie))

  if (sessionCookies.length === 0) return null

  const refreshCookie = pickRefreshCookie(sessionCookies)
  const accessCookie = pickAccessCookie(sessionCookies, refreshCookie)

  if (!accessCookie || !refreshCookie) return null

  const accessToken = safeDecodeCookieValue(accessCookie.value)
  const refreshToken = safeDecodeCookieValue(refreshCookie.value)

  if (!accessToken || !refreshToken) return null

  return {
    accessToken,
    refreshToken,
    accessMaxAgeSeconds: getCookieMaxAgeSeconds(accessCookie, DEFAULT_ACCESS_MAX_AGE_SECONDS),
    refreshMaxAgeSeconds: getCookieMaxAgeSeconds(refreshCookie, DEFAULT_REFRESH_MAX_AGE_SECONDS),
  }
}
