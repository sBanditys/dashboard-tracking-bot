/**
 * Middleware activation verification script for Phase 16.
 * Uses Playwright API directly (not test runner) to avoid sandbox hang issues.
 * Documented pattern from Phase 15-02.
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3001';
let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  PASS: ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  FAIL: ${msg}`);
  failed++;
}

async function main() {
  console.log('=== Middleware Activation Verification ===');
  console.log(`Target: ${BASE_URL}`);
  console.log('');

  // --- Static verification (always run) ---
  console.log('--- Static Verification ---');
  const { execSync } = await import('child_process');
  const { existsSync } = await import('fs');

  const middlewareExists = existsSync('/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/middleware.ts');
  middlewareExists ? pass('src/middleware.ts exists') : fail('src/middleware.ts MISSING');

  const proxyExists = existsSync('/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/proxy.ts');
  !proxyExists ? pass('src/proxy.ts does not exist (no dual-file conflict)') : fail('src/proxy.ts STILL EXISTS (conflict!)');

  try {
    const content = execSync('grep "export async function middleware" /Users/gabrielleal/Desktop/dashboard-tracking-bot/src/middleware.ts', { encoding: 'utf8' }).trim();
    content ? pass('middleware export name is correct') : fail('middleware export name not found');
  } catch {
    fail('Could not grep middleware export from src/middleware.ts');
  }

  try {
    execSync('grep "export async function proxy" /Users/gabrielleal/Desktop/dashboard-tracking-bot/src/middleware.ts 2>/dev/null', { encoding: 'utf8' });
    fail('Old proxy export name still present in src/middleware.ts');
  } catch {
    pass('Old proxy export name removed from src/middleware.ts');
  }

  console.log('');

  // --- Runtime verification via Playwright ---
  console.log('--- Runtime Verification ---');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Test 1: /login page — CSRF cookie and CSP header
    console.log('Test: /login page cookies and headers');
    const page = await context.newPage();
    let response;
    try {
      response = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      fail(`Failed to navigate to /login: ${e.message}`);
      await browser.close();
      process.exit(failed > 0 ? 1 : 0);
    }

    // Check CSP header on response
    const cspHeader = response.headers()['content-security-policy'];
    if (cspHeader && cspHeader.includes('nonce-')) {
      pass(`Content-Security-Policy header present with nonce: ${cspHeader.slice(0, 80)}...`);
    } else if (cspHeader) {
      pass(`Content-Security-Policy header present: ${cspHeader.slice(0, 80)}...`);
    } else {
      fail('Content-Security-Policy header MISSING from /login response');
    }

    // Check X-Request-ID
    const requestId = response.headers()['x-request-id'];
    requestId ? pass(`X-Request-ID header present: ${requestId}`) : fail('X-Request-ID header MISSING');

    // Check CSRF cookie
    const cookies = await context.cookies(`${BASE_URL}`);
    const csrfCookie = cookies.find(c => c.name === '_csrf_token');
    csrfCookie
      ? pass(`_csrf_token cookie set: ${csrfCookie.value.slice(0, 16)}... (httpOnly=false, sameSite=${csrfCookie.sameSite})`)
      : fail('_csrf_token cookie NOT SET on /login');

    await page.close();

    // Test 2: Unauthenticated request to /guilds → redirect
    console.log('Test: /guilds unauthenticated redirect');
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Track redirects
    const redirects = [];
    page2.on('response', r => {
      if (r.status() === 307 || r.status() === 302 || r.status() === 301) {
        redirects.push({ url: r.url(), status: r.status(), location: r.headers()['location'] });
      }
    });

    await page2.goto(`${BASE_URL}/guilds`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const finalUrl = page2.url();

    if (redirects.length > 0) {
      const redirect = redirects[0];
      pass(`Auth redirect issued: ${redirect.status} → ${redirect.location || 'location header'}`);
      if (redirect.location && redirect.location.includes('returnTo')) {
        pass(`returnTo parameter present in redirect location: ${redirect.location}`);
      } else {
        // Check final URL
        if (finalUrl.includes('returnTo') || finalUrl.includes('login') || !finalUrl.includes('/guilds')) {
          pass(`Final URL after redirect: ${finalUrl}`);
        } else {
          fail(`No returnTo in redirect and final URL still at /guilds: ${finalUrl}`);
        }
      }
    } else if (finalUrl !== `${BASE_URL}/guilds` && !finalUrl.includes('/guilds')) {
      pass(`Redirected away from /guilds to: ${finalUrl}`);
    } else {
      fail(`No redirect from /guilds for unauthenticated request. Final URL: ${finalUrl}`);
    }

    await page2.close();
    await context2.close();
    await context.close();
  } catch (e) {
    fail(`Playwright error: ${e.message}`);
  } finally {
    if (browser) await browser.close();
  }

  console.log('');
  console.log('=== Results ===');
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('ALL CHECKS PASSED - Middleware is active and functional');
    process.exit(0);
  } else {
    console.log('SOME CHECKS FAILED - Review output above');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Verification script error:', err);
  process.exit(1);
});
