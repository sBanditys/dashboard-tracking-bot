import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type RouteParams = { params: Promise<{ guildId: string; roundId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId, roundId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds/${roundId}/evaluate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'evaluate bonus round'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('evaluate bonus round'), { status: 500 })
  }
}
