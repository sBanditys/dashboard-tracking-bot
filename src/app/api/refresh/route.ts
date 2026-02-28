import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Forward multipart body with original Content-Type (includes boundary)
    const rawBody = await request.arrayBuffer()
    const contentType = request.headers.get('content-type') ?? 'multipart/form-data'

    const response = await backendFetch(
      `${API_URL}/api/v1/refresh`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: rawBody,
        signal: request.signal,
      }
    )

    if (!response.ok) {
      const data = await response.json()
      const sanitized = sanitizeError(response.status, data, 'refresh CSV metrics')
      return NextResponse.json(sanitized, { status: response.status })
    }

    // Pipe SSE stream directly from backend to client
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
    return NextResponse.json(internalError('refresh CSV metrics'), { status: 500 })
  }
}
