import { test, expect } from '@playwright/test';

test.describe('Auth Redirects', () => {
  test('unauthenticated user on /guilds redirects to /?returnTo=/guilds', async ({ request }) => {
    const response = await request.get('/guilds', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());

    const location = response.headers()['location'];
    expect(location).toBeDefined();
    // Should redirect to landing page with returnTo param
    // The path /guilds is URL-encoded as %2Fguilds in the query string
    expect(location).toContain('returnTo');
    expect(location).toContain('%2Fguilds');
  });

  test('unauthenticated user on / redirects to /login (no returnTo)', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());

    const location = response.headers()['location'];
    expect(location).toBeDefined();
    // Landing page (page.tsx) redirects unauthenticated users without returnTo to /login
    expect(location).toContain('/login');
  });

  test('landing page with returnTo redirects to login with callbackUrl', async ({ request }) => {
    // Simulate: middleware redirected to /?returnTo=/guilds/123
    // page.tsx handles this: bridges returnTo → /login?callbackUrl=
    const response = await request.get('/?returnTo=/guilds/123', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());

    const location = response.headers()['location'];
    expect(location).toBeDefined();
    // Landing page should bridge returnTo → callbackUrl
    expect(location).toContain('/login');
    expect(location).toContain('callbackUrl');
    expect(location).toContain(encodeURIComponent('/guilds/123'));
  });

  test('/auth/unverified-email accessible without auth', async ({ page }) => {
    const response = await page.goto('/auth/unverified-email');
    // Should not redirect to login
    expect(response?.status()).toBe(200);
  });

  test('/legal/terms accessible without auth', async ({ page }) => {
    const response = await page.goto('/legal/terms');
    expect(response?.status()).toBe(200);
  });

  test('/legal/privacy accessible without auth', async ({ page }) => {
    const response = await page.goto('/legal/privacy');
    expect(response?.status()).toBe(200);
  });
});
