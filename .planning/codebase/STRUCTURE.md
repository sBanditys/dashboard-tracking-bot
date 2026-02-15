# Codebase Structure

**Analysis Date:** 2025-02-16

## Directory Layout

```
src/
├── app/                           # Next.js 14 app router
│   ├── (auth)/                    # Auth routes group (layout: login-only)
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/               # Dashboard routes group (protected by middleware)
│   │   ├── guilds/
│   │   │   ├── page.tsx           # Guild list
│   │   │   └── [guildId]/
│   │   │       ├── page.tsx       # Guild details overview
│   │   │       ├── accounts/
│   │   │       ├── activity/
│   │   │       ├── analytics/
│   │   │       ├── brands/
│   │   │       ├── exports/
│   │   │       ├── posts/
│   │   │       └── settings/
│   │   ├── settings/
│   │   ├── layout.tsx             # Dashboard layout (sidebar, topbar)
│   │   ├── page.tsx               # Dashboard home redirect
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── api/
│   │   ├── auth/                  # OAuth and session management
│   │   │   ├── login/route.ts
│   │   │   ├── callback/route.ts
│   │   │   ├── exchange/route.ts
│   │   │   ├── session/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   └── logout/route.ts
│   │   ├── guilds/                # Guild proxy routes
│   │   │   ├── route.ts
│   │   │   └── [guildId]/
│   │   │       ├── route.ts
│   │   │       ├── accounts/
│   │   │       ├── analytics/
│   │   │       ├── brands/
│   │   │       ├── bulk/
│   │   │       ├── channels/
│   │   │       ├── exports/
│   │   │       ├── posts/
│   │   │       ├── settings/
│   │   │       ├── status/
│   │   │       ├── trash/
│   │   │       └── usage/
│   │   └── user/route.ts
│   ├── auth/                      # OAuth callback page
│   │   └── callback/page.tsx
│   ├── legal/                     # Static pages
│   │   ├── terms/page.tsx
│   │   └── privacy/page.tsx
│   ├── fonts/                     # Local font files
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Root page (/)
│   ├── providers.tsx              # Client providers (Query, Theme, Toast)
│   ├── globals.css                # Global styles
│   ├── global-error.tsx           # Global error boundary
│   └── favicon.ico
├── components/                    # Reusable React components
│   ├── analytics/                 # Charts, leaderboards, stats
│   │   ├── activity-timeline.tsx
│   │   ├── analytics-chart.tsx
│   │   ├── leaderboard.tsx
│   │   ├── weekly-submissions.tsx
│   │   └── *.tsx                  # 11 components total
│   ├── audit/
│   │   └── audit-log-table.tsx
│   ├── bulk/                      # Bulk operations
│   │   ├── selection-bar.tsx
│   │   ├── reassign-modal.tsx
│   │   └── bulk-results-toast.tsx
│   ├── export/                    # Export UI
│   │   ├── export-config-form.tsx
│   │   ├── export-history-table.tsx
│   │   └── export-progress.tsx
│   ├── filters/                   # Data filters
│   │   ├── filter-bar.tsx
│   │   ├── date-range-picker.tsx
│   │   ├── search-input.tsx
│   │   ├── platform-select.tsx
│   │   ├── status-select.tsx
│   │   ├── group-select.tsx
│   │   ├── page-size-select.tsx
│   │   └── index.ts               # Barrel export
│   ├── forms/                     # Form components
│   │   ├── guild-settings-form.tsx
│   │   ├── add-account-form.tsx
│   │   ├── add-account-modal.tsx
│   │   ├── add-brand-form.tsx
│   │   ├── add-brand-modal.tsx
│   │   └── inline-edit-field.tsx
│   ├── layout/                    # Layout UI (sidebar, navbar)
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── mobile-drawer.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── user-menu.tsx
│   ├── tracking/                  # Tracking-specific UI
│   │   ├── account-card.tsx
│   │   ├── post-card.tsx
│   │   ├── selectable-account-card.tsx
│   │   ├── selectable-post-card.tsx
│   │   ├── account-card-skeleton.tsx
│   │   ├── post-card-skeleton.tsx
│   │   └── index.ts               # Barrel export
│   ├── trash/                     # Deleted items UI
│   │   ├── trash-list.tsx
│   │   └── trash-item-card.tsx
│   ├── ui/                        # Headless UI primitives
│   │   ├── button.tsx
│   │   ├── data-table.tsx         # Pagination table
│   │   ├── confirmation-modal.tsx
│   │   ├── type-to-confirm-modal.tsx
│   │   ├── pagination.tsx
│   │   ├── skeleton.tsx
│   │   ├── combobox.tsx
│   │   └── channel-select.tsx
│   ├── bot-status.tsx             # Bot health indicator
│   ├── guild-switcher.tsx         # Guild selector dropdown
│   ├── guild-tabs.tsx             # Feature tab navigation
│   ├── empty-state.tsx            # Empty state UI
│   ├── stat-card.tsx              # Stats display card
│   ├── theme-toggle.tsx           # Dark/light mode toggle
│   ├── offline-banner.tsx         # Network status indicator
│   ├── platform-icon.tsx          # Social platform icons
│   ├── scroll-to-top.tsx
│   └── scroll-to-bottom.tsx
├── hooks/                         # Custom React hooks
│   ├── use-guilds.ts              # Guild queries and mutations
│   ├── use-tracking.ts            # Brands, accounts, posts
│   ├── use-analytics.ts           # Analytics data
│   ├── use-audit-log.ts           # Audit log queries
│   ├── use-exports.ts             # Export operations
│   ├── use-trash.ts               # Trash management
│   ├── use-bulk-operations.ts     # Bulk delete/reassign
│   ├── use-user.ts                # Current user data
│   ├── use-sse.ts                 # Server-sent events
│   ├── use-selection.ts           # Multi-select state
│   ├── use-mobile.ts              # Mobile breakpoint detection
│   ├── use-debounce.ts            # Debounce utility
│   ├── use-keyboard-shortcuts.ts  # Global hotkeys
│   ├── use-persistent-state.ts    # localStorage wrapper
│   └── use-unsaved-changes.ts     # Form state tracking
├── lib/                           # Utilities and helpers
│   ├── api-client.ts              # HTTP client for fetch
│   ├── auth.ts                    # Auth helpers
│   ├── fetch-with-retry.ts        # Retry logic with backoff
│   ├── date-utils.ts              # Date formatting
│   ├── utils.ts                   # classnames helper
│   ├── csv-download.ts            # CSV export utility
│   ├── posts-csv-export.ts        # Posts CSV formatter
│   ├── posts-json-export.ts       # Posts JSON formatter
│   ├── posts-excel-export.ts      # Posts XLSX formatter
│   └── server/
│       ├── backend-fetch.ts       # Backend SSR fetch wrapper
│       └── dashboard-session-cookies.ts  # Cookie parsing
├── types/                         # TypeScript interfaces
│   ├── guild.ts                   # Guild types
│   ├── tracking.ts                # Brands, accounts, posts
│   ├── analytics.ts               # Analytics data
│   ├── audit.ts                   # Audit log types
│   ├── bulk.ts                    # Bulk operation types
│   ├── export.ts                  # Export types
│   └── user.ts                    # User types
├── middleware.ts                  # Request middleware (route protection)
└── app.tsx                        # App root component (providers wrapper)
```

## Directory Purposes

**src/app/:**
- Purpose: Next.js 14 app router directory with all routes and pages
- Contains: Page components, API routes, layouts, error boundaries
- Key files: `layout.tsx` (root), `providers.tsx` (context setup), `middleware.ts` (protection)

**src/app/(auth):**
- Purpose: Public authentication routes group (outside dashboard layout)
- Contains: Login page, OAuth callback handling
- Key files: `(auth)/login/page.tsx`

**src/app/(dashboard):**
- Purpose: Protected dashboard routes (all require session cookie)
- Contains: Guild browser, feature pages (accounts, analytics, etc.), shared layout
- Key files: `layout.tsx` (sidebar + topbar), `page.tsx` (dashboard home)

**src/app/api/:**
- Purpose: Reverse proxy API routes from dashboard to backend
- Contains: Request handlers that forward to backend with auth headers
- Key files: Auth endpoints, guild endpoints with all sub-resources

**src/components/:**
- Purpose: Reusable React components organized by feature
- Contains: UI primitives, feature-specific components, layout shells
- Pattern: Each file = one component, often with interface/types defined in same file

**src/hooks/:**
- Purpose: Custom React hooks for data fetching and state management
- Contains: useQuery hooks, useMutation hooks, custom state logic
- Pattern: Each hook encapsulates one API endpoint or state concern

**src/lib/:**
- Purpose: Shared utilities and helpers
- Contains: HTTP clients, formatters, export functions, auth logic
- Key patterns: Fetch wrappers, type-safe API clients, data formatters

**src/lib/server/:**
- Purpose: Server-side utilities (only used in API routes)
- Contains: Backend fetch wrapper with internal secret, cookie parsing
- Key files: `backend-fetch.ts` (adds X-Internal-Secret header)

**src/types/:**
- Purpose: TypeScript type definitions organized by domain
- Contains: Interfaces for API responses, component props, state shapes
- Pattern: One domain per file (guilds.ts, tracking.ts, etc.)

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout wrapping all pages with Providers
- `src/app/page.tsx`: Redirects to `/guilds` for authenticated users
- `src/app/(auth)/login/page.tsx`: Login page with Discord OAuth button
- `src/app/(dashboard)/page.tsx`: Dashboard home showing guild list
- `src/middleware.ts`: Route protection middleware

**Configuration:**

- `package.json`: Dependencies, scripts
- `tsconfig.json`: TypeScript configuration with path alias `@/*` → `src/*`
- `next.config.mjs`: Next.js config (Discord CDN images, bundle analyzer)
- `.eslintrc.json`: ESLint rules
- `tailwind.config.ts`: Tailwind CSS with dark theme
- `postcss.config.mjs`: PostCSS for Tailwind

**Core Logic:**

**Authentication:**
- `src/app/api/auth/*`: All OAuth and session routes
- `src/lib/auth.ts`: Auth helper functions
- `src/lib/fetch-with-retry.ts`: Session refresh logic (POST `/api/auth/refresh`)

**Guild Operations:**
- `src/hooks/use-guilds.ts`: Guild queries, mutations for settings
- `src/app/api/guilds/*`: Proxy routes to backend

**Data Fetching:**
- `src/lib/fetch-with-retry.ts`: Client-side fetch with retry and token refresh
- `src/lib/server/backend-fetch.ts`: Server-side fetch with X-Internal-Secret

**Testing:**
- No test files present (no tests configured)

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `AccountCard.tsx`, `GuildSwitcher.tsx`)
- Hooks: camelCase with `use-` prefix (e.g., `use-guilds.ts`, `use-tracking.ts`)
- Utilities: kebab-case or camelCase (e.g., `fetch-with-retry.ts`, `api-client.ts`)
- Types: kebab-case (e.g., `guild.ts`, `tracking.ts`)
- Routes: Match URL structure (e.g., `[guildId]/route.ts` for dynamic segments)

**Directories:**
- Feature directories: lowercase plural (e.g., `components/analytics/`, `src/hooks/`)
- Dynamic routes: square brackets (e.g., `[guildId]/`, `[exportId]/`)
- Route groups: parentheses (e.g., `(auth)/`, `(dashboard)/`)

**Functions:**
- React components: PascalCase (e.g., `export function AccountCard()`)
- Custom hooks: camelCase with `use` prefix (e.g., `export function useGuilds()`)
- Utilities: camelCase (e.g., `export async function backendFetch()`)
- Internal helpers: camelCase with leading underscore if private (e.g., `function _calculateBackoff()`)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `const DEFAULT_MAX_RETRIES = 3`)
- State variables: camelCase (e.g., `const [isLoading, setIsLoading]`)
- DOM elements: camelCase (e.g., `const inputRef = useRef()`)

**Types:**
- Interfaces: PascalCase (e.g., `interface GuildDetails`, `interface ApiResponse<T>`)
- Type aliases: PascalCase (e.g., `type GuildsResponse`)

## Where to Add New Code

**New Feature (e.g., "User Preferences"):**

1. **Types:** `src/types/preferences.ts`
   ```typescript
   export interface UserPreference {
     id: string
     key: string
     value: string
   }
   ```

2. **API Route:** `src/app/api/preferences/route.ts`
   ```typescript
   import { backendFetch } from '@/lib/server/backend-fetch'
   export async function GET(request: NextRequest) {
     // Forward to backend
   }
   ```

3. **Hook:** `src/hooks/use-preferences.ts`
   ```typescript
   export function usePreferences() {
     return useQuery({
       queryKey: ['preferences'],
       queryFn: async () => {
         const response = await fetchWithRetry('/api/preferences')
         return response.json()
       }
     })
   }
   ```

4. **Component:** `src/components/preferences/preferences-panel.tsx`
   ```typescript
   export function PreferencesPanel() {
     const { data } = usePreferences()
     return <div>{/* UI */}</div>
   }
   ```

5. **Page:** `src/app/(dashboard)/settings/preferences/page.tsx`
   ```typescript
   export default function PreferencesPage() {
     return <PreferencesPanel />
   }
   ```

**New Component/Module:**

- Primary code: `src/components/{feature}/ComponentName.tsx`
- Related UI: `src/components/{feature}/*.tsx`
- Barrel export: `src/components/{feature}/index.ts` (if reused in multiple places)
  ```typescript
  export * from './component-one'
  export * from './component-two'
  ```

**Utilities:**

- Shared helpers: `src/lib/{utility-name}.ts`
- Server-only utilities: `src/lib/server/{utility-name}.ts`
- Export as named functions: `export function myHelper() { ... }`

**Hooks (Custom State Logic):**

- Location: `src/hooks/use-{concern}.ts`
- Pattern: Export named function starting with `use`
- Compose: Combine useQuery, useMutation, useState

**Types:**

- Domain types: `src/types/{domain}.ts`
- Component prop types: Define in component file above component function
- API response types: In `src/types/{domain}.ts`

## Special Directories

**src/app/api/:**
- Purpose: Next.js API routes (dynamic backend proxy endpoints)
- Generated: No
- Committed: Yes
- Note: All route.ts files should call `backendFetch()` to backend with proper headers

**src/.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes (created by `npm run build`)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (created by `npm install`)
- Committed: No (in .gitignore)

**src/app/fonts/:**
- Purpose: Local font files (GeistVF.woff, GeistMonoVF.woff)
- Generated: No
- Committed: Yes
- Note: Imported in `src/app/layout.tsx` for custom fonts

**src/components/ui/:**
- Purpose: Headless UI primitives (buttons, modals, tables)
- Committed: Yes
- Note: Reusable across all feature components

## Import Path Aliases

**Primary Alias:**
- `@/*` → `src/*`
- Used everywhere: `import { useGuilds } from '@/hooks/use-guilds'`

**Never use relative imports** like `../../../hooks`. Always use `@/` alias for clarity.

---

*Structure analysis: 2025-02-16*
