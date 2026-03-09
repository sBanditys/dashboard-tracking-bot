import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string; campaignId: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { guildId, campaignId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}/campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'load campaign')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('load campaign'), { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId, campaignId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'update campaign')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(internalError('update campaign'), { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { guildId, campaignId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'delete campaign')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('delete campaign'), { status: 500 })
  }
}
