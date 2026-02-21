import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type RouteParams = { params: Promise<{ guildId: string; roundId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId, roundId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds/${roundId}/payments/bulk`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'bulk update payments'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('bulk update payments'), { status: 500 })
  }
}
