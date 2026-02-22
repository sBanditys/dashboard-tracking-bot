import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter: IP -> { count, resetAt }
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

// Periodically clean stale entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimiter) {
    if (now > entry.resetAt) {
      rateLimiter.delete(ip);
    }
  }
}, 5 * 60_000); // Clean every 5 minutes

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return new NextResponse(null, { status: 429 });
  }

  const reportUri = process.env.CSP_REPORT_URI;
  if (!reportUri) {
    // No webhook configured, silently accept
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = await request.json();
    await fetch(reportUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        timestamp: new Date().toISOString(),
        source_ip: ip,
      }),
    });
  } catch {
    // Silently ignore forwarding errors - don't break client
  }

  return new NextResponse(null, { status: 204 });
}
