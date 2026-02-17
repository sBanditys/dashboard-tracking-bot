import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { guildId } = await params
    const { searchParams } = new URL(request.url)

    // Forward all query params to the API
    const queryString = searchParams.toString()

    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const url = `${API_URL}/api/v1/guilds/${guildId}/posts${queryString ? `?${queryString}` : ''}`
        const response = await backendFetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        const data = await response.json()
        if (!response.ok) {
            const sanitized = sanitizeError(response.status, data, 'load posts')
            return NextResponse.json(sanitized, { status: response.status })
        }
        return NextResponse.json(data)
    } catch {
        return NextResponse.json(internalError('load posts'), { status: 500 })
    }
}
