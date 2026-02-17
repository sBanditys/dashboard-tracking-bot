import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type RouteParams = { params: Promise<{ guildId: string; groupId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId, groupId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/groups/${groupId}/alert-thresholds${url.search}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'load group alert thresholds')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('load group alert thresholds'), { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId, groupId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/groups/${groupId}/alert-thresholds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'create alert threshold')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(internalError('create alert threshold'), { status: 500 })
  }
}
