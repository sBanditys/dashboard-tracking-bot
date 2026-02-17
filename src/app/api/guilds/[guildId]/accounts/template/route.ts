import { backendFetch } from '@/lib/server/backend-fetch'
import { internalError } from '@/lib/server/error-sanitizer'
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
    const response = await backendFetch(
      `${API_URL}/api/v1/guilds/${guildId}/accounts/template`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        internalError('download import template'),
        { status: response.status }
      )
    }

    const contentDisposition =
      response.headers.get('Content-Disposition') ??
      'attachment; filename="import_template.csv"'

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json(internalError('download import template'), { status: 500 })
  }
}
