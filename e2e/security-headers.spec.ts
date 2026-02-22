import { test, expect } from '@playwright/test';

// Routes that go through middleware (get all security headers)
const MIDDLEWARE_PUBLIC_ROUTES = ['/', '/login'];

// Legal routes are excluded from the middleware matcher — no middleware headers
const LEGAL_ROUTES = ['/legal/terms', '/legal/privacy'];

// Protected routes that redirect unauthenticated users
const PROTECTED_ROUTES = ['/guilds', '/settings'];

test.describe('Security Headers', () => {
  for (const route of MIDDLEWARE_PUBLIC_ROUTES) {
    test(`CSP header present on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      // Follow redirects - check final response
      const csp = response?.headers()['content-security-policy'];

      // /login and / redirect to login but final page should have CSP
      if (response?.status() === 200) {
        expect(csp).toBeDefined();
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain('nonce-');
        expect(csp).toContain("'strict-dynamic'");
        expect(csp).toContain('https://fonts.gstatic.com');
        expect(csp).toContain('wss:');
        expect(csp).toContain('report-uri /api/csp-report');
        expect(csp).toContain("frame-ancestors 'none'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("upgrade-insecure-requests");
      }
    });

    test(`X-Frame-Options header on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      if (response?.status() === 200) {
        expect(response?.headers()['x-frame-options']).toBe('DENY');
      }
    });

    test(`X-Content-Type-Options header on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      if (response?.status() === 200) {
        expect(response?.headers()['x-content-type-options']).toBe('nosniff');
      }
    });

    test(`Referrer-Policy header on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      if (response?.status() === 200) {
        expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
      }
    });

    test(`Permissions-Policy header on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      if (response?.status() === 200) {
        const pp = response?.headers()['permissions-policy'];
        expect(pp).toBeDefined();
        expect(pp).toContain('geolocation=()');
        expect(pp).toContain('camera=()');
        expect(pp).toContain('microphone=()');
      }
    });

    test(`X-Request-ID header on ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      const requestId = response?.headers()['x-request-id'];
      expect(requestId).toBeDefined();
      // Should be a UUID format
      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  }

  // Legal routes are excluded from the middleware matcher by design.
  // They serve static content and do not receive middleware-injected headers.
  for (const route of LEGAL_ROUTES) {
    test(`${route} is accessible without auth`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'commit' });
      expect(response?.status()).toBe(200);
    });
  }

  // Protected routes return redirect responses - verify headers on redirect
  for (const route of PROTECTED_ROUTES) {
    test(`Security headers on redirect for ${route}`, async ({ request }) => {
      // Use API request context to avoid following redirects
      const response = await request.get(route, { maxRedirects: 0 });
      // Should redirect (302/307)
      expect([301, 302, 307, 308]).toContain(response.status());

      // X-Request-ID should be on redirects too
      const requestId = response.headers()['x-request-id'];
      expect(requestId).toBeDefined();
    });
  }

  test('CSP nonce is unique per request', async ({ page }) => {
    const response1 = await page.goto('/login', { waitUntil: 'commit' });
    const csp1 = response1?.headers()['content-security-policy'] ?? '';
    const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];

    const response2 = await page.goto('/login', { waitUntil: 'commit' });
    const csp2 = response2?.headers()['content-security-policy'] ?? '';
    const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });

  test('API routes do not have CSP header', async ({ request }) => {
    const response = await request.get('/api/auth/session');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeUndefined();
  });

  test('API routes have non-CSP security headers', async ({ request }) => {
    const response = await request.get('/api/auth/session');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });
});
