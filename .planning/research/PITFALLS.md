# Domain Pitfalls

**Domain:** Next.js 14 SaaS Dashboard with Discord OAuth & Multi-tenancy
**Researched:** 2026-01-24
**Confidence:** MEDIUM (based on training data, not verified with current sources due to WebSearch unavailability)

## Critical Pitfalls

Mistakes that cause security breaches, data leaks, or major rewrites.

### Pitfall 1: Client-Side Guild Filtering (Cross-Tenant Data Leak)

**What goes wrong:** Dashboard filters guild data client-side using JWT claims, but API returns all guilds for a user. An attacker modifies client code or intercepts responses to access guilds they shouldn't see.

**Why it happens:**
- Trusting JWT claims in browser without server-side validation on every request
- API endpoints that return data based on user ID alone, not guild permissions
- Assuming Next.js middleware validates authorization (it only authenticates)

**Consequences:**
- User A sees User B's guild data by manipulating requests
- GDPR violations, potential legal liability
- Complete loss of multi-tenant isolation

**Prevention:**
```typescript
// BAD: Client-side filtering
const guilds = await fetch('/api/guilds').then(r => r.json())
const filtered = guilds.filter(g => jwt.guilds.includes(g.id))

// GOOD: Server validates guild access on every request
// app/api/guilds/[guildId]/route.ts
export async function GET(req, { params }) {
  const session = await getSession(req)
  const hasAccess = await validateGuildAccess(session.userId, params.guildId)
  if (!hasAccess) return new Response('Forbidden', { status: 403 })

  // Query scoped to this guild ONLY
  return fetchGuildData(params.guildId)
}
```

**Detection:**
- Manual testing: Login as User A, intercept API calls, modify guildId parameter
- Automated: API integration tests that attempt cross-tenant access
- Code review: Search for client-side `.filter()` on guild/tenant data

**Phase mapping:** Phase 1 (Authentication) must establish server-side validation patterns. Phase 2 (Guild Management) implements it everywhere.

---

### Pitfall 2: JWT Stored in LocalStorage (XSS Token Theft)

**What goes wrong:** JWT stored in `localStorage` is accessible to any JavaScript on the page. One XSS vulnerability = attacker steals all user tokens.

**Why it happens:**
- Convenience — `localStorage` persists across tabs/refreshes
- Misunderstanding: "HttpOnly cookies don't work with client components"
- Following outdated tutorials (pre-App Router patterns)

**Consequences:**
- XSS attack → full account takeover
- Attacker can impersonate users indefinitely (until token expires)
- No way to revoke stolen tokens (stateless JWT)

**Prevention:**
```typescript
// BAD: localStorage JWT
localStorage.setItem('jwt', token)

// GOOD: HttpOnly cookie set by API route
// app/api/auth/callback/route.ts
export async function GET(req: NextRequest) {
  const token = await exchangeDiscordCode(code)

  const response = NextResponse.redirect('/dashboard')
  response.cookies.set('session', token, {
    httpOnly: true,  // Not accessible to JavaScript
    secure: true,    // HTTPS only
    sameSite: 'lax', // CSRF protection
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
  return response
}

// Access token server-side only
import { cookies } from 'next/headers'
const token = cookies().get('session')?.value
```

**Detection:**
- Code review: Search for `localStorage.setItem`, `sessionStorage.setItem`
- Browser DevTools: Check Application → Local Storage for sensitive data
- Security audit: Automated scan for XSS + token storage

**Phase mapping:** Phase 1 (Authentication) must use HttpOnly cookies from the start. Fixing this later requires migration code.

---

### Pitfall 3: Missing Guild Permissions Refresh (Stale Access)

**What goes wrong:** User is removed from a Discord guild, but dashboard still shows that guild because JWT hasn't been refreshed.

**Why it happens:**
- JWT is stateless — once issued, it's valid until expiration
- No webhook from Discord to notify permission changes
- Dashboard doesn't re-validate guild access on each page load

**Consequences:**
- Ex-admin retains read access to guild data after removal
- Security breach if user was removed for malicious behavior
- Violates user expectations ("I kicked them, why can they still see data?")

**Prevention:**
```typescript
// Strategy 1: Short-lived JWTs + refresh tokens
// JWT expires in 15 minutes, refresh token in 7 days
// Force re-check of guild permissions on refresh

// Strategy 2: Validate guild access on sensitive operations
async function validateCurrentGuildAccess(userId: string, guildId: string) {
  // Re-fetch from Discord API, not JWT claims
  const guilds = await fetchDiscordGuilds(userId)
  return guilds.some(g => g.id === guildId && hasManagePermissions(g))
}

// Strategy 3: Periodic background refresh
// Refresh guild list every 5 minutes in background
useEffect(() => {
  const interval = setInterval(async () => {
    await fetch('/api/auth/refresh-guilds')
  }, 5 * 60 * 1000)
  return () => clearInterval(interval)
}, [])
```

**Detection:**
- Manual test: Remove user from Discord guild, check if dashboard updates
- Monitoring: Track "403 Forbidden" responses (API rejects stale permissions)
- User reports: "I still see a guild I left"

**Phase mapping:** Phase 1 (Authentication) defines refresh strategy. Phase 2 (Guild Management) implements periodic validation.

---

### Pitfall 4: Unbounded SSE Connections (Memory Leak)

**What goes wrong:** Server-Sent Events connections are created but never cleaned up. Vercel function instances accumulate connections until memory exhausted.

**Why it happens:**
- Client navigates away without closing EventSource
- Server doesn't detect client disconnect
- No connection timeout or limit
- Edge Runtime limitations not understood

**Consequences:**
- Vercel function OOMs (Out of Memory)
- Dashboard becomes unresponsive
- SSE stops working for all users
- Unexpected Vercel bills (function duration charges)

**Prevention:**
```typescript
// Client: ALWAYS clean up
useEffect(() => {
  const eventSource = new EventSource('/api/bot-status')

  eventSource.onmessage = (event) => {
    setStatus(JSON.parse(event.data))
  }

  // CRITICAL: Close connection on unmount
  return () => {
    eventSource.close()
  }
}, [])

// Server: Detect disconnects and timeout
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        controller.close()
      }, 5 * 60 * 1000)

      // Detect client disconnect
      req.signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        controller.close()
      })

      // Send heartbeat to detect dead connections
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
          clearTimeout(timeout)
        }
      }, 30000)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

**Detection:**
- Vercel logs: Function duration increasing over time
- Memory monitoring: Track function memory usage
- Manual test: Open SSE page, navigate away, check if connection closes
- Load test: Open 100 SSE connections, verify memory stays bounded

**Phase mapping:** Phase 3 (Real-time Features) must implement proper cleanup. This is not fixable retroactively — requires architectural change.

---

### Pitfall 5: Cold Start UX Disaster (Vercel Serverless Functions)

**What goes wrong:** User navigates to dashboard after inactivity. First request takes 3-8 seconds as Vercel spins up function. User thinks site is broken.

**Why it happens:**
- Free/Hobby Vercel tier has aggressive cold starts
- Large dependencies (React Query, UI libraries) increase cold start time
- No loading states for initial data fetch
- Expectation mismatch (SaaS should feel instant)

**Consequences:**
- Poor perceived performance
- Increased bounce rate
- User complaints about "slow" dashboard
- Bad first impressions

**Prevention:**
```typescript
// Strategy 1: Streaming SSR (App Router default)
// Send shell immediately, stream content
export default async function GuildPage({ params }) {
  return (
    <Suspense fallback={<GuildSkeleton />}>
      <GuildData guildId={params.guildId} />
    </Suspense>
  )
}

// Strategy 2: Prefetch critical data in middleware
// middleware.ts warms up session before page renders

// Strategy 3: Client-side optimistic UI
<QueryClientProvider client={queryClient}>
  <Hydrate state={pageProps.dehydratedState}>
    {/* Pre-hydrated data from SSR, no fetch on mount */}
  </Hydrate>
</QueryClientProvider>

// Strategy 4: Keep functions warm (paid tier)
// Vercel Pro has better cold start SLA

// Strategy 5: Show immediate feedback
'use client'
export default function Dashboard() {
  const { data, isLoading } = useGuilds()

  // ALWAYS show skeleton on initial load
  if (isLoading) return <DashboardSkeleton />

  return <GuildList guilds={data} />
}
```

**Detection:**
- Lighthouse performance score
- Real User Monitoring (RUM) — track Time to First Byte
- Manual test: Clear Vercel cache, load page, measure time
- User feedback: "Why is it so slow?"

**Phase mapping:** Phase 1 (Foundation) must choose loading patterns. Phase 2-4 implement consistently. Fixing later = UI/UX refactor across all pages.

---

## Moderate Pitfalls

Mistakes that cause delays, tech debt, or degraded UX.

### Pitfall 6: React Query Cache Invalidation Hell

**What goes wrong:** User edits guild settings, sees old data. Manual page refresh shows new data. Confusion ensues.

**Why it happens:**
- Mutation doesn't invalidate related queries
- Cache keys don't match between queries and mutations
- Overly aggressive `staleTime` keeps old data
- Optimistic updates without rollback on error

**Prevention:**
```typescript
// Define consistent query keys
const guildKeys = {
  all: ['guilds'] as const,
  lists: () => [...guildKeys.all, 'list'] as const,
  detail: (id: string) => [...guildKeys.all, 'detail', id] as const,
  settings: (id: string) => [...guildKeys.all, 'settings', id] as const,
}

// Invalidate on mutation
const updateSettings = useMutation({
  mutationFn: (data) => fetch(`/api/guilds/${guildId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  onSuccess: () => {
    // Invalidate both detail and settings
    queryClient.invalidateQueries({ queryKey: guildKeys.detail(guildId) })
    queryClient.invalidateQueries({ queryKey: guildKeys.settings(guildId) })
  }
})
```

**Detection:**
- Manual test: Edit data, check if UI updates without refresh
- Check React Query DevTools for stale queries
- User reports: "My changes didn't save"

**Phase mapping:** Phase 2 (Guild Management) establishes cache patterns. All subsequent phases follow the same key structure.

---

### Pitfall 7: Missing Rate Limit Handling (Discord API)

**What goes wrong:** Dashboard makes too many requests to Discord API. Gets rate limited (429). User can't log in or see guilds.

**Why it happens:**
- Fetching Discord guilds on every page load
- No caching of Discord API responses
- Multiple components fetching same data independently
- Webhook setup hits rate limits during onboarding

**Prevention:**
```typescript
// Cache Discord API responses server-side
import { unstable_cache } from 'next/cache'

const getCachedDiscordGuilds = unstable_cache(
  async (userId: string) => {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${token}` }
    })

    // Handle rate limit
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after')
      throw new Error(`Rate limited, retry after ${retryAfter}s`)
    }

    return response.json()
  },
  ['discord-guilds'], // cache key
  { revalidate: 300 } // 5 minute cache
)
```

**Detection:**
- Vercel logs: 429 responses from Discord API
- Sentry/error tracking: RateLimitError events
- Manual test: Rapidly refresh pages, watch for failures

**Phase mapping:** Phase 1 (Authentication) must implement caching for OAuth flow. Phase 2 caches guild fetches.

---

### Pitfall 8: Pagination Without Cursor Tracking

**What goes wrong:** User navigates to page 2 of tracked accounts. New data arrives. Page 2 now shows some data from old page 1. Duplicates or missing items.

**Why it happens:**
- Using offset pagination with real-time data
- No stable ordering (new items inserted at top)
- Race condition between pagination fetch and SSE update

**Prevention:**
```typescript
// Use cursor-based pagination for real-time data
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['tracked-accounts', guildId],
  queryFn: ({ pageParam = undefined }) =>
    fetch(`/api/guilds/${guildId}/accounts?cursor=${pageParam}`),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})

// API returns cursor for stable pagination
{
  "items": [...],
  "nextCursor": "eyJpZCI6MTIzLCJ0cyI6MTYxNjE2MTYxNn0="
}
```

**Detection:**
- Manual test: Navigate to page 2, trigger SSE update, check for duplicates
- User reports: "I saw the same item twice"

**Phase mapping:** Phase 4 (Tracking Data Display) must use cursor pagination for all lists.

---

### Pitfall 9: Environment Variable Exposure (NEXT_PUBLIC Misuse)

**What goes wrong:** Sensitive API keys exposed in client bundle because they were prefixed with `NEXT_PUBLIC_`.

**Why it happens:**
- Misunderstanding Next.js environment variable rules
- Copy-pasting .env examples without reading docs
- Wanting to access API URL from client components

**Consequences:**
- API keys in public JavaScript bundle
- Anyone can extract and abuse keys
- Potential API bill from attacker usage

**Prevention:**
```bash
# .env.local

# GOOD: Server-only (not exposed to client)
API_SECRET_KEY=abc123
DISCORD_CLIENT_SECRET=xyz789

# GOOD: Public data, safe to expose
NEXT_PUBLIC_APP_URL=https://dashboard.example.com

# BAD: Never expose secrets
# NEXT_PUBLIC_API_SECRET=abc123  ❌
```

```typescript
// Access server-only vars in Server Components or API routes
export async function GET() {
  const secret = process.env.API_SECRET_KEY // ✅ Server-side only
  return fetch(api, { headers: { Authorization: secret } })
}

// Client components can't access non-public vars
'use client'
export default function Component() {
  const secret = process.env.API_SECRET_KEY // ❌ undefined
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL // ✅ works
}
```

**Detection:**
- Code review: Check .env.local for NEXT_PUBLIC_ prefix
- Build output: Search .next/ bundle for API keys
- Automated scan: Secret detection tools (GitGuardian, etc.)

**Phase mapping:** Phase 1 (Foundation) establishes .env patterns. All phases must follow.

---

### Pitfall 10: TypeScript `any` Escapes in API Responses

**What goes wrong:** API changes response shape. TypeScript doesn't catch it because type is `any`. Runtime error in production.

**Why it happens:**
- Quick prototyping with loose types
- External API (Discord, your backend) doesn't provide TypeScript types
- Frustration with type errors → `as any` escape hatch

**Consequences:**
- Runtime errors that TypeScript should have caught
- Difficult debugging (what shape did we expect?)
- Tech debt accumulates

**Prevention:**
```typescript
// BAD: Untyped API response
const guilds = await fetch('/api/guilds').then(r => r.json())
guilds.forEach(g => console.log(g.name)) // No autocomplete, no validation

// GOOD: Typed with Zod validation
import { z } from 'zod'

const GuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  permissions: z.number(),
})

type Guild = z.infer<typeof GuildSchema>

const response = await fetch('/api/guilds')
const data = await response.json()
const guilds = z.array(GuildSchema).parse(data) // Runtime validation
```

**Detection:**
- Code review: Search for `any`, `as any`, `@ts-ignore`
- ESLint rule: `@typescript-eslint/no-explicit-any`
- Manual test: Change API response shape, see if TypeScript errors

**Phase mapping:** Phase 1 (Foundation) establishes type validation patterns. All API integrations follow.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: Missing Loading States on Mutations

**What goes wrong:** User clicks "Save Settings", nothing happens for 2 seconds, clicks again, creates duplicate request.

**Why it happens:**
- No `isPending` check on mutation
- No disabled state on button during mutation
- No optimistic update or loading spinner

**Prevention:**
```typescript
const { mutate, isPending } = useMutation({
  mutationFn: updateGuildSettings,
})

<Button
  onClick={() => mutate(data)}
  disabled={isPending}
>
  {isPending ? 'Saving...' : 'Save Settings'}
</Button>
```

**Detection:**
- Manual test: Click save button rapidly
- User reports: "I clicked twice and it saved twice"

---

### Pitfall 12: Hardcoded API URLs

**What goes wrong:** API URL changes between dev/staging/prod. Code breaks in different environments.

**Why it happens:**
- Quick prototyping with `fetch('http://localhost:3001/...')`
- Not using environment variables

**Prevention:**
```typescript
// .env.local
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001 # If needed client-side

// lib/api.ts
const API_URL = process.env.API_BASE_URL || 'https://api.production.com'

export async function fetchGuilds() {
  return fetch(`${API_URL}/guilds`)
}
```

**Detection:**
- Code review: Search for `fetch('http`
- Deploy to staging, check if API calls work

---

### Pitfall 13: No Error Boundaries

**What goes wrong:** Component throws error. Entire page crashes to white screen.

**Why it happens:**
- React default behavior (uncaught errors unmount tree)
- Not using Error Boundaries in App Router

**Prevention:**
```typescript
// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

**Detection:**
- Manual test: Throw error in component, see if error boundary catches it
- User reports: "Page went blank"

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Authentication | JWT in localStorage (Pitfall 2) | Use HttpOnly cookies from day 1 |
| Phase 1: Authentication | Missing guild permission refresh (Pitfall 3) | Implement short-lived JWT + refresh token |
| Phase 2: Guild Management | Client-side guild filtering (Pitfall 1) | Server-side validation on every API route |
| Phase 2: Guild Management | React Query cache invalidation (Pitfall 6) | Define cache key structure upfront |
| Phase 3: Real-time Features | Unbounded SSE connections (Pitfall 4) | Implement cleanup and timeouts from start |
| Phase 3: Real-time Features | Cold start UX (Pitfall 5) | Use Suspense + streaming SSR |
| Phase 4: Tracking Data | Pagination with offset (Pitfall 8) | Use cursor-based pagination |
| All Phases | Environment variable exposure (Pitfall 9) | Audit .env.local before each phase |
| All Phases | TypeScript `any` escapes (Pitfall 10) | Enforce Zod validation for all API calls |

---

## Security Checklist (Per Phase)

Before marking any phase complete, verify:

- [ ] No JWT in localStorage or sessionStorage
- [ ] All API routes validate guild permissions server-side
- [ ] No `NEXT_PUBLIC_` prefix on secrets in .env.local
- [ ] All external API responses validated with Zod
- [ ] SSE connections have cleanup handlers
- [ ] Error boundaries exist for all route segments
- [ ] Rate limiting considered for Discord API calls
- [ ] TypeScript strict mode enabled, no `any` types
- [ ] Manual cross-tenant access test performed (try to access another user's guild)

---

## Confidence Assessment

**Overall confidence: MEDIUM**

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js 14 App Router | MEDIUM | Training data from mid-2024, App Router patterns may have evolved |
| Multi-tenant security | HIGH | Standard patterns, well-established in SaaS |
| Discord OAuth | MEDIUM | OAuth flows stable, but Discord API may have changed |
| SSE best practices | MEDIUM | Core patterns stable, Vercel-specific behavior may differ |
| JWT security | HIGH | Fundamental security principles, unlikely to change |

**Limitations:**
- WebSearch unavailable — could not verify current Next.js 14 best practices (2026)
- Could not check for recent Discord API changes or rate limit updates
- Vercel serverless behavior may have changed since training data
- No access to official Next.js documentation for App Router updates

**Recommended validation:**
- Cross-reference SSE implementation with current Vercel Edge Runtime docs
- Verify Discord OAuth rate limits and caching recommendations
- Check Next.js 14.x changelog for App Router security updates
- Review React Query v5 migration guide (if applicable)

---

## Sources

Due to WebSearch unavailability, all findings based on training data knowledge of:
- Next.js 13/14 App Router patterns (as of mid-2024)
- Discord Developer Documentation (OAuth flows, API structure)
- Multi-tenant SaaS security best practices (OWASP, industry standards)
- React Query documentation (v4/v5)
- Vercel serverless function behavior (Edge Runtime, Node.js Runtime)

**Recommended authoritative sources for validation:**
- Next.js App Router documentation: https://nextjs.org/docs/app
- Discord Developer Portal: https://discord.com/developers/docs
- OWASP Multi-tenancy Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multitenant_Architecture_Cheat_Sheet.html
- Vercel Edge Runtime docs: https://vercel.com/docs/functions/edge-functions/edge-runtime
- React Query documentation: https://tanstack.com/query/latest/docs/react/overview
