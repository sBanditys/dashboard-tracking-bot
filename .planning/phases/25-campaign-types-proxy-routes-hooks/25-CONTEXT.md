# Phase 25: Campaign Types, Proxy Routes & Hooks - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete data layer so campaign UI phases (26-29) can consume ready-made hooks without touching API plumbing. Delivers: TypeScript types for all campaign response shapes, 12 proxy routes forwarding to backend campaign REST API, React Query hooks (6 read + 6 mutation) with a hierarchical query key factory. No UI components — this is pure infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Hook file organization
- Single `src/hooks/use-campaigns.ts` with all hooks + `campaignKeys` factory
- Matches existing `use-bonus.ts` pattern (co-located cache logic)
- Estimated ~500-600 lines

### Query key factory
- Hierarchical pattern with `all(guildId)` for broad invalidation
- Keys nest under `['guild', guildId, 'campaigns', ...]` prefix
- `campaignKeys.all(guildId)` invalidates everything; `campaignKeys.detail(guildId, id)` invalidates one campaign + sub-resources
- No cross-contamination with bonus or tracking caches

### Pagination patterns
- **Cursor-based hooks** (campaign list, analytics): `useInfiniteQuery` with `getNextPageParam` — matches accounts/posts pattern
- **Offset-based hooks** (payouts, payout history): `useQuery` with page number as param — component manages page state
- Do not unify cursor and offset — backend uses them deliberately for different data shapes

### Mutation hooks
- All 12 hooks built in Phase 25 (6 read + 6 mutation) — complete data layer
- **useMarkPaid**: Optimistic updates with snapshot/rollback (follows `useUpdatePayment` pattern from bonus)
- **useBulkMarkPaid**: Invalidates payouts cache on success
- **useUpdateCampaign**: Throws typed `ConflictError` on 409 with server data — consuming component (Phase 27) decides how to display
- **useDeleteCampaign**: No client-side status guard — backend enforces Draft/Completed only, hook throws on 409. Phase 27 UI disables button
- **useCreateCampaign**: Invalidates campaign list on success
- **useTriggerExport**: Returns exportId, no polling — separate hook

### Export hooks
- Two separate hooks: `useTriggerExport` (POST mutation) + `useCampaignExportStatus` (GET query with polling)
- SSE progress tracking handled at UI layer in Phase 29 via existing `useSSE` hook
- Status hook uses `refetchInterval` gated on `enabled: !!exportId`

### Search/filter parameters
- Hooks accept userId as optional parameter — component handles debouncing
- Matches tracking hooks pattern where filters are passed in, not debounced internally

### Type organization
- Single `src/types/campaign.ts` with all campaign types (entities, responses, requests, enums)
- Field naming: snake_case matching backend JSON wire format (no camelCase transform layer) — consistent with bonus.ts, tracking.ts
- Field scope: dashboard-relevant fields only — skip bot-only fields (aiLogoUrl, grammarCheckEnabled, viewAnomalyThreshold, perPostCapCents, startAt, endAt, imageUrl, tags, paymentHandleEnc)
- Request types: Zod schemas (`createCampaignSchema`, `updateCampaignSchema`) with `z.infer<>` for TypeScript types — provides runtime validation for Phase 27 forms

### Proxy route structure
- 10 route files for 12 endpoints (multi-method files where GET+POST or GET+PATCH+DELETE share a route)
- Nested under `src/app/api/guilds/[guildId]/campaigns/`
- Action-oriented error verbs: 'load campaigns', 'create campaign', 'delete campaign', 'mark payment', 'process payments', 'start export', 'check export status', etc.
- Standard pattern: `backendFetch` + `sanitizeError` + `internalError`

### Claude's Discretion
- Exact field list for Campaign vs CampaignDetail types (detail may include more fields than list item)
- Zod schema constraint values (min/max) — derive from backend schemas
- Whether to add `placeholderData: keepPreviousData` for offset-paginated hooks
- Toast messages in mutation onSuccess/onError handlers
- ConflictError class location (in campaign.ts types or in use-campaigns.ts)

</decisions>

<specifics>
## Specific Ideas

- ConflictError class for 409 handling: `new ConflictError('Campaign was modified by someone else', data.campaign)` — Phase 27 uses `instanceof ConflictError` to show toast with refresh action
- `centsToDisplay` from `src/lib/format.ts` (Phase 24) is ready for monetary display — no new utility needed
- Export status hook polls every 3s when exportId is present

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchWithRetry` (`src/lib/fetch-with-retry.ts`): CSRF injection, auth retry, 503 resilience, rate limit handling — used by all hooks
- `backendFetch` (`src/lib/server/backend-fetch.ts`): SSR backend fetch with auth forwarding — used by all proxy routes
- `sanitizeError` + `internalError` (`src/lib/server/error-sanitizer.ts`): Error sanitization — used by all proxy routes
- `centsToDisplay` (`src/lib/format.ts`): Currency formatting — ready for campaign monetary fields
- `bonusKeys` pattern (`src/hooks/use-bonus.ts`): Query key factory template
- `useAccountsInfinite` pattern (`src/hooks/use-tracking.ts`): `useInfiniteQuery` cursor pagination template

### Established Patterns
- Proxy routes: Extract guildId from params, get auth_token from cookies, forward via backendFetch with Authorization header, sanitize errors
- Hooks: `staleTime: 2 * 60 * 1000` for all queries, `enabled: !!guildId` conditional, `retry: 2` for cursor hooks
- Mutations: `useMutation` with `onMutate` (optimistic), `onError` (rollback + toast), `onSettled` (invalidate)
- Types: snake_case fields, response wrappers with `has_more`/`next_cursor` or `totalCount`/`page`/`pageSize`

### Integration Points
- Route directory: `src/app/api/guilds/[guildId]/campaigns/` (new, nested under existing guilds routes)
- Types directory: `src/types/campaign.ts` (new file alongside bonus.ts, tracking.ts, guild.ts)
- Hooks directory: `src/hooks/use-campaigns.ts` (new file alongside use-bonus.ts, use-tracking.ts)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-campaign-types-proxy-routes-hooks*
*Context gathered: 2026-03-09*
