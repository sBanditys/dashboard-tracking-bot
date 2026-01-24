# Phase 1: Foundation & Authentication - Research

**Researched:** 2026-01-24
**Domain:** Next.js 14 App Router Authentication & Dashboard UI
**Confidence:** HIGH

## Summary

This phase implements secure Discord OAuth authentication through an existing API, persistent JWT session management with HttpOnly cookies, and a responsive dashboard shell with dark mode. The standard approach uses Next.js 14 App Router with Server Components for authentication checks, middleware for route protection, and Server Actions for login/logout operations. The dashboard UI uses Tailwind CSS with the `next-themes` library for theme management and mobile-first responsive design.

The locked decisions specify: consuming existing API JWT endpoints (not implementing OAuth directly), using Tailwind CSS without component libraries for custom SaaS branding, React Query for API state management, sidebar + top bar layout (sidebar always expanded on desktop, slide-out drawer on mobile), and soft dark mode with purple accent colors.

**Primary recommendation:** Use Server Components to read HttpOnly cookies for authentication state, middleware to protect routes with proper matcher configuration to avoid redirect loops, Server Actions for login/logout with `useActionState` for error handling, and `next-themes` with Tailwind's class-based dark mode strategy.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x (App Router) | Framework | Official Next.js docs emphasize App Router for auth with Server Components |
| TypeScript | 5.x | Type safety | Industry standard for production Next.js apps |
| Tailwind CSS | 3.x/4.x | Styling | Official Tailwind docs show utility-first approach, mobile-first breakpoints |
| React Query (TanStack Query) | 5.x | API state management | Standard for caching API responses, automatic refetching |
| next-themes | 0.2.x+ | Theme management | Community standard for Next.js dark mode with no flash |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.x | Schema validation | Server Action form validation, API response validation |
| react-hook-form | 7.x | Form state management | Complex forms with validation (optional for simple login) |
| js-cookie | 3.x | Cookie utilities | Reading cookie values client-side if needed |
| clsx / classnames | 2.x | Class management | Conditional Tailwind classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-themes | Manual localStorage + useEffect | More control but flash of unstyled content, more boilerplate |
| React Query | SWR | Similar capabilities, smaller bundle, less features |
| Tailwind class-based dark mode | Tailwind prefers-color-scheme | No manual toggle, respects system only |

**Installation:**
```bash
npm install @tanstack/react-query next-themes clsx zod
npm install -D @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Route group for auth pages
│   │   ├── login/          # Login page
│   │   │   └── page.tsx
│   │   └── layout.tsx      # Auth layout (full-screen, no sidebar)
│   ├── (dashboard)/        # Route group for authenticated pages
│   │   ├── layout.tsx      # Dashboard layout (sidebar + top bar)
│   │   ├── page.tsx        # Home/welcome page
│   │   └── loading.tsx     # Skeleton loading state
│   ├── legal/              # Legal pages (accessible without auth)
│   │   ├── terms/
│   │   └── privacy/
│   ├── api/                # API routes (proxy to backend)
│   │   └── auth/
│   │       ├── login/route.ts
│   │       └── logout/route.ts
│   ├── layout.tsx          # Root layout (providers)
│   └── providers.tsx       # Client providers (React Query, theme)
├── components/
│   ├── ui/                 # Base UI components
│   │   ├── button.tsx
│   │   ├── skeleton.tsx
│   │   └── dropdown.tsx
│   ├── layout/             # Layout components
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── mobile-drawer.tsx
│   └── theme-toggle.tsx    # Dark/light mode toggle
├── lib/
│   ├── api-client.ts       # API fetch wrapper with auth
│   ├── auth.ts             # Auth utilities (getSession, etc.)
│   └── utils.ts            # General utilities (cn for classnames)
├── hooks/
│   ├── use-user.ts         # React Query hook for current user
│   └── use-mobile.ts       # Responsive mobile detection
└── middleware.ts           # Route protection middleware
```

### Pattern 1: Server Component Authentication Check
**What:** Read HttpOnly cookies in Server Components to determine auth state
**When to use:** Any page that needs to know if user is authenticated
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')

  if (!authToken) {
    redirect('/login')
  }

  // Fetch user data server-side
  const user = await fetch('https://api.example.com/user', {
    headers: { Authorization: `Bearer ${authToken.value}` }
  }).then(r => r.json())

  return <div>Welcome {user.username}</div>
}
```

### Pattern 2: Middleware Route Protection
**What:** Protect entire route segments with middleware, redirect to login if unauthenticated
**When to use:** Global protection for dashboard routes
**Example:**
```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/authentication
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  // Redirect authenticated users away from login
  if (isAuthPage && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login
  if (isDashboard && !authToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclude static files, API routes, images
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
```

### Pattern 3: Server Action for Login/Logout
**What:** Use Server Actions with `useActionState` for form submission and error handling
**When to use:** Login form, logout confirmation
**Example:**
```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/authentication
// app/lib/actions.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  try {
    // Call API to initiate Discord OAuth
    const response = await fetch('https://api.example.com/auth/discord/init', {
      method: 'POST',
    })

    const { authUrl } = await response.json()

    if (!response.ok) {
      return { error: 'Failed to connect to Discord' }
    }

    // Redirect to Discord OAuth
    redirect(authUrl)
  } catch (error) {
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  redirect('/login')
}

// app/(auth)/login/page.tsx
'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <form action={formAction}>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Connecting...' : 'Sign in with Discord'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  )
}
```

### Pattern 4: React Query for User Session
**What:** Use React Query to cache user data client-side, with automatic refetching
**When to use:** Client components that need user data
**Example:**
```typescript
// Source: https://github.com/alan2207/react-query-auth
// hooks/use-user.ts
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/user')
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    queryClient.removeQueries({ queryKey: ['user'] }) // Remove, not invalidate
    window.location.href = '/login'
  }
}
```

### Pattern 5: Dark Mode with next-themes
**What:** Use next-themes provider with Tailwind class-based dark mode
**When to use:** Root layout setup, theme toggle component
**Example:**
```typescript
// Source: https://github.com/pacocoursey/next-themes
// app/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// components/theme-toggle.tsx
'use client'

import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  )
}
```

### Pattern 6: Responsive Sidebar with Mobile Drawer
**What:** Desktop sidebar always visible, mobile slide-out drawer
**When to use:** Dashboard layout
**Example:**
```typescript
// Source: https://flowbite.com/docs/components/sidebar/
// app/(dashboard)/layout.tsx
'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/sidebar'
import Topbar from '@/components/layout/topbar'
import MobileDrawer from '@/components/layout/mobile-drawer'

export default function DashboardLayout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar - always visible on lg+ */}
      <aside className="hidden lg:block w-64 border-r border-gray-800">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar />
      </MobileDrawer>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// components/layout/mobile-drawer.tsx
'use client'

export default function MobileDrawer({ open, onClose, children }) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 z-50 transform transition-transform lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </aside>
    </>
  )
}
```

### Pattern 7: Loading States with loading.tsx
**What:** Use Next.js loading.tsx for automatic skeleton UI
**When to use:** Dashboard pages with async data fetching
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/loading
// app/(dashboard)/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-800 animate-pulse rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-800 animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Checking auth only in middleware:** Middleware can be bypassed; always verify in Server Components/Actions where data is accessed
- **Storing JWT in localStorage:** Vulnerable to XSS attacks; always use HttpOnly cookies
- **Using `useEffect` for auth redirects in Client Components:** Causes flash of wrong content; use Server Component redirects or middleware
- **Redirecting to same route in middleware:** Causes infinite loops; always check current path before redirecting
- **Not excluding static files in middleware matcher:** Middleware runs on every request including images/CSS, causing performance issues

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode theme management | Custom localStorage + useEffect | next-themes | Prevents flash of unstyled content, handles SSR, syncs across tabs |
| Responsive mobile detection | window.innerWidth checks | Tailwind breakpoints + CSS classes | SSR-safe, no hydration mismatch, better performance |
| API request caching | Custom cache object | React Query | Handles stale data, automatic refetching, optimistic updates, cache invalidation |
| Form validation | Manual error state | Zod + useActionState | Type-safe, reusable schemas, better error messages |
| Cookie parsing | Manual string splitting | cookies() from next/headers | Handles edge cases, type-safe, official Next.js API |
| OAuth callback handling | Custom state management | API handles OAuth, dashboard consumes JWT | Security boundary, separation of concerns |

**Key insight:** Authentication has many edge cases (expired tokens, concurrent requests, race conditions). The standard stack handles these through battle-tested libraries. Custom solutions miss edge cases that cause production bugs.

## Common Pitfalls

### Pitfall 1: Middleware Redirect Loops
**What goes wrong:** Middleware redirects to a route that middleware also processes, causing infinite redirects
**Why it happens:** Not checking if already on target route, or redirecting without proper conditions
**How to avoid:**
- Always check current path before redirecting
- Use `NextResponse.next()` to continue instead of redirecting when already on correct route
- Exclude auth API routes, static files, and images from middleware matcher
**Warning signs:** Browser shows "too many redirects" error, middleware runs hundreds of times

### Pitfall 2: Flash of Unauthenticated Content (FOUC)
**What goes wrong:** User sees login page briefly before being redirected to dashboard
**Why it happens:** Client-side auth check in `useEffect` runs after initial render
**How to avoid:**
- Use Server Components to check auth before rendering
- Use middleware to redirect before page loads
- Use `suppressHydrationWarning` on `<html>` tag with next-themes
**Warning signs:** Login page flashes when refreshing dashboard, theme switches visibly on page load

### Pitfall 3: Session Not Persisting Across Requests
**What goes wrong:** User logs in successfully but appears logged out on next request
**Why it happens:** HttpOnly cookie not set correctly, wrong domain/path, or HTTPS required but using HTTP
**How to avoid:**
- Set `httpOnly: true`, `secure: true` (in production), `sameSite: 'lax'` or `'strict'`
- Set `path: '/'` to make cookie available on all routes
- Use same domain for API and dashboard (or configure CORS correctly)
**Warning signs:** Login succeeds but `cookies().get('auth_token')` returns undefined, cookies not visible in browser DevTools

### Pitfall 4: React Query Showing Stale Data After Logout
**What goes wrong:** User logs out but still sees cached user data
**Why it happens:** `invalidateQueries` marks queries as stale but doesn't remove data; old data shows until refetch
**How to avoid:**
- Use `queryClient.removeQueries({ queryKey: ['user'] })` on logout, not `invalidateQueries`
- Clear all cached data with `queryClient.clear()` for full logout
- Set `staleTime` appropriately (5-10 minutes for user data)
**Warning signs:** User data still visible after logout, avatar shows old user

### Pitfall 5: Mobile Drawer Not Closing on Navigation
**What goes wrong:** Drawer stays open when user clicks a link, covering content
**Why it happens:** No event listener for route changes to close drawer
**How to avoid:**
- Close drawer in link onClick handlers
- Use `usePathname()` hook to detect route changes and close drawer
- Close drawer when overlay is clicked
**Warning signs:** Drawer remains open after navigation on mobile, user must manually close

### Pitfall 6: Server Actions Not Validating Authorization
**What goes wrong:** Protected actions can be called by unauthorized users
**Why it happens:** Assuming middleware/UI restrictions are sufficient security
**How to avoid:**
- Always verify user authorization at the start of every Server Action
- Check role/permissions, not just authentication
- Treat Server Actions like public API endpoints
**Warning signs:** Actions succeed when they should fail, unauthorized users can mutate data

### Pitfall 7: Dark Mode Hydration Mismatch
**What goes wrong:** React hydration error, console warnings about mismatched content
**Why it happens:** Server renders light mode, client JavaScript applies dark mode, HTML differs
**How to avoid:**
- Add `suppressHydrationWarning` to `<html>` tag
- Use `next-themes` with proper setup (ThemeProvider in root layout)
- Don't render theme-dependent content in Server Components
**Warning signs:** Hydration errors in console, theme flickers on page load, React warnings

## Code Examples

Verified patterns from official sources:

### Setting HttpOnly Cookies in Route Handler
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
// app/api/auth/callback/route.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // Exchange code for JWT with backend API
  const response = await fetch('https://api.example.com/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { 'Content-Type': 'application/json' }
  })

  const { token } = await response.json()

  // Set HttpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

### Tailwind Dark Mode Configuration
```css
/* Source: https://tailwindcss.com/docs/dark-mode */
/* tailwind.config.ts */
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Use class-based dark mode
  theme: {
    extend: {
      colors: {
        background: {
          light: '#ffffff',
          dark: '#1a1a1a',
        },
        surface: {
          light: '#f5f5f5',
          dark: '#2d2d2d',
        },
        accent: {
          purple: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

### React Query Provider Setup
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        onError: (error) => {
          console.error('Mutation error:', error)
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Mobile-First Responsive Utilities
```typescript
// Source: https://tailwindcss.com/docs/responsive-design
// Example component with mobile-first responsive design
export function DashboardCard() {
  return (
    <div className="
      p-4           /* Mobile: 16px padding */
      md:p-6        /* Tablet+: 24px padding */
      lg:p-8        /* Desktop+: 32px padding */

      text-sm       /* Mobile: small text */
      md:text-base  /* Tablet+: normal text */

      grid
      grid-cols-1   /* Mobile: 1 column */
      md:grid-cols-2 /* Tablet+: 2 columns */
      lg:grid-cols-3 /* Desktop+: 3 columns */

      gap-4         /* Mobile: 16px gap */
      lg:gap-6      /* Desktop+: 24px gap */
    ">
      {/* Content */}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js | Auth.js (v5) | 2023-2024 | Renamed, better App Router support, edge runtime compatible |
| Pages Router authentication | App Router Server Components | Next.js 13+ (2022) | Auth checks server-side, no client-side redirects, better security |
| localStorage for tokens | HttpOnly cookies | Always standard | Required for XSS protection, but emphasized more with App Router |
| SWR | React Query (TanStack Query) | React Query v5 (2023) | More features, better TypeScript, similar API |
| Manual dark mode | next-themes | Community standard since ~2020 | Prevents flash, handles SSR, localStorage sync |
| CSS modules | Tailwind CSS | Mainstream ~2021-2022 | Utility-first, mobile-first, faster development |
| `getServerSideProps` | Server Components | Next.js 13+ (2022) | No separate data fetching function, cleaner code |
| Middleware redirect for all auth | Middleware + Server Component checks | App Router best practice (2023+) | Defense in depth, middleware is first line not only line |

**Deprecated/outdated:**
- **NextAuth.js name:** Now called Auth.js (v5), same library but rebranded
- **Pages Router patterns:** `getServerSideProps`, `getSession()` in pages - use Server Components instead
- **Client-side only auth:** Always verify server-side in App Router
- **Long-lived JWTs without refresh:** Modern standard is short access tokens (15-30 min) + refresh token rotation

## Open Questions

Things that couldn't be fully resolved:

1. **Exact API endpoint contract**
   - What we know: Phase 0 completed, JWT endpoints exist
   - What's unclear: Exact request/response format for `/auth/discord/init`, `/auth/callback`, token refresh endpoint
   - Recommendation: Document API contract in separate file, or test with API to confirm format before implementation

2. **JWT expiration handling**
   - What we know: 30-day session requirement specified
   - What's unclear: Does API provide refresh tokens? Or is it a single 30-day JWT?
   - Recommendation: If refresh tokens exist, implement rotation pattern; if single long JWT, ensure API validates on each request

3. **Light mode color palette**
   - What we know: Dark mode specified (#1a1a1a-#2d2d2d range, purple accent)
   - What's unclear: Exact light mode colors (marked as Claude's discretion)
   - Recommendation: Create light mode palette based on Discord's light theme for consistency, user testing can refine

4. **Breadcrumb implementation specifics**
   - What we know: Breadcrumbs should show navigation path (Home > Guild > Page)
   - What's unclear: Dynamic generation strategy, styling specifics
   - Recommendation: Use Next.js `usePathname()` to generate breadcrumbs, store page titles in route metadata

## Sources

### Primary (HIGH confidence)
- [Next.js 14 Authentication Documentation](https://nextjs.org/docs/14/app/building-your-application/authentication) - Official auth patterns
- [Next.js Cookies API Reference](https://nextjs.org/docs/app/api-reference/functions/cookies) - HttpOnly cookie handling
- [Tailwind CSS Dark Mode Documentation](https://tailwindcss.com/docs/dark-mode) - Class-based dark mode
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Mobile-first breakpoints
- [Next.js Loading UI Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/loading) - loading.tsx patterns
- [TanStack Query Invalidation Guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) - Query invalidation vs removal

### Secondary (MEDIUM confidence)
- [WorkOS: Top Authentication Solutions for Next.js 2026](https://workos.com/blog/top-authentication-solutions-nextjs-2026) - Auth landscape overview
- [Clerk: Complete Authentication Guide for Next.js App Router](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router) - App Router patterns
- [Auth0: Refresh Tokens Best Practices](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/) - Token rotation
- [next-themes GitHub Repository](https://github.com/pacocoursey/next-themes) - Dark mode library
- [Flowbite: Tailwind Sidebar Components](https://flowbite.com/docs/components/sidebar/) - Sidebar patterns
- [Medium: Next.js Security Best Practices](https://medium.com/@sureshdotariya/robust-security-authentication-best-practices-in-next-js-16-6265d2d41b13) - Common mistakes

### Tertiary (LOW confidence)
- Various Stack Overflow and GitHub discussions for specific edge cases
- Community blog posts for implementation examples (verified against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified with official documentation and Context7
- Architecture: HIGH - Patterns from official Next.js docs and established Next.js conventions
- Pitfalls: HIGH - Common issues documented in Next.js GitHub issues and official warnings
- Code examples: HIGH - All examples sourced from official documentation or verified against official APIs

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - Next.js ecosystem is stable, but verify if Next.js 15 releases)

---

## Appendix: Tailwind Breakpoints Reference

Default breakpoints for mobile-first design:

| Prefix | Min Width | Target Devices |
|--------|-----------|----------------|
| (none) | 0px | Mobile (default) |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

Example: `hidden lg:block w-64` = hidden on mobile/tablet, visible 64px width on laptop+
