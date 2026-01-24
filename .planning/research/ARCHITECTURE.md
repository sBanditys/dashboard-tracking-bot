# Architecture Patterns: Next.js 14 Multi-Tenant SaaS Dashboard

**Domain:** Discord Bot Management Dashboard
**Researched:** 2026-01-24
**Confidence:** HIGH (based on Next.js official documentation)

## Executive Summary

Next.js 14 App Router provides a component-based architecture optimized for multi-tenant SaaS applications. The recommended architecture uses:

1. **Route groups** for logical organization (auth, dashboard, marketing)
2. **Server Components by default** with strategic Client Components for interactivity
3. **Server Actions** for mutations (settings updates, exports)
4. **Route Handlers** for API integration and SSE streams
5. **Middleware** for auth validation and tenant resolution
6. **Data Access Layer (DAL)** for centralized authorization

This architecture naturally supports the multi-tenant model (Discord guilds as tenants) with clear security boundaries and extensibility for future billing/marketing features.

---

## Recommended Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Dashboard                     │
│                      (Vercel)                            │
├──────────────────┬──────────────────┬───────────────────┤
│  Route Groups    │  Auth Layer      │  Data Layer       │
│  ────────────    │  ──────────      │  ──────────       │
│  (auth)          │  Middleware →    │  DAL →            │
│  (dashboard)     │  verifySession() │  API Client →     │
│  (legal)         │  JWT validation  │  React Query      │
│  (future:        │                  │                   │
│   marketing)     │                  │                   │
└──────────────────┴──────────────────┴───────────────────┘
                          │
                          ▼ HTTPS + JWT
┌─────────────────────────────────────────────────────────┐
│                 External API Server                      │
│              (Tracking Bot Backend)                      │
└─────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Type |
|-----------|---------------|-------------------|------|
| **Route Groups** | Organize routes by concern | Layouts, Pages | Structural |
| **Middleware** | Auth check, tenant resolution | verifySession(), Cookies | Server |
| **Data Access Layer (DAL)** | Centralized auth + tenant validation | API Client, Cookies | Server |
| **API Client** | HTTP client with JWT injection | External API | Server/Client |
| **React Query** | Client-side cache + sync | API Client | Client |
| **Server Actions** | Mutations (settings, exports) | API Client, DAL | Server |
| **Route Handlers** | SSE streams, webhooks | API Client | Server |
| **Server Components** | Data fetching, static UI | DAL, API Client | Server |
| **Client Components** | Interactivity, forms, real-time | React Query, Server Actions | Client |

---

## Folder Structure

### Recommended Layout

```
app/
├── layout.tsx                          # Root layout (ThemeProvider, QueryClient)
├── page.tsx                            # Landing/redirect (if not logged in → /login)
│
├── (auth)/                             # Auth route group (minimal layout)
│   ├── layout.tsx                      # Auth-specific layout (centered card)
│   ├── login/
│   │   └── page.tsx                    # Discord OAuth initiation
│   └── callback/
│       └── page.tsx                    # OAuth callback → set session → redirect
│
├── (dashboard)/                        # Protected dashboard routes
│   ├── layout.tsx                      # Dashboard shell (sidebar, header)
│   ├── page.tsx                        # Guild list (tenant selection)
│   ├── guilds/
│   │   └── [guildId]/
│   │       ├── layout.tsx              # Guild-specific layout (breadcrumb, guild switcher)
│   │       ├── page.tsx                # Guild overview (settings, usage, bot status)
│   │       ├── tracking/
│   │       │   ├── page.tsx            # Redirect to /tracking/accounts
│   │       │   ├── accounts/
│   │       │   │   └── page.tsx        # Tracked accounts (paginated table)
│   │       │   ├── posts/
│   │       │   │   └── page.tsx        # Tracked posts (paginated table)
│   │       │   └── brands/
│   │       │       └── page.tsx        # Brands list
│   │       ├── settings/
│   │       │   └── page.tsx            # Guild settings form
│   │       └── audit/
│   │           └── page.tsx            # Audit log
│   └── account/
│       ├── page.tsx                    # User account settings
│       └── sessions/
│           └── page.tsx                # Active sessions management
│
├── (legal)/                            # Public legal pages (minimal layout)
│   ├── layout.tsx
│   ├── terms/
│   │   └── page.tsx
│   └── privacy/
│       └── page.tsx
│
├── api/                                # Route Handlers (not external API)
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts                # Discord OAuth callback handler
│   │   └── logout/
│   │       └── route.ts                # Session revocation
│   └── guilds/
│       └── [guildId]/
│           └── status/
│               └── route.ts            # SSE stream for bot status
│
lib/
├── auth/
│   ├── session.ts                      # createSession(), deleteSession()
│   ├── dal.ts                          # verifySession() with React cache()
│   └── middleware.ts                   # Auth check + tenant resolution
├── api/
│   ├── client.ts                       # API client with JWT injection
│   └── types.ts                        # Generated from OpenAPI spec
├── hooks/
│   ├── use-guilds.ts                   # React Query hook for guilds
│   ├── use-guild-details.ts            # React Query hook for guild data
│   └── use-bot-status.ts               # SSE hook for real-time status
└── components/
    ├── providers/
    │   ├── query-client-provider.tsx   # React Query setup
    │   └── theme-provider.tsx          # Theme context
    ├── ui/                             # Reusable UI components
    └── features/                       # Feature-specific components
        ├── guild-list.tsx
        ├── guild-switcher.tsx
        └── bot-status-badge.tsx

middleware.ts                           # Edge middleware for auth checks
```

### Key Structural Decisions

**Route Groups:**
- `(auth)`: Minimal layout, public routes (no sidebar/header)
- `(dashboard)`: Protected routes, full dashboard UI
- `(legal)`: Public but with minimal chrome
- Future: `(marketing)` for landing pages, pricing (different root layout)

**Why this works:**
- Route groups organize by **concern**, not URL structure
- Each group can have a different root layout without page reloads
- Extensible: adding `(marketing)` later doesn't affect existing routes

**File conventions:**
- `layout.tsx`: Nested layouts for progressive UI enhancement
- `page.tsx`: Route endpoints
- `route.ts`: API endpoints (Route Handlers for SSE, webhooks)
- `loading.tsx`: Streaming UI with Suspense boundaries
- `error.tsx`: Error boundaries per route segment

---

## Data Flow

### 1. Authentication Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Click "Login with Discord"
       ▼
┌─────────────────────────────────┐
│  /login (Server Component)      │
│  - Render login button          │
└──────┬──────────────────────────┘
       │ 2. Redirect to Discord OAuth
       ▼
┌─────────────────────────────────┐
│  Discord OAuth (External)       │
└──────┬──────────────────────────┘
       │ 3. Authorization code
       ▼
┌─────────────────────────────────┐
│  /api/auth/callback (Route      │
│   Handler)                       │
│  - Exchange code for tokens     │
│  - Fetch user guilds            │
│  - Request JWT from API         │
│  - Set session cookie           │
└──────┬──────────────────────────┘
       │ 4. Redirect to /dashboard
       ▼
┌─────────────────────────────────┐
│  Middleware                      │
│  - Read session cookie          │
│  - Decrypt JWT                  │
│  - Attach userId to request     │
└──────┬──────────────────────────┘
       │ 5. Allow request
       ▼
┌─────────────────────────────────┐
│  /dashboard (Server Component)  │
│  - verifySession() from DAL     │
│  - Fetch guilds from API        │
│  - Render guild list            │
└─────────────────────────────────┘
```

**Key points:**
- Session stored as **HttpOnly, Secure cookie** (prevents XSS)
- JWT contains `{ userId, guilds: [{ guildId, clientId }] }`
- Middleware performs **optimistic check** (fast, edge-based)
- DAL performs **authoritative check** (server-side, per-route)

### 2. Data Fetching Flow (Server Components)

```
┌─────────────────────────────────┐
│  Page (Server Component)        │
│  - await verifySession()        │ ← DAL validates auth + tenant
│  - await getGuildDetails()      │ ← API Client (server-side)
│  - Render UI with data          │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  API Client (lib/api/client.ts) │
│  - Inject JWT from cookies      │
│  - GET /api/v1/guilds/:id       │
└──────┬──────────────────────────┘
       │ HTTPS + JWT
       ▼
┌─────────────────────────────────┐
│  External API Server            │
│  - Validate JWT                 │
│  - Verify clientId access       │
│  - Return guild data            │
└─────────────────────────────────┘
```

**Advantages:**
- Data fetched **close to the source** (server-side)
- No API keys exposed to client
- Automatic request deduplication via `fetch()` memoization
- Can use React `cache()` for additional caching

### 3. Mutation Flow (Server Actions)

```
┌─────────────────────────────────┐
│  Settings Form (Client          │
│   Component)                     │
│  - User edits settings          │
│  - Submits form                 │
└──────┬──────────────────────────┘
       │ Form submission
       ▼
┌─────────────────────────────────┐
│  Server Action (updateGuild)    │
│  'use server'                    │
│  - await verifySession()        │ ← Auth check
│  - Validate form data (Zod)     │
│  - await api.updateGuild()      │ ← API call
│  - revalidatePath()             │ ← Refresh UI
│  - return { success: true }     │
└──────┬──────────────────────────┘
       │ HTTPS + JWT
       ▼
┌─────────────────────────────────┐
│  External API Server            │
│  - Validate JWT                 │
│  - Update database              │
│  - Log audit entry              │
└─────────────────────────────────┘
```

**Key points:**
- Server Actions replace traditional API routes for mutations
- Progressive enhancement: works without JavaScript loaded
- Automatic transition states (`useActionState()`)
- Security: all validation happens server-side

### 4. Real-Time Updates Flow (SSE)

```
┌─────────────────────────────────┐
│  Bot Status Component (Client)  │
│  - useEffect(() => {            │
│      const eventSource = new    │
│      EventSource('/api/guilds/  │
│        [id]/status')             │
│    }, [guildId])                │
└──────┬──────────────────────────┘
       │ SSE connection
       ▼
┌─────────────────────────────────┐
│  Route Handler (GET /api/       │
│   guilds/[id]/status/route.ts)  │
│  - verifySession()              │
│  - Create ReadableStream        │
│  - Poll API every 5s            │
│  - Send events to client        │
└──────┬──────────────────────────┘
       │ HTTPS polling
       ▼
┌─────────────────────────────────┐
│  External API Server            │
│  - GET /api/v1/guilds/:id/      │
│    status                        │
│  - Return bot health            │
└─────────────────────────────────┘
```

**Alternative: React Query with polling (simpler for MVP):**

```tsx
// lib/hooks/use-bot-status.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useBotStatus(guildId: string) {
  return useQuery({
    queryKey: ['bot-status', guildId],
    queryFn: () => api.getGuildStatus(guildId),
    refetchInterval: 5000, // Poll every 5s
    staleTime: 4000,        // Consider fresh for 4s
  })
}
```

**Recommendation:** Start with React Query polling for MVP (simpler), migrate to SSE in Phase 2 if needed.

---

## Component Architecture

### Server vs Client Component Decision Tree

```
Does the component need:
├─ State (useState, useReducer)?
│  └─ YES → Client Component ('use client')
├─ Event handlers (onClick, onChange)?
│  └─ YES → Client Component
├─ Browser APIs (localStorage, window)?
│  └─ YES → Client Component
├─ Custom hooks (useQuery, useForm)?
│  └─ YES → Client Component
├─ Context (useContext)?
│  └─ YES → Client Component
└─ None of the above?
   └─ Server Component (default)
```

### Component Layering Pattern

**Maximize Server Components, minimize Client Component scope:**

```tsx
// app/(dashboard)/guilds/[guildId]/page.tsx (Server Component)
import { verifySession } from '@/lib/auth/dal'
import { api } from '@/lib/api/client'
import { GuildSettings } from './guild-settings'      // Client
import { BotStatusBadge } from './bot-status-badge'  // Client
import { UsageChart } from './usage-chart'            // Server

export default async function GuildPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params
  const session = await verifySession()

  // Parallel data fetching
  const [guild, usage] = await Promise.all([
    api.getGuild(guildId),
    api.getGuildUsage(guildId),
  ])

  return (
    <div>
      <header>
        <h1>{guild.name}</h1>
        <BotStatusBadge guildId={guildId} />  {/* Client: real-time updates */}
      </header>

      <UsageChart data={usage} />              {/* Server: static rendering */}
      <GuildSettings initialData={guild} />    {/* Client: form interactivity */}
    </div>
  )
}
```

**Pattern: Pass initial data from Server to Client:**

```tsx
// bot-status-badge.tsx (Client Component)
'use client'

import { useBotStatus } from '@/lib/hooks/use-bot-status'

export function BotStatusBadge({ guildId }: { guildId: string }) {
  const { data: status, isLoading } = useBotStatus(guildId)

  if (isLoading) return <div className="badge">Checking...</div>

  return (
    <div className={`badge ${status?.online ? 'online' : 'offline'}`}>
      {status?.online ? 'Online' : 'Offline'}
    </div>
  )
}
```

### Layout Composition

**Nested layouts enable progressive UI enhancement:**

```
Root Layout (app/layout.tsx)
├─ <html>, <body>
├─ Theme Provider
├─ React Query Provider
│
├─ (dashboard)/layout.tsx
│  ├─ Sidebar
│  ├─ Header
│  │
│  ├─ guilds/[guildId]/layout.tsx
│  │  ├─ Guild Switcher
│  │  ├─ Breadcrumb
│  │  │
│  │  └─ {children} (guild pages)
```

**Example:**

```tsx
// app/(dashboard)/guilds/[guildId]/layout.tsx
import { verifySession } from '@/lib/auth/dal'
import { api } from '@/lib/api/client'
import { GuildSwitcher } from '@/components/features/guild-switcher'

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ guildId: string }>
}) {
  const { guildId } = await params
  await verifySession() // Auth check

  const guild = await api.getGuild(guildId)

  return (
    <div>
      <div className="guild-header">
        <GuildSwitcher currentGuild={guild} />
        <nav>
          <Link href={`/guilds/${guildId}`}>Overview</Link>
          <Link href={`/guilds/${guildId}/tracking`}>Tracking</Link>
          <Link href={`/guilds/${guildId}/settings`}>Settings</Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
```

---

## Security Architecture

### Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Edge Middleware (Optimistic Check)            │
│  - Verify session cookie exists                         │
│  - Decrypt JWT (basic validation)                       │
│  - Redirect to /login if invalid                        │
└──────────────────┬──────────────────────────────────────┘
                   │ Allowed
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Data Access Layer (Authoritative Check)       │
│  - verifySession() with React cache()                   │
│  - Validate userId, expiration                          │
│  - Throw redirect if invalid                            │
└──────────────────┬──────────────────────────────────────┘
                   │ Authorized
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: API Client (Tenant Scoping)                   │
│  - Inject guildId in API requests                       │
│  - External API validates clientId from JWT             │
└──────────────────┬──────────────────────────────────────┘
                   │ Tenant-scoped data
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Server Actions (Input Validation)             │
│  - verifySession() again (CRITICAL)                     │
│  - Zod schema validation                                │
│  - Permission checks (admin-only actions)               │
└─────────────────────────────────────────────────────────┘
```

### Middleware Implementation

```ts
// middleware.ts (runs on Edge runtime)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/session'
import { cookies } from 'next/headers'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/legal')) {
    return NextResponse.next()
  }

  // Protected routes
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### Data Access Layer Pattern

```ts
// lib/auth/dal.ts
import { cache } from 'react'
import { cookies } from 'next/headers'
import { decrypt } from './session'
import { redirect } from 'next/navigation'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    redirect('/login')
  }

  return {
    isAuth: true,
    userId: session.userId,
    guilds: session.guilds, // [{ guildId, clientId, permissions }]
  }
})

// Usage in Server Components, Server Actions, Route Handlers
export async function getUser() {
  const session = await verifySession()
  // session.userId is guaranteed to exist
}
```

**Why `cache()`?**
- Ensures `verifySession()` is called only once per request
- Multiple components can call it without performance penalty
- React automatically deduplicates calls

### Server Action Security Pattern

```ts
// app/(dashboard)/guilds/[guildId]/actions.ts
'use server'

import { verifySession } from '@/lib/auth/dal'
import { api } from '@/lib/api/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateGuildSchema = z.object({
  guildId: z.string(),
  settings: z.object({
    trackingEnabled: z.boolean(),
    notificationsEnabled: z.boolean(),
  }),
})

export async function updateGuildSettings(formData: FormData) {
  // 1. Auth check (CRITICAL - never skip)
  const session = await verifySession()

  // 2. Parse and validate input
  const rawData = {
    guildId: formData.get('guildId'),
    settings: JSON.parse(formData.get('settings') as string),
  }

  const result = updateGuildSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { guildId, settings } = result.data

  // 3. Verify user has access to this guild
  const hasAccess = session.guilds.some(g => g.guildId === guildId)
  if (!hasAccess) {
    return { success: false, error: 'Unauthorized' }
  }

  // 4. Perform mutation
  try {
    await api.updateGuild(guildId, settings)

    // 5. Revalidate affected paths
    revalidatePath(`/guilds/${guildId}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Update failed' }
  }
}
```

---

## API Integration Layer

### API Client Structure

```ts
// lib/api/client.ts
import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com'

class ApiClient {
  private async getAuthHeaders() {
    const cookie = (await cookies()).get('session')?.value
    if (!cookie) throw new Error('No session')

    return {
      'Authorization': `Bearer ${cookie}`,
      'Content-Type': 'application/json',
    }
  }

  async getGuilds() {
    const headers = await this.getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/v1/guilds`, { headers })
    if (!res.ok) throw new Error('Failed to fetch guilds')
    return res.json()
  }

  async getGuild(guildId: string) {
    const headers = await this.getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/v1/guilds/${guildId}`, { headers })
    if (!res.ok) throw new Error('Failed to fetch guild')
    return res.json()
  }

  async updateGuild(guildId: string, data: any) {
    const headers = await this.getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/v1/guilds/${guildId}/settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update guild')
    return res.json()
  }

  // ... more methods
}

export const api = new ApiClient()
```

**For Client Components (React Query):**

```ts
// lib/api/client-api.ts (browser-safe version)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!

export const clientApi = {
  async getGuildStatus(guildId: string) {
    const res = await fetch(`${API_BASE_URL}/api/v1/guilds/${guildId}/status`, {
      credentials: 'include', // Send cookies
    })
    if (!res.ok) throw new Error('Failed to fetch status')
    return res.json()
  },
  // ... client-safe methods only
}
```

### React Query Integration

```tsx
// lib/providers/query-client-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,        // 1 minute
        refetchOnWindowFocus: false,
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

```tsx
// lib/hooks/use-guilds.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { clientApi } from '@/lib/api/client-api'

export function useGuilds() {
  return useQuery({
    queryKey: ['guilds'],
    queryFn: () => clientApi.getGuilds(),
  })
}
```

---

## Build Order & Dependencies

### Phase 1: Foundation (Week 1)

**Dependencies:** None
**Goal:** Basic routing and auth flow

1. **Set up Next.js project**
   - Initialize with App Router
   - Configure TypeScript, Tailwind CSS
   - Set up route groups: `(auth)`, `(dashboard)`, `(legal)`

2. **Implement auth layer**
   - Create session utilities (`lib/auth/session.ts`)
   - Create DAL with `verifySession()` (`lib/auth/dal.ts`)
   - Create middleware for route protection
   - Create OAuth callback Route Handler (`app/api/auth/callback/route.ts`)

3. **Create login flow**
   - Build login page (`app/(auth)/login/page.tsx`)
   - Build callback handler
   - Build logout Route Handler

4. **Create placeholder pages**
   - Dashboard home (guild list placeholder)
   - Legal pages (terms, privacy with placeholder text)

**Validation:** User can log in via Discord, session persists, logout works

---

### Phase 2: Core Dashboard (Week 2)

**Dependencies:** Phase 1 complete
**Goal:** View-only guild data

1. **API client layer**
   - Create server-side API client (`lib/api/client.ts`)
   - Create client-side API client (`lib/api/client-api.ts`)
   - Define TypeScript types for API responses

2. **Build guild list page**
   - Server Component fetches guilds
   - Display as cards/table
   - Link to guild details

3. **Build guild detail page**
   - Create nested layout (`app/(dashboard)/guilds/[guildId]/layout.tsx`)
   - Build overview page (settings display, usage stats)
   - Create guild switcher component

4. **React Query setup**
   - Configure QueryClientProvider
   - Create custom hooks for common queries

**Validation:** User can see their guilds, navigate to guild details, view settings and usage

---

### Phase 3: Tracking Data Views (Week 2-3)

**Dependencies:** Phase 2 complete
**Goal:** Display tracking data (read-only)

1. **Build tracking pages**
   - Tracked accounts page with pagination (`app/(dashboard)/guilds/[guildId]/tracking/accounts/page.tsx`)
   - Tracked posts page with pagination
   - Brands page

2. **Create reusable table components**
   - Paginated table component
   - Search/filter components (Client Components)
   - Loading skeletons

3. **Optimize data fetching**
   - Implement parallel fetching where possible
   - Add loading.tsx for Suspense boundaries
   - Configure React Query caching strategies

**Validation:** User can browse tracked accounts, posts, and brands with pagination

---

### Phase 4: Real-Time Features (Week 3)

**Dependencies:** Phase 3 complete
**Goal:** Bot status updates

**Option A: React Query with Polling (MVP)**

1. **Create status hook**
   - `useBotStatus()` with `refetchInterval`
   - Status badge component

2. **Add to guild overview**
   - Display online/offline status
   - Show last heartbeat time

**Option B: SSE (Phase 2 Enhancement)**

1. **Create SSE Route Handler**
   - `app/api/guilds/[guildId]/status/route.ts`
   - Implement ReadableStream
   - Poll external API and push events

2. **Create SSE hook**
   - `useBotStatusSSE()` with EventSource
   - Handle reconnection logic

**Validation:** Bot status updates in real-time (or every 5s with polling)

---

### Phase 5: Mutations (Week 4)

**Dependencies:** Phase 4 complete
**Goal:** Settings updates, exports

1. **Create Server Actions**
   - `updateGuildSettings()` action
   - Input validation with Zod
   - Error handling and revalidation

2. **Build settings form**
   - Client Component with form state
   - Use `useActionState()` for submission
   - Display success/error messages

3. **Add audit log page**
   - Server Component fetches audit log
   - Display timeline of changes

4. **Add export functionality**
   - Server Action to request export
   - Display export status

**Validation:** User can update guild settings, changes persist, audit log shows changes

---

### Phase 6: Polish & Deploy (Week 4)

**Dependencies:** Phase 5 complete
**Goal:** Production-ready

1. **UI polish**
   - Error states for all pages
   - Loading states with skeletons
   - Empty states with helpful CTAs

2. **Performance optimization**
   - Review Server/Client Component boundaries
   - Optimize images with next/image
   - Add metadata for SEO

3. **Deploy to Vercel**
   - Configure environment variables
   - Set up preview deployments
   - Test production build

4. **Monitor and iterate**
   - Set up error tracking
   - Monitor performance metrics

**Validation:** Dashboard deployed, accessible, performant

---

## Patterns to Follow

### Pattern 1: Server-First Data Fetching

**What:** Fetch data in Server Components by default, only use Client Components for interactivity
**When:** Any page that displays data
**Example:**

```tsx
// Server Component (default)
export default async function GuildPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params
  const guild = await api.getGuild(guildId) // Server-side fetch

  return (
    <div>
      <h1>{guild.name}</h1>
      <StaticDataTable data={guild.tracking} />      {/* Server Component */}
      <InteractiveSettings initial={guild.settings} /> {/* Client Component */}
    </div>
  )
}
```

**Why:** Reduces JavaScript sent to browser, improves FCP, keeps API keys secure

---

### Pattern 2: Progressive Enhancement with Server Actions

**What:** Use Server Actions for forms that work without JavaScript
**When:** Any mutation (settings update, data export)
**Example:**

```tsx
// Server Action
'use server'
export async function updateSettings(formData: FormData) {
  const session = await verifySession()
  // ... validation and API call
  revalidatePath('/guilds/[guildId]')
  return { success: true }
}

// Client Component
'use client'
export function SettingsForm({ initial }: { initial: Settings }) {
  const [state, action, isPending] = useActionState(updateSettings, null)

  return (
    <form action={action}>
      <input name="setting1" defaultValue={initial.setting1} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {state?.success && <p>Saved!</p>}
    </form>
  )
}
```

**Why:** Works before JavaScript loads, automatic transition states, cleaner than traditional API routes

---

### Pattern 3: Tenant Isolation via DAL

**What:** Centralize auth and tenant validation in a Data Access Layer
**When:** Every Server Component, Server Action, Route Handler
**Example:**

```ts
// lib/auth/dal.ts
export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) redirect('/login')
  return session
})

// Usage everywhere
export default async function ProtectedPage() {
  const session = await verifySession() // Guaranteed auth
  const guilds = session.guilds          // User's allowed guilds
  // ...
}
```

**Why:** Single source of truth for auth, prevents accidental bypass, uses React cache() for performance

---

### Pattern 4: Optimistic UI with React Query

**What:** Update UI immediately while mutation is in progress
**When:** Client-side mutations where instant feedback improves UX
**Example:**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function ToggleTracking({ guildId, enabled }: { guildId: string, enabled: boolean }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newEnabled: boolean) => clientApi.updateGuild(guildId, { enabled: newEnabled }),
    onMutate: async (newEnabled) => {
      // Optimistically update
      await queryClient.cancelQueries({ queryKey: ['guild', guildId] })
      const previous = queryClient.getQueryData(['guild', guildId])
      queryClient.setQueryData(['guild', guildId], (old: any) => ({
        ...old,
        settings: { ...old.settings, enabled: newEnabled }
      }))
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['guild', guildId], context?.previous)
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
  })

  return (
    <button onClick={() => mutation.mutate(!enabled)}>
      {enabled ? 'Disable' : 'Enable'} Tracking
    </button>
  )
}
```

**Why:** Instant feedback, automatic rollback on error, eventual consistency

---

### Pattern 5: Parallel Data Fetching

**What:** Fetch multiple independent resources simultaneously
**When:** Pages that need data from multiple API endpoints
**Example:**

```tsx
export default async function GuildOverview({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params

  // Parallel fetching (faster than sequential)
  const [guild, usage, status] = await Promise.all([
    api.getGuild(guildId),
    api.getGuildUsage(guildId),
    api.getGuildStatus(guildId),
  ])

  return (
    <div>
      <GuildHeader guild={guild} status={status} />
      <UsageChart data={usage} />
    </div>
  )
}
```

**Why:** Reduces total load time, improves perceived performance

---

### Pattern 6: Streaming with Suspense Boundaries

**What:** Stream parts of the page as data becomes available
**When:** Pages with slow data sources or multiple independent sections
**Example:**

```tsx
import { Suspense } from 'react'

export default function GuildPage({ params }: { params: Promise<{ guildId: string }> }) {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <GuildHeader guildId={params.guildId} />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <UsageChart guildId={params.guildId} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <TrackingTable guildId={params.guildId} />
      </Suspense>
    </div>
  )
}

async function UsageChart({ guildId }: { guildId: string }) {
  const usage = await api.getGuildUsage(guildId) // Slow query
  return <Chart data={usage} />
}
```

**Why:** Faster Time to First Byte, progressive rendering, better perceived performance

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client Component Sprawl

**What goes wrong:** Adding `'use client'` at the top of every file
**Why bad:** Sends unnecessary JavaScript to browser, loses Server Component benefits
**Instead:** Only mark interactive leaves as Client Components

```tsx
// BAD: Entire page is Client Component
'use client'
export default function Page() {
  const [filter, setFilter] = useState('')
  const data = useSWR('/api/data')
  return <Table data={data} filter={filter} onFilterChange={setFilter} />
}

// GOOD: Server Component with Client Component leaves
export default async function Page() {
  const data = await api.getData() // Server-side fetch
  return <FilterableTable data={data} /> {/* Client Component */}
}

'use client'
function FilterableTable({ data }: { data: any[] }) {
  const [filter, setFilter] = useState('')
  // Client-side filtering only
}
```

---

### Anti-Pattern 2: Fetching in Client Components Without Caching

**What goes wrong:** Using `useEffect` + `fetch` in Client Components
**Why bad:** No caching, no deduplication, refetches on every mount
**Instead:** Use React Query for client-side fetching

```tsx
// BAD
'use client'
function GuildList() {
  const [guilds, setGuilds] = useState([])
  useEffect(() => {
    fetch('/api/guilds').then(r => r.json()).then(setGuilds)
  }, [])
  return <div>{guilds.map(...)}</div>
}

// GOOD
'use client'
function GuildList() {
  const { data: guilds, isLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => clientApi.getGuilds(),
  })
  if (isLoading) return <Skeleton />
  return <div>{guilds.map(...)}</div>
}
```

---

### Anti-Pattern 3: Skipping verifySession() in Server Actions

**What goes wrong:** Assuming middleware auth is sufficient
**Why bad:** Server Actions are public endpoints, middleware doesn't protect them
**Instead:** Always call verifySession() at the start of every Server Action

```tsx
// BAD (SECURITY VULNERABILITY)
'use server'
export async function deleteGuild(guildId: string) {
  await api.deleteGuild(guildId) // No auth check!
}

// GOOD
'use server'
export async function deleteGuild(guildId: string) {
  const session = await verifySession() // CRITICAL

  // Verify user has admin access to this guild
  const guild = session.guilds.find(g => g.guildId === guildId)
  if (!guild || !guild.permissions.includes('ADMINISTRATOR')) {
    throw new Error('Unauthorized')
  }

  await api.deleteGuild(guildId)
}
```

---

### Anti-Pattern 4: Route Handlers for Every API Call

**What goes wrong:** Creating Route Handlers (`app/api/*/route.ts`) that just proxy to external API
**Why bad:** Unnecessary layer, doubles latency, no benefit over direct Server Component fetching
**Instead:** Call external API directly from Server Components

```tsx
// BAD: Unnecessary proxy
// app/api/guilds/route.ts
export async function GET() {
  const res = await fetch('https://external-api.com/guilds')
  return res
}

// app/(dashboard)/page.tsx (Server Component)
'use client'
export default function Page() {
  const { data } = useSWR('/api/guilds') // Extra hop
}

// GOOD: Direct API call
// app/(dashboard)/page.tsx (Server Component)
export default async function Page() {
  const guilds = await api.getGuilds() // Direct to external API
  return <GuildList guilds={guilds} />
}
```

**Exception:** Route Handlers ARE needed for:
- OAuth callbacks (handling redirects)
- Webhooks (receiving external requests)
- SSE streams (long-lived connections)

---

### Anti-Pattern 5: Hardcoding Tenant IDs

**What goes wrong:** Allowing guildId to be passed from client without validation
**Why bad:** Cross-tenant data leak vulnerability
**Instead:** Always validate guildId against session.guilds

```tsx
// BAD (SECURITY VULNERABILITY)
'use server'
export async function getGuildData(guildId: string) {
  // User could pass ANY guildId!
  return api.getGuild(guildId)
}

// GOOD
'use server'
export async function getGuildData(guildId: string) {
  const session = await verifySession()

  // Verify user has access to this guild
  const hasAccess = session.guilds.some(g => g.guildId === guildId)
  if (!hasAccess) {
    throw new Error('Unauthorized')
  }

  return api.getGuild(guildId)
}
```

---

### Anti-Pattern 6: Mixing Route Groups with URL Structure

**What goes wrong:** Trying to match route group names to URL paths
**Why bad:** Route groups are organizational only, don't affect URLs
**Instead:** Use route groups for layout/concern, not URL structure

```tsx
// BAD: Expecting /(dashboard) to create /dashboard URL
app/
└── (dashboard)/          # This is NOT the URL!
    └── page.tsx          # URL is "/" not "/dashboard"

// GOOD: Route groups for layout, folders for URLs
app/
├── (dashboard)/          # Layout group (sidebar + header)
│   ├── layout.tsx
│   ├── page.tsx          # URL: /
│   └── guilds/
│       └── page.tsx      # URL: /guilds
└── (auth)/               # Layout group (minimal chrome)
    └── login/
        └── page.tsx      # URL: /login
```

---

## Scalability Considerations

### At 100 Guilds (MVP)

| Concern | Approach |
|---------|----------|
| **Data fetching** | Direct API calls from Server Components |
| **Caching** | Next.js automatic fetch caching (default 'force-cache') |
| **Real-time** | React Query polling every 5s |
| **Database** | External API handles all queries |

### At 1,000 Guilds (Phase 2)

| Concern | Approach |
|---------|----------|
| **Data fetching** | Same (Server Components scale well) |
| **Caching** | Add Redis cache layer in external API |
| **Real-time** | Migrate to SSE for bot status |
| **Guild list** | Add pagination to guild list |
| **Database** | Add database read replicas in external API |

### At 10,000+ Guilds (Phase 3)

| Concern | Approach |
|---------|----------|
| **Data fetching** | Implement ISR (Incremental Static Regeneration) for rarely-changing data |
| **Caching** | Edge caching with `unstable_cache()` or Vercel Data Cache |
| **Real-time** | SSE with connection pooling, consider WebSockets |
| **Guild list** | Virtual scrolling, search/filter on server-side |
| **Database** | Partition by clientId, implement read-through caching |
| **Rate limiting** | Per-tenant rate limits at edge middleware layer |

---

## Extensibility Points

### Future: Marketing Site

**Add without affecting dashboard:**

```
app/
├── (marketing)/              # New route group
│   ├── layout.tsx            # Marketing layout (header, footer, no sidebar)
│   ├── page.tsx              # Landing page (URL: /)
│   ├── pricing/
│   │   └── page.tsx          # URL: /pricing
│   └── docs/
│       └── page.tsx          # URL: /docs
│
├── (dashboard)/              # Existing (unchanged)
│   ├── layout.tsx
│   └── page.tsx              # Move to /dashboard URL
```

**Routing strategy:**
- Marketing: `/`, `/pricing`, `/docs` (public)
- Dashboard: `/dashboard`, `/dashboard/guilds/...` (protected)

---

### Future: Billing/Subscriptions

**Add to existing structure:**

```
app/
├── (dashboard)/
│   ├── billing/              # New billing section
│   │   ├── page.tsx          # URL: /billing (subscription overview)
│   │   ├── plans/
│   │   │   └── page.tsx      # URL: /billing/plans
│   │   └── invoices/
│   │       └── page.tsx      # URL: /billing/invoices
│   └── guilds/
│       └── [guildId]/
│           └── subscription/ # New guild-level subscription page
│               └── page.tsx  # URL: /guilds/[id]/subscription
```

**API additions:**
- `GET /api/v1/subscriptions` - User's subscriptions
- `POST /api/v1/subscriptions` - Create subscription (Stripe integration)
- `GET /api/v1/guilds/:id/subscription` - Guild subscription status

**Component additions:**
- Subscription badge in guild switcher (shows tier)
- Usage progress bars (shows quota consumption)
- Upgrade CTAs (triggered by quota limits)

---

### Future: Webhooks/Integrations

**Route Handler for incoming webhooks:**

```ts
// app/api/webhooks/stripe/route.ts
import { verifyStripeSignature } from '@/lib/stripe'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')!
  const body = await request.text()

  const event = verifyStripeSignature(body, signature)

  switch (event.type) {
    case 'invoice.paid':
      // Update subscription status
      break
    case 'subscription.deleted':
      // Downgrade to free tier
      break
  }

  return new Response('OK', { status: 200 })
}
```

---

## Sources

**HIGH Confidence (Official Documentation):**
- [Next.js App Router Routing](https://nextjs.org/docs/app/building-your-application/routing) - File-system routing, layouts, dynamic segments
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching) - Server Components, fetch patterns
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication) - Session management, JWT, DAL pattern
- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) - Organizational patterns
- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config) - Dynamic rendering, revalidation
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components) - Server vs Client Component patterns
- [React Server Actions](https://react.dev/reference/react/use-server) - Server Action patterns and constraints

**Project-Specific Context:**
- PROJECT.md - Multi-tenancy model, auth requirements, tech stack decisions
- Dashboard.md - API contract, schema changes, phased roadmap

---

## Summary

**Recommended architecture:**
- **Route groups** for organizational clarity (auth, dashboard, legal, future marketing)
- **Server Components by default** with minimal Client Component scope
- **Server Actions** for all mutations (settings, exports)
- **Data Access Layer** with `verifySession()` for defense-in-depth security
- **React Query** for client-side caching and real-time features
- **Direct API calls** from Server Components (no unnecessary Route Handler proxies)

**Security model:**
- Edge middleware for optimistic checks
- DAL for authoritative auth validation
- Tenant isolation via JWT guild list validation
- Input validation via Zod schemas in Server Actions

**Build order:**
1. Auth foundation (login, session, middleware)
2. Core dashboard (guild list, details)
3. Tracking data views (accounts, posts, brands)
4. Real-time features (bot status with React Query polling)
5. Mutations (settings updates, Server Actions)
6. Polish and deploy

This architecture scales from MVP (100 guilds) to enterprise (10,000+ guilds) with clear extension points for billing, marketing, and integrations.
