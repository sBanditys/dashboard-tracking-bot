import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string; groupId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId, groupId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/groups/${groupId}/alert-settings`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'update alert settings')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('update alert settings'), { status: 500 })
  }
}
