'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

async function setSession(tokens: TokenPayload): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error || 'Failed to create session')
  }
}

function AuthCallbackContent() {
  const [status, setStatus] = useState('Completing sign-in...')
  const router = useRouter()
  const searchParams = useSearchParams()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const finishAuth = async () => {
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      if (error) {
        const params = new URLSearchParams({ error })
        if (errorDescription) {
          params.set('error_description', errorDescription)
        }
        router.replace(`/login?${params.toString()}`)
        return
      }

      const code = searchParams.get('code')
      const legacyTokens = normalizeTokenPayload({
        access_token: searchParams.get('access_token') ?? undefined,
        refresh_token: searchParams.get('refresh_token') ?? undefined,
        expires_in: searchParams.get('expires_in') ?? undefined,
      })

      try {
        let tokens = legacyTokens

        if (!tokens) {
          if (!code) {
            router.replace('/login?error=callback_failed')
            return
          }

          setStatus('Exchanging authorization code...')
          const exchangeResponse = await fetch('/api/auth/exchange', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            cache: 'no-store',
          })

          const payload = await exchangeResponse.json().catch(() => null)
          if (!exchangeResponse.ok) {
            const message = payload?.message || payload?.error
            const errorCode = message === 'Invalid or expired exchange code'
              ? 'invalid_state'
              : 'callback_failed'
            router.replace(`/login?error=${encodeURIComponent(errorCode)}`)
            return
          }

          tokens = normalizeTokenPayload(payload)
          if (!tokens) {
            router.replace('/')
            return
          }
        }

        setStatus('Setting secure session...')
        await setSession(tokens)
        router.replace('/')
      } catch {
        router.replace('/login?error=server_error')
      }
    }

    finishAuth()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 text-center space-y-3">
        <h1 className="text-xl font-semibold text-white">Signing you in</h1>
        <p className="text-sm text-gray-400">{status}</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
