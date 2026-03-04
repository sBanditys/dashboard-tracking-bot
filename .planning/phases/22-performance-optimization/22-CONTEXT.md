# Phase 22: Performance Optimization - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize dashboard cold start time and reduce redundant API requests during navigation. No new user-facing features — performance improvements only. Covers: package import optimization (lucide-react, recharts), React Query staleTime normalization, and bundle analysis with dynamic imports for heavy components.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User indicated requirements PERF-01, PERF-02, PERF-03 are clear enough for Claude to handle all implementation details. The following areas are at Claude's discretion:

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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to follow bundle analysis data and prior research recommendations.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@next/bundle-analyzer` already configured in next.config.ts — run with `ANALYZE=true`
- Dynamic import pattern established: `dynamic(() => import(...).then(mod => mod.Component), { ssr: false, loading: () => <Skeleton /> })`
- QueryClient global defaults in `src/app/providers.tsx`: staleTime=5min, gcTime=10min, retry=1

### Established Patterns
- 13 hook files in `src/hooks/` with mixed staleTime values (30s to 5min)
- Most hooks explicitly set staleTime — some may be unnecessarily aggressive
- lucide-react imported in 25+ component files (barrel imports)
- recharts used in analytics components (already behind dynamic imports)

### Integration Points
- `next.config.ts` — add `optimizePackageImports` to experimental config
- `src/hooks/*` — normalize staleTime values per data volatility tier
- Heavy client components — candidates for `next/dynamic` lazy loading

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-performance-optimization*
*Context gathered: 2026-03-04*
