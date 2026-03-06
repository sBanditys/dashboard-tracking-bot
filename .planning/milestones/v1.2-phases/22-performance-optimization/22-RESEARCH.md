# Phase 22: Performance Optimization - Research

**Researched:** 2026-03-04
**Domain:** Next.js bundle optimization, React Query cache tuning, dynamic imports
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — user left all implementation details to Claude's discretion.

### Claude's Discretion

**staleTime normalization:**
- How to tier hooks (static vs paginated vs real-time)
- Whether to create a shared constants file or inline values
- Prior research suggests 4 tiers: static=5min, paginated=2min, real-time=1min, session=fresh
- Global default already set to 5min in providers.tsx — focus on hooks that override to unnecessarily low values

**Dynamic import targets:**
- Which components to lazy-load beyond existing analytics charts (AnalyticsChart, ActivityTimeline, MiniSparkline already dynamic)
- Bundle analysis results will drive decisions — apply dynamic imports to top cold-start contributors
- Loading skeleton patterns already established in analytics page

**Package import optimization:**
- `optimizePackageImports` scope — lucide-react and recharts are required; additional packages at Claude's discretion based on analysis
- `@next/bundle-analyzer` already wired up via `ANALYZE=true`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | `optimizePackageImports` configured in next.config for `lucide-react` and `recharts` to reduce module count and improve cold start time | `optimizePackageImports` is an experimental config in `next.config.mjs`. Both lucide-react and recharts are on the default list in Next.js 16 — explicit config still validates the requirement is satisfied. Module count verified to drop from ~1583 → ~333 for lucide-react. |
| PERF-02 | React Query `staleTime` normalized across all hooks — no `staleTime: 0` causing waterfall refetches on navigation | 23 explicit staleTime values found across 13 hook files. None set to 0, but 30s values on paginated list queries (audit-log, bonus, exports, guilds-status, alerts, sessions) are unnecessarily aggressive. Global default is 5min. Normalized tiers will eliminate background refetch churn on navigation. |
| PERF-03 | Bundle analysis run with `next experimental-analyze` to identify top cold-start contributors, with dynamic imports applied to heavy client components | `@next/bundle-analyzer` already wired. Run command is `ANALYZE=true npm run build`. Top candidates identified: `CreateRoundModal` (29KB), `ExportTab` (20KB), `LeaderboardTab` (15KB), `AuditLogTable` (14KB), `EmailConfigSection` (13KB). |
</phase_requirements>

---

## Summary

Phase 22 covers three distinct performance interventions: (1) explicit `optimizePackageImports` config for lucide-react and recharts, (2) React Query staleTime normalization to stop avoidable background refetches during navigation, and (3) bundle analysis + dynamic import application to the heaviest client components.

The most important factual discovery in this research is that **both `lucide-react` and `recharts` are already on Next.js 16's built-in default optimization list** — they are optimized automatically without adding them to `experimental.optimizePackageImports`. However, explicit config is still required to satisfy PERF-01 as written (the requirement says "configured in next.config"), and explicit config makes the optimization visible, auditable, and not dependent on undocumented defaults. The explicit config adds no harm and clearly expresses intent.

On staleTime: no hook uses `staleTime: 0` explicitly, which is good. The problem is 30-second values on list queries that change rarely (audit log, bonus rounds, export history, sessions, guild status). These cause a background refetch waterfall every time a user navigates back to a page within 30 seconds. Raising these to 2 minutes aligns with the global default and eliminates the visible refetch pattern PERF-02 targets.

For PERF-03: the bundle analyzer is already wired. The biggest unoptimized client components are `CreateRoundModal` (29KB), `ExportTab` (20KB), `LeaderboardTab` (15KB), `AuditLogTable` (14KB), and `EmailConfigSection` (13KB) — all imported statically by their parent pages.

**Primary recommendation:** Three focused edits: (1) add `experimental.optimizePackageImports` to next.config.mjs; (2) raise 30s staleTime values on non-real-time list hooks to 2min; (3) run bundle analyzer, then apply `next/dynamic` with skeleton fallbacks to the top 3-5 heaviest components.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@next/bundle-analyzer` | ^16.1.6 | Visual bundle size report via webpack/turbopack | Already installed; activated with `ANALYZE=true npm run build` |
| `next/dynamic` | built-in | Code-split client components on demand | Official Next.js lazy-loading API; established pattern in this codebase |
| `@tanstack/react-query` | ^5.90.20 | `staleTime` controls cache freshness window | Already in use; staleTime is the lever for PERF-02 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `experimental.optimizePackageImports` | Next.js built-in | Rewrites barrel imports to named imports | Packages with 100+ exports (lucide-react, recharts) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `experimental.optimizePackageImports` | Manual named imports per file | More reliable but requires touching 25+ component files; `optimizePackageImports` is the scalable fix |
| `next/dynamic` per component | Route-level `loading.tsx` segments | Route segments fit new-route structure better; dynamic imports are better for component-level splits within existing pages |

**Installation:** No new packages required. All tools are already installed.

---

## Architecture Patterns

### Recommended Project Structure
No structural changes needed. Modifications target three existing files:
```
next.config.mjs                    — add experimental.optimizePackageImports
src/app/providers.tsx              — no change (global defaults already correct)
src/hooks/use-audit-log.ts         — staleTime 30s → 2min
src/hooks/use-bonus.ts             — staleTime 30s → 2min (4 instances)
src/hooks/use-exports.ts           — staleTime 30s → 2min
src/hooks/use-guilds.ts            — staleTime 30s → 2min (line 64, 118)
src/hooks/use-alerts.ts            — staleTime 30s → 2min
src/hooks/use-sessions.ts          — staleTime 30s → 2min
src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx      — dynamic imports
src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx — dynamic imports
```

### Pattern 1: `optimizePackageImports` Config
**What:** Tells Next.js to rewrite barrel imports from packages like lucide-react so only used modules are resolved at compile time. Reduces the ~1583-module scan for lucide-react to ~333 modules during dev server cold start.

**When to use:** Any package with a barrel-export file covering hundreds of named exports.

**Example:**
```javascript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // ... existing config unchanged
}
```

**Note:** Both `lucide-react` and `recharts` are already optimized by default in Next.js 16. The explicit config satisfies PERF-01 as written and makes the setting auditable. Adding packages already on the default list is a no-op — not harmful, just declarative.

### Pattern 2: staleTime Tiering
**What:** React Query's `staleTime` is the number of milliseconds before cached data is considered stale. Stale data triggers a background refetch on component mount. If staleTime is too low, every page navigation causes a visible refetch waterfall.

**Global default in this codebase:** `staleTime: 5 * 60 * 1000` (5 minutes) in `providers.tsx`.

**The problem:** 11+ hook instances override the default to `30 * 1000` (30 seconds). For list data like audit logs, bonus rounds, and export history — which don't change in real time — 30 seconds means a navigation that happens within 30 seconds triggers an immediate background refetch visible to the user.

**Tier schema:**
| Tier | staleTime | Applies To | Hooks |
|------|-----------|-----------|-------|
| static | 5min (inherit global) | Config, user profile, channels | `use-user`, `useGuildChannels`, `useGuildUsage`, `useGuild`, `useGuilds` |
| paginated | 2min | List data that changes infrequently | `useAuditLog`, `useBonusRounds`, `useBonusRoundDetail`, `useBonusResults`, `useBonusLeaderboard`, `useExportHistory`, `useSessions`, `useAlertThresholds`, `useEmailAlerts`, `useGuildStatus*` |
| real-time | 30s - 1min | Data with dedicated SSE or refetch interval | Keep as-is for hooks with `refetchInterval` — staleTime doesn't matter when refetchInterval is set |
| fresh | Inherit global | Mutations and infinite scroll queries | Keep as-is |

**Key rule:** A hook with `refetchInterval` set (useGuildStatus, useSessions) already has an active polling mechanism — changing its staleTime is low-impact. A hook with only staleTime (useAuditLog, useBonusRounds) is where the navigation refetch problem concentrates.

**Example (before/after):**
```typescript
// Source: src/hooks/use-audit-log.ts — current state
staleTime: 30 * 1000,

// After normalization
staleTime: 2 * 60 * 1000, // 2 minutes — audit log entries don't change in real time
```

### Pattern 3: Dynamic Imports for Heavy Client Components
**What:** `next/dynamic` defers loading a component to a separate JS chunk fetched only when rendered, reducing initial bundle size.

**Established pattern in codebase:**
```typescript
// Source: src/app/(dashboard)/guilds/[guildId]/analytics/page.tsx
const AnalyticsChart = dynamic(
  () => import('@/components/analytics/analytics-chart').then((mod) => mod.AnalyticsChart),
  { ssr: false, loading: () => <AnalyticsChartSkeleton /> }
)
```

**Target components for dynamic import (confirmed by file size):**

| Component | File Size | Current Import | Parent Page |
|-----------|-----------|----------------|-------------|
| `CreateRoundModal` | 29KB | Static | bonus/page.tsx |
| `ExportTab` | 20KB | Static | (export page) |
| `LeaderboardTab` | 15KB | Static | bonus/page.tsx |
| `AuditLogTable` | 14KB | Static | audit page |
| `EmailConfigSection` | 13KB | Static | manage/alerts/page.tsx |

**Priority:** Run `ANALYZE=true npm run build` first to confirm which are largest in the actual bundle (file size != chunk weight after tree-shaking). Apply dynamic imports to confirmed top contributors.

**Example for CreateRoundModal (modal — ideal lazy-load candidate):**
```typescript
// Source: Next.js lazy-loading docs pattern, adapted to codebase conventions
import dynamic from 'next/dynamic'
import { RoundCardSkeleton } from '@/components/bonus/round-card-skeleton'

const CreateRoundModal = dynamic(
  () => import('@/components/bonus/create-round-modal').then((mod) => mod.CreateRoundModal),
  { ssr: false, loading: () => null } // Modal: null is correct — it's only shown when open
)
```

**Skeleton loading for tab components:**
```typescript
// For tab content that renders immediately on page load, use a skeleton
const LeaderboardTab = dynamic(
  () => import('@/components/bonus/leaderboard-tab').then((mod) => mod.LeaderboardTab),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-surface rounded-sm" /> }
)
```

### Anti-Patterns to Avoid
- **Setting `staleTime: Infinity` on paginated data:** Prevents users ever seeing fresh data after mutations if `invalidateQueries` isn't called everywhere. Use 2-5 minutes, not Infinity.
- **Dynamic-importing small components:** Adds network round-trip overhead for components < 5KB. Only apply to confirmed large chunks from bundle analysis.
- **`ssr: false` in Server Components:** Next.js 16 throws a build-time error. The existing pattern of declaring `dynamic()` calls in files with `'use client'` is correct — maintain this.
- **Adding `experimental.optimizePackageImports` to packages not on barrel export pattern:** Only helps for packages that have one large barrel file re-exporting everything.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Barrel import optimization | Custom babel transform | `experimental.optimizePackageImports` | Built into Next.js, zero maintenance |
| Code splitting | Manual webpack entry points | `next/dynamic` | Automatic chunk naming, Suspense integration, React 19 compatible |
| Bundle visualization | Custom stats parser | `@next/bundle-analyzer` | Already installed; produces interactive treemap |
| staleTime management | Custom cache invalidation logic | React Query's built-in staleTime + gcTime | Any manual cache management fights React Query's state machine |

**Key insight:** All three PERF requirements have first-class Next.js/React Query solutions. Zero custom infrastructure needed.

---

## Common Pitfalls

### Pitfall 1: Assuming `optimizePackageImports` is a new addition
**What goes wrong:** Planner adds `experimental.optimizePackageImports` to next.config.mjs not realizing it may already be present or that the packages are already on the default list.
**Why it happens:** Both `lucide-react` and `recharts` are in Next.js 16's built-in default optimization list. The current `next.config.mjs` does not have `experimental.optimizePackageImports` configured explicitly.
**How to avoid:** The explicit addition is still correct and required to satisfy PERF-01. Simply add the `experimental` block with both packages. Confirm it is not already present before editing (it is not — verified by reading next.config.mjs).
**Warning signs:** Config file already has an `experimental` block for other settings — need to merge, not replace.

### Pitfall 2: Changing staleTime on hooks that have `refetchInterval`
**What goes wrong:** Developer sees `staleTime: 30 * 1000` alongside `refetchInterval: 60 * 1000` and "fixes" it by raising staleTime, then is confused when behavior doesn't change.
**Why it happens:** When `refetchInterval` is set, React Query polls on a timer regardless of staleTime. staleTime only controls whether a mount triggers an immediate refetch.
**How to avoid:** For hooks with `refetchInterval` (useGuildStatus, useSessions), staleTime changes are low-impact. Focus the staleTime fix on hooks without `refetchInterval`.
**Warning signs:** A hook comment says "auto-refresh every X seconds" — it has refetchInterval set.

### Pitfall 3: Dynamic importing components that render immediately on mount
**What goes wrong:** A tab that's shown by default gets a dynamic import, causing a layout shift or flash as the skeleton replaces nothing then the component loads.
**Why it happens:** `next/dynamic` with `ssr: false` defers the component to client-side only. If the component is above the fold and renders on first paint, users see a skeleton instead of content.
**How to avoid:** Apply dynamic imports to: (a) modals that are only shown on user interaction, (b) below-the-fold content, (c) non-default tabs. Default-visible tabs need a proper skeleton fallback.
**Warning signs:** Component is in the default render path without a user gesture.

### Pitfall 4: Bundle analyzer reporting file size vs gzip size
**What goes wrong:** Developer uses file sizes to prioritize dynamic imports but bundle analyzer shows gzip is 60-70% smaller.
**Why it happens:** The analyzer treemap shows both stat size and gzip size. A 20KB file may be 7KB gzip — not worth the dynamic import overhead.
**How to avoid:** Use the gzip column in the bundle analyzer report. Prioritize components with >10KB gzip.
**Warning signs:** Deciding which components to split based on `wc -c` file sizes rather than actual analyzer output.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### 1. `optimizePackageImports` in next.config.mjs
```javascript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
// Merges with existing withBundleAnalyzer wrapper in next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: { /* ... existing ... */ },
  async headers() { /* ... existing ... */ },
}

export default withBundleAnalyzer(nextConfig)
```

### 2. staleTime normalization constant (if shared file approach)
```typescript
// Source: React Query staleTime semantics + codebase convention
// Option A: Shared constants (recommended for DRY)
// src/lib/query-constants.ts
export const STALE_TIME = {
  /** Static config, user profile, channels — rarely changes */
  STATIC: 5 * 60 * 1000,        // 5 minutes (same as global default)
  /** List data that doesn't update in real time */
  PAGINATED: 2 * 60 * 1000,     // 2 minutes
  /** Activity data that updates frequently */
  REAL_TIME: 60 * 1000,          // 1 minute
} as const

// Option B: Inline values (simpler, no new file)
staleTime: 2 * 60 * 1000, // 2 minutes — paginated list, rarely changes mid-session
```

### 3. Running bundle analyzer
```bash
# Source: @next/bundle-analyzer README + next.config.mjs ANALYZE=true wiring
ANALYZE=true npm run build
# Opens three tabs: client.html, server.html, edge.html
# Check client.html for largest JS chunks
```

### 4. Dynamic import for modal (null loading)
```typescript
// Source: codebase pattern (analytics/page.tsx) + Next.js lazy-loading docs
// Modals are hidden until user action — null loading is correct, no skeleton needed
const CreateRoundModal = dynamic(
  () => import('@/components/bonus/create-round-modal').then((mod) => mod.CreateRoundModal),
  { ssr: false, loading: () => null }
)
```

### 5. Dynamic import for tab content (skeleton loading)
```typescript
// Source: codebase pattern (analytics/page.tsx skeleton convention)
const LeaderboardTab = dynamic(
  () => import('@/components/bonus/leaderboard-tab').then((mod) => mod.LeaderboardTab),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-surface rounded-sm" />
        ))}
      </div>
    ),
  }
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual named imports per file | `optimizePackageImports` in config | Next.js 13.5 (2023) | 28% faster builds, 10% faster dev server start for lucide-react routes |
| Tree-shaking by webpack | Turbopack default + barrel rewrite | Next.js 16 (Oct 2025) | Turbopack is now the default bundler; both approaches supported |
| `staleTime: 0` (React Query default) | Explicit `staleTime` per query tier | React Query v5 best practice | Prevents "every mount = refetch" pattern |
| Eager-load all components | `next/dynamic` code splitting | Next.js 9+ | Reduces initial JS parse time for rarely-used components |

**Deprecated/outdated:**
- `next/legacy/image`: Not relevant here, but deprecated in Next.js 16.
- `middleware.ts`: Renamed to `proxy.ts` in Next.js 16. This project uses `middleware.ts` — migration is separate from this phase.
- The `experimental.optimizePackageImports` flag is still marked "experimental and subject to change, not recommended for production" in the docs — however, both lucide-react and recharts are on the permanent default list, meaning the underlying optimization is stable even if the config key is labeled experimental.

---

## Open Questions

1. **Does `ANALYZE=true npm run build` work with Turbopack?**
   - What we know: Next.js 16 defaults to Turbopack. `@next/bundle-analyzer` wraps the webpack config.
   - What's unclear: Whether `ANALYZE=true` triggers a webpack build or silently does nothing with Turbopack active.
   - Recommendation: Run `ANALYZE=true npm run build --webpack` if the standard command produces no report. The project's `next.config.mjs` uses the webpack-based bundle analyzer wrapper.

2. **Which `staleTime: 30s` hooks have a meaningful navigation impact?**
   - What we know: The hooks with `staleTime: 30 * 1000` and NO `refetchInterval` are the ones that trigger avoidable background refetches on navigation.
   - What's unclear: Exact UX impact without profiling. The list: `useAuditLog`, `useBonusRounds`, `useBonusRoundDetail`, `useBonusResults`, `useBonusLeaderboard`, `useExportHistory`, `useAlertThresholds`.
   - Recommendation: Raise all of these to 2 minutes. Hooks with refetchInterval (useGuildStatus, useSessions) already auto-refresh — staleTime change there is optional.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (e2e) — no unit test framework detected |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:e2e` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | `optimizePackageImports` present in next.config | static-inspection | `grep -r "optimizePackageImports" next.config.mjs` | ❌ Wave 0 |
| PERF-01 | Dev server module count for lucide-react reduced | manual-smoke | Run dev server; observe Next.js compile output module count | manual-only |
| PERF-02 | No staleTime < 60s on non-real-time list hooks | static-inspection | `grep -rn "staleTime" src/hooks/ \| grep "30 \* 1000"` (should return 0) | ❌ Wave 0 |
| PERF-03 | Bundle report artifact exists | file-exists | `ls -la .next/analyze/` (created by ANALYZE=true build) | ❌ Wave 0 |
| PERF-03 | Dynamic imports applied to top contributors | static-inspection | `grep -rn "next/dynamic" src/` | ❌ Wave 0 |

**Note:** No unit test framework (Jest/Vitest) is present. PERF requirements are structural and config-level — they are best validated by static inspection and smoke tests rather than automated unit tests.

### Sampling Rate
- **Per task commit:** `grep -rn "staleTime: 30" src/hooks/` (should shrink toward 0)
- **Per wave merge:** `npm run build` (should succeed without errors)
- **Phase gate:** `ANALYZE=true npm run build --webpack` produces analyzer report; grep confirms optimizePackageImports config; grep confirms no 30s staleTime on list hooks

### Wave 0 Gaps
- [ ] No unit test infrastructure present — PERF checks are all static inspection; no test files needed
- [ ] Bundle report directory `.next/analyze/` — created at run time by `ANALYZE=true npm run build`

*(All PERF validations are static-inspection or build-time; no new test files are required)*

---

## Sources

### Primary (HIGH confidence)
- [Next.js optimizePackageImports docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) — verified full default package list; confirmed lucide-react and recharts are already defaults in v16.1.6
- [Next.js lazy-loading docs](https://nextjs.org/docs/app/guides/lazy-loading) — confirmed `next/dynamic` API patterns; `ssr: false` restriction in Server Components
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) — confirmed Turbopack is now the default bundler; package version v16.1.6
- Codebase direct read — `next.config.mjs`, `src/app/providers.tsx`, all 13 hook files, `package.json`

### Secondary (MEDIUM confidence)
- [Vercel blog: How we optimized package imports](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) — 1583→333 module count benchmark for lucide-react; 28% faster builds claim
- React Query v5 staleTime semantics — confirmed that `staleTime: 0` (default) means "stale immediately on mount"; raising to 2min prevents background refetch waterfall on navigation

### Tertiary (LOW confidence)
- The bundle analyzer compatibility with Turbopack (webpack-based plugin) — unverified for Next.js 16 Turbopack default; flagged in Open Questions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed; APIs confirmed in official docs
- Architecture: HIGH — patterns copied directly from existing codebase (analytics/page.tsx) and official Next.js docs
- Pitfalls: HIGH for config/staleTime items; MEDIUM for dynamic import sizing (depends on actual bundle analyzer output)

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (stable APIs; Next.js experimental config could change but the packages are on the default list so core optimization is stable)
