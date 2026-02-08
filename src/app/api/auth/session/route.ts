import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface TokenPayload {
  access_token: string
  refresh_token: string
  expires_in: number
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

function normalizeTokenPayload(data: unknown): TokenPayload | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as Partial<TokenPayload>
  if (!payload.access_token || !payload.refresh_token) {
    return null
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: parsePositiveInt(payload.expires_in, 60 * 15),
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null)
    const tokens = normalizeTokenPayload(rawBody)
    if (!tokens) {
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    cookieStore.set('auth_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    })

    cookieStore.set('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
