import type { NextRequest } from 'next/server'

/**
 * Extract the real client IP from request headers.
 * Takes the first entry from X-Forwarded-For (the original client IP),
 * falls back to X-Real-IP.
 *
 * We forward only the single client IP (not the full chain) because the backend
 * has trust proxy: 1 (single nginx hop). If we forwarded the full chain, the extra
 * proxy hop through Next.js would cause the backend to resolve the wrong IP.
 */
export function getClientIpFromHeaders(headerStore: Headers): string {
  const xff = headerStore.get('x-forwarded-for')
  if (xff) {
    const firstIp = xff.split(',')[0].trim()
    if (firstIp) return firstIp
  }
  const realIp = headerStore.get('x-real-ip')
  if (realIp) return realIp.trim()
  return ''
}

/**
 * Extract client IP from a NextRequest (middleware context).
 * Uses X-Forwarded-For first entry, then X-Real-IP, then request.ip
 * (available on Vercel and some other platforms).
 */
export function getClientIpFromRequest(request: NextRequest): string {
  const ip = getClientIpFromHeaders(request.headers)
  if (ip) return ip
  // request.ip is populated on Vercel and some self-hosted environments
  return (request as NextRequest & { ip?: string }).ip || ''
}

/**
 * Build headers to forward client context (IP + User-Agent) to the backend.
 * Ensures the backend sees the real client identity, not the Next.js server's.
 */
export function buildClientContextHeaders(headerStore: Headers): Record<string, string> {
  const result: Record<string, string> = {}

  const clientIp = getClientIpFromHeaders(headerStore)
  if (clientIp) {
    result['X-Forwarded-For'] = clientIp
  }

  const ua = headerStore.get('user-agent')
  if (ua) {
    result['User-Agent'] = ua
  }

  return result
}
