import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const target = new URL('/auth/callback', request.url)
  target.search = request.nextUrl.search
  return NextResponse.redirect(target)
}
