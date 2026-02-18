import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string; recipientId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId, recipientId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/email-recipients/${recipientId}/resend-verification`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'resend verification email')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('resend verification email'), { status: 500 })
  }
}
