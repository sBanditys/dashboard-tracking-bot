import { backendFetch } from '@/lib/server/backend-fetch'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = BACKEND_API_URL

/**
 * GET /api/email-verify?token=<token>&guild=<guildId>
 *
 * Proxies to backend email verification endpoint.
 * Public — no auth required. Recipients click this link from their verification email.
 */
export async function GET(request: NextRequest) {
  const queryString = new URL(request.url).search

  try {
    const response = await backendFetch(`${API_URL}/api/email-verify${queryString}`)

    const html = await response.text()
    return new NextResponse(html, {
      status: response.status,
      headers: { 'Content-Type': 'text/html' },
    })
  } catch {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;max-width:480px;margin:60px auto;padding:20px;text-align:center;">' +
      '<h2>Verification Unavailable</h2><p>Please try again later.</p></body></html>',
      { status: 502, headers: { 'Content-Type': 'text/html' } }
    )
  }
}
