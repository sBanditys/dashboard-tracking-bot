import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ token: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await backendFetch(
      `${API_URL}/api/v1/refresh/download/${token}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    )

    if (!response.ok) {
      const data = await response.json()
      const sanitized = sanitizeError(response.status, data, 'download refresh result')
      return NextResponse.json(sanitized, { status: response.status })
    }

    // Pipe binary XLSX response
    const disposition = response.headers.get('content-disposition') ?? 'attachment; filename="refreshed.xlsx"'
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': disposition,
      },
    })
  } catch {
    return NextResponse.json(internalError('download refresh result'), { status: 500 })
  }
}
