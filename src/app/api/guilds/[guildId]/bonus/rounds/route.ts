import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds${url.search}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'load bonus rounds'),
        { status: response.status }
      )
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(internalError('load bonus rounds'), { status: 500 })
  }
}

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
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'create bonus round'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('create bonus round'), { status: 500 })
  }
}
