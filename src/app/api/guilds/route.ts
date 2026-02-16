import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function GET(_request: NextRequest) {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const response = await backendFetch(`${API_URL}/api/v1/guilds`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        const data = await response.json()
        if (!response.ok) {
            const sanitized = sanitizeError(response.status, data, 'load servers')
            return NextResponse.json(sanitized, { status: response.status })
        }
        return NextResponse.json(data)
    } catch {
        return NextResponse.json(internalError('load servers'), { status: 500 })
    }
}
