import { NextResponse } from 'next/server'
import { extractSetCookieByName } from '@/lib/server/dashboard-session-cookies'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const OAUTH_CONTEXT_COOKIE_NAME = (process.env.OAUTH_CONTEXT_COOKIE_NAME || 'oauth_ctx').trim() || 'oauth_ctx'
const OAUTH_COOKIE_FALLBACK_MAX_AGE_SECONDS = 10 * 60 // 10 minutes

export async function GET() {
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
      response.cookies.set(OAUTH_CONTEXT_COOKIE_NAME, bindingCookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: Number.isFinite(maxAge) && maxAge > 0 ? maxAge : OAUTH_COOKIE_FALLBACK_MAX_AGE_SECONDS,
      })
    }

    return response
  } catch {
    return NextResponse.json(
      { error: 'Failed to initialize OAuth login' },
      { status: 500 }
    )
  }
}
