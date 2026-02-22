/**
 * Security Headers Utility
 *
 * Provides CSP policy builder and full security headers suite for the dashboard.
 * CSP is enforced immediately (not report-only) to prevent XSS attacks.
 */

/**
 * Build Content-Security-Policy header with nonce-based script protection
 *
 * Key CSP decisions:
 * - script-src: 'nonce-{nonce}' with 'strict-dynamic' for modern browsers
 *   + 'unsafe-eval' in dev only for Next.js HMR/Fast Refresh
 * - style-src: 'unsafe-inline' required for NProgress (creates dynamic <style> elements),
 *   global-error.tsx inline styles, and React style={{}} JSX props
 * - img-src: includes cdn.discordapp.com for Discord avatars
 * - frame-ancestors: 'none' to prevent iframe embedding (defense-in-depth with X-Frame-Options)
 */
export function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';

  const directives = [
    "default-src 'self'",
    // Script nonce with strict-dynamic for modern CSP
    // unsafe-eval only in dev for Next.js HMR
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // unsafe-inline required for NProgress, global-error, and component inline styles
    "style-src 'self' 'unsafe-inline'",
    // Discord CDN for avatars, plus blob/data for potential image handling
    "img-src 'self' blob: data: https://cdn.discordapp.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ];

  return directives.join('; ');
}

/**
 * Get full security headers suite including CSP
 *
 * Headers:
 * - Content-Security-Policy: XSS prevention via nonce-based script-src
 * - X-Frame-Options: Clickjacking prevention
 * - X-Content-Type-Options: MIME-sniffing prevention
 * - Referrer-Policy: Privacy-preserving referrer handling
 * - Permissions-Policy: Disable unnecessary browser features
 */
export function getSecurityHeaders(nonce: string): Record<string, string> {
  return {
    'Content-Security-Policy': buildCspHeader(nonce),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  };
}
