import { NextRequest, NextResponse } from 'next/server'
import { extractSetCookieByName } from '@/lib/server/dashboard-session-cookies'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const OAUTH_CONTEXT_COOKIE_NAME = (process.env.OAUTH_CONTEXT_COOKIE_NAME || 'oauth_ctx').trim() || 'oauth_ctx'
const OAUTH_COOKIE_FALLBACK_MAX_AGE_SECONDS = 10 * 60 // 10 minutes
const OAUTH_CONTEXT_COOKIE_DOMAIN = process.env.OAUTH_CONTEXT_COOKIE_DOMAIN?.trim()

function normalizeCookieDomain(rawDomain: string | undefined): string | undefined {
  const normalized = (rawDomain || '').trim().toLowerCase().replace(/^\.+/, '')
  return normalized.length > 0 ? normalized : undefined
}

function getRequestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  const candidate = (forwardedHost || host || request.nextUrl.hostname || '')
    .split(',')[0]
    .trim()
    .toLowerCase()

  return candidate.replace(/:\d+$/, '')
}

function getCookieDomain(request: NextRequest): string | undefined {
  const configuredDomain = normalizeCookieDomain(OAUTH_CONTEXT_COOKIE_DOMAIN)
  if (configuredDomain) {
    return configuredDomain
  }

  const hostname = getRequestHostname(request)
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return undefined
  }

  // IP literals cannot be used as cookie domains.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
    return undefined
  }

  const parts = hostname.split('.').filter(Boolean)
  if (parts.length < 2) {
    return undefined
  }

  return parts.slice(-2).join('.')
}

export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(`${API_URL}/api/v1/auth/discord`, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
    })

    const location = upstream.headers.get('location')
    if (!location) {
      const payload = await upstream.json().catch(() => null)
      const fallbackUrl = payload?.url
      if (typeof fallbackUrl === 'string' && fallbackUrl.length > 0) {
        return NextResponse.redirect(fallbackUrl)
      }

      return NextResponse.json(
        { error: 'Failed to initialize OAuth login' },
        { status: upstream.status || 500 }
      )
    }

    const response = NextResponse.redirect(location, upstream.status >= 300 && upstream.status < 400 ? upstream.status : 302)
    const bindingCookie = extractSetCookieByName(upstream.headers, OAUTH_CONTEXT_COOKIE_NAME)

    if (bindingCookie) {
      const maxAge = Number.parseInt(bindingCookie.attributes['max-age'] || '', 10)
      const domain = getCookieDomain(request)

      // Remove legacy host-only binding cookie path to avoid duplicate cookie collisions.
      response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 0,
      })

      response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, bindingCookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        ...(domain && { domain }),
        maxAge: Number.isFinite(maxAge) && maxAge > 0 ? maxAge : OAUTH_COOKIE_FALLBACK_MAX_AGE_SECONDS,
      })

      if (domain) {
        // Also clear any legacy shared-domain cookie scoped to the old path.
        response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          domain,
          path: '/api/auth',
          maxAge: 0,
        })
      }
    }

    return response
  } catch {
    return NextResponse.json(
      { error: 'Failed to initialize OAuth login' },
      { status: 500 }
    )
  }
}
