import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/accounts/import/confirm`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      }
    )

    if (!response.ok) {
      const data = await response.json()
      const sanitized = sanitizeError(response.status, data, 'confirm import')
      return NextResponse.json(sanitized, { status: response.status })
    }

    // Pipe the SSE stream directly from backend to client
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new NextResponse(null, { status: 499 })
    }
    return NextResponse.json(internalError('confirm import'), { status: 500 })
  }
}
