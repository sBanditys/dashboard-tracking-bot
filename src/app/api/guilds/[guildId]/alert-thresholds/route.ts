import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

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
    const backendUrl = `${API_URL}/api/v1/guilds/${guildId}/alert-thresholds${url.search}`
    console.log('[DEBUG alert-thresholds] URL:', backendUrl, '| API_URL:', API_URL, '| token:', token ? `${token.slice(0, 20)}...` : 'NONE')
    const response = await backendFetch(
      backendUrl,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()
    console.log('[DEBUG alert-thresholds] Response:', response.status, JSON.stringify(data).slice(0, 200))
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'load alert thresholds')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('load alert thresholds'), { status: 500 })
  }
}
