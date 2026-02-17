import { backendFetch } from '@/lib/server/backend-fetch'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { extractDashboardSessionCookies } from '@/lib/server/dashboard-session-cookies'
import { getClientIpFromHeaders } from '@/lib/server/client-context'

const API_URL = BACKEND_API_URL
const DEFAULT_ACCESS_MAX_AGE_SECONDS = 60 * 60
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60

// Cookie names used by the backend API (env-configurable for consistency)
const DASHBOARD_ACCESS_COOKIE_NAME = (process.env.DASHBOARD_ACCESS_COOKIE_NAME || 'dashboard_at').trim()
const DASHBOARD_REFRESH_COOKIE_NAME = (process.env.DASHBOARD_REFRESH_COOKIE_NAME || 'dashboard_rt').trim()

interface LegacyTokenPayload {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value
    const accessToken = cookieStore.get('auth_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    // Build Cookie header to forward tokens to backend
    // The backend's /api/v1/auth/refresh endpoint reads tokens from cookies only (not from JSON body)
    const cookieParts: string[] = []
    if (refreshToken) {
      cookieParts.push(`${DASHBOARD_REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`)
    }
    if (accessToken) {
      cookieParts.push(`${DASHBOARD_ACCESS_COOKIE_NAME}=${encodeURIComponent(accessToken)}`)
    }

    // Read browser headers to forward to backend (needed for context binding validation).
    // Extract only the original client IP (first XFF entry) to avoid trust proxy hop issues.
    const headerStore = await headers()
    const browserUserAgent = headerStore.get('user-agent')
    const clientIp = getClientIpFromHeaders(headerStore)

    const backendHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': cookieParts.join('; '),
    }
    if (accessToken) {
      backendHeaders.Authorization = `Bearer ${accessToken}`
    }
    // Forward browser User-Agent and client IP so backend context binding matches the original session
    if (browserUserAgent) {
      backendHeaders['User-Agent'] = browserUserAgent
    }
    if (clientIp) {
      backendHeaders['X-Forwarded-For'] = clientIp
    }

    // Forward CSRF token if available (backend validates CSRF for cookie-authenticated requests)
    const csrfToken = cookieStore.get('csrf_token')?.value
    if (csrfToken) {
      backendHeaders['X-CSRF-Token'] = csrfToken
    }

    const upstream = await backendFetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: backendHeaders,
      body: JSON.stringify({}), // Empty body -- backend reads tokens from cookies
      cache: 'no-store',
    })

    const payload = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      cookieStore.delete('auth_token')
      cookieStore.delete('refresh_token')

      return NextResponse.json(
        { error: payload?.message || payload?.error || 'Failed to refresh token' },
        { status: upstream.status || 401 }
      )
    }

    const cookieSession = extractDashboardSessionCookies(upstream.headers)
    const legacyPayload = (payload || {}) as LegacyTokenPayload
    const nextAccessToken = cookieSession?.accessToken ?? legacyPayload.access_token
    const nextRefreshToken = cookieSession?.refreshToken ?? legacyPayload.refresh_token

    if (!nextAccessToken || !nextRefreshToken) {
      cookieStore.delete('auth_token')
      cookieStore.delete('refresh_token')
      return NextResponse.json(
        { error: 'Refresh succeeded but no session tokens were returned' },
        { status: 502 }
      )
    }

    cookieStore.set('auth_token', nextAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieSession?.accessMaxAgeSeconds ?? parsePositiveInt(legacyPayload.expires_in, DEFAULT_ACCESS_MAX_AGE_SECONDS),
      path: '/',
    })

    cookieStore.set('refresh_token', nextRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieSession?.refreshMaxAgeSeconds ?? DEFAULT_REFRESH_MAX_AGE_SECONDS,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
