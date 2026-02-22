import { test, expect } from '@playwright/test';

test.describe('CSRF Cookie', () => {
  test('_csrf_token cookie set on page load', async ({ page, context }) => {
    await page.goto('/login');
    const cookies = await context.cookies();
    const csrfCookie = cookies.find(c => c.name === '_csrf_token');

    expect(csrfCookie).toBeDefined();
    expect(csrfCookie?.httpOnly).toBe(false); // Client JS must read token
    expect(csrfCookie?.path).toBe('/');
    expect(csrfCookie?.sameSite).toBe('Lax');
  });

  test('_csrf_token cookie is a UUID', async ({ page, context }) => {
    await page.goto('/login');
    const cookies = await context.cookies();
    const csrfCookie = cookies.find(c => c.name === '_csrf_token');

    expect(csrfCookie?.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  test('_csrf_token rotates on each request', async ({ page, context }) => {
    await page.goto('/login');
    const cookies1 = await context.cookies();
    const token1 = cookies1.find(c => c.name === '_csrf_token')?.value;

    await page.goto('/login');
    const cookies2 = await context.cookies();
    const token2 = cookies2.find(c => c.name === '_csrf_token')?.value;

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2); // Per-request rotation
  });

  test('CSRF validation rejects mutation without token', async ({ request }) => {
    // POST to a non-auth API route without CSRF token should fail
    const response = await request.post('/api/guilds', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('EBADCSRFTOKEN');
  });
});
