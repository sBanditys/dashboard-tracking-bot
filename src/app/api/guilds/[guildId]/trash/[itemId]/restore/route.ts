import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string; itemId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId, itemId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: unknown = undefined
    try {
      body = await request.json()
    } catch {
      // Restore endpoint does not require a body; ignore parse errors for empty bodies.
    }

    const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}/trash/${itemId}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json()
      : { error: 'Restore request failed', status: response.status }

    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'restore item')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('restore item'), { status: 500 })
  }
}
