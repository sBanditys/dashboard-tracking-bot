import { backendFetch } from '@/lib/server/backend-fetch'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { extractDashboardSessionCookies } from '@/lib/server/dashboard-session-cookies'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const OAUTH_CONTEXT_COOKIE_NAME = (process.env.OAUTH_CONTEXT_COOKIE_NAME || 'oauth_ctx').trim() || 'oauth_ctx'
const OAUTH_CONTEXT_COOKIE_DOMAIN = process.env.OAUTH_CONTEXT_COOKIE_DOMAIN?.trim()
const DEFAULT_ACCESS_MAX_AGE_SECONDS = 60 * 60
const DEFAULT_REFRESH_MAX_AGE_SECONDS = 90 * 24 * 60 * 60

interface LegacyTokenPayload {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

function normalizeCookieDomain(rawDomain: string | undefined): string | undefined {
  const normalized = (rawDomain || '').trim().toLowerCase().replace(/^\.+/, '')
  return normalized.length > 0 ? normalized : undefined
}

function getRequestHostname(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  const requestUrlHost = new URL(request.url).hostname
  const candidate = (forwardedHost || host || requestUrlHost || '')
    .split(',')[0]
    .trim()
    .toLowerCase()

  return candidate.replace(/:\d+$/, '')
}

function inferSharedCookieDomain(request: Request): string | undefined {
  const configuredDomain = normalizeCookieDomain(OAUTH_CONTEXT_COOKIE_DOMAIN)
  if (configuredDomain) {
    return configuredDomain
  }

  const hostname = getRequestHostname(request)
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return undefined
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
    return undefined
  }

  const parts = hostname.split('.').filter(Boolean)
  if (parts.length < 2) {
    return undefined
  }

  return parts.slice(-2).join('.')
}

function buildCookieHeader(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)}`
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''

    if (!code) {
      return NextResponse.json(
        { error: 'Missing or invalid exchange code' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const bindingCookie = cookieStore.get(OAUTH_CONTEXT_COOKIE_NAME)?.value

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (bindingCookie) {
      headers.Cookie = buildCookieHeader(OAUTH_CONTEXT_COOKIE_NAME, bindingCookie)
    }

    const upstream = await backendFetch(`${API_URL}/api/v1/auth/exchange`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code }),
      cache: 'no-store',
    })

    const payload = await upstream.json().catch(() => null)

    if (!upstream.ok) {
      return NextResponse.json(
        payload ?? { error: 'Failed to exchange authorization code' },
        { status: upstream.status || 500 }
      )
    }

    const cookieSession = extractDashboardSessionCookies(upstream.headers)
    const legacyPayload = (payload || {}) as LegacyTokenPayload
    const accessToken = cookieSession?.accessToken ?? legacyPayload.access_token
    const refreshToken = cookieSession?.refreshToken ?? legacyPayload.refresh_token

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Authentication succeeded but no session tokens were returned' },
        { status: 502 }
      )
    }

    const response = NextResponse.json(
      payload ?? { authenticated: true },
      { status: 200 }
    )

    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieSession?.accessMaxAgeSeconds ?? parsePositiveInt(legacyPayload.expires_in, DEFAULT_ACCESS_MAX_AGE_SECONDS),
      path: '/',
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieSession?.refreshMaxAgeSeconds ?? DEFAULT_REFRESH_MAX_AGE_SECONDS,
      path: '/',
    })

    const sharedCookieDomain = inferSharedCookieDomain(request)

    response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      ...(sharedCookieDomain && { domain: sharedCookieDomain }),
      maxAge: 0,
      path: '/',
    })

    response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth',
    })

    if (sharedCookieDomain) {
      response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        domain: sharedCookieDomain,
        maxAge: 0,
        path: '/api/auth',
      })
    }

    return response
  } catch {
    return NextResponse.json(
      { error: 'Failed to exchange authorization code' },
      { status: 500 }
    )
  }
}
