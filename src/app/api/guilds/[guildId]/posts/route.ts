import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
            },
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}
