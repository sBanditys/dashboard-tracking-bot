import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get raw body and original Content-Type (includes multipart boundary)
    const rawBody = await request.arrayBuffer()
    const contentType = request.headers.get('content-type') ?? 'multipart/form-data'

    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/accounts/import`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: rawBody,
      }
    )

    const data = await response.json()
    if (!response.ok) {
      const sanitized = sanitizeError(response.status, data, 'upload import file')
      return NextResponse.json(sanitized, { status: response.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('upload import file'), { status: 500 })
  }
}
