/**
 * Extracts a human-readable error message from a dashboard API response body.
 * Dashboard API routes always output { error: string, code?: string } via sanitizeError().
 *
 * @param body - Parsed JSON response body
 * @param fallback - Fallback message if body is unparseable
 * @returns Human-readable error string with HTML tags stripped
 */
export function parseApiError(body: unknown, fallback: string): string {
  if (body === null || typeof body !== 'object') return fallback;
  const b = body as Record<string, unknown>;
  const message = typeof b.error === 'string' ? b.error : fallback;
  // Strip HTML tags per user decision (lightweight regex, no DOMParser)
  return message.replace(/<[^>]*>/g, '').trim() || fallback;
}
