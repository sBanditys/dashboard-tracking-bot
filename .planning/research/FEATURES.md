# Feature Landscape

**Domain:** Campaign management UI for social media tracking SaaS dashboard
**Researched:** 2026-03-06
**Backend API:** 12 endpoints across guildCampaigns.ts, guildCampaignPayouts.ts, guildCampaignExport.ts

---

## Context: What Exists vs What Is New

**Already built (reusable infrastructure):**
- Cursor-based infinite scroll (accounts, posts, bonus rounds)
- Offset-based pagination (audit log)
- `fetchWithRetry` with CSRF injection, auth retry, 503 resilience, toast feedback
- `useSSE` hook for real-time progress (bot status, export progress)
- Export pipeline (CSV/JSON/XLSX) with async SSE progress
- `useSelection` hook for checkbox-based bulk operations
- `StatCard`, `EmptyState`, `PlatformIcon` components
- `parseApiError` + `sanitizeError` for error handling
- Optimistic mutation pattern (see `useDeleteAccount`, `useAddAccount`)
- Sonner toast notifications for mutation feedback

**What is new for v1.3 campaigns:**
- Campaign CRUD UI (list, detail, create, edit, delete)
- Campaign analytics (participant earnings table with post counts)
- Campaign payout management (mark-paid, bulk mark-paid, payout history)
- Campaign export (CSV/XLSX via existing DataExport pipeline)
- New TypeScript types for campaign domain
- New React Query hooks for 12 campaign endpoints
- New proxy routes forwarding to backend campaign API

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Campaign list with status filtering | Core navigation; users need all campaigns at a glance | Low | Existing cursor pagination pattern | Reuse `useInfiniteQuery` pattern; status filter enum: Draft, Active, Paused, SubmissionsClosed, Completed; default limit 20 |
| Campaign detail view | Users need config, totals, participant/post counts | Low | Campaign list (navigation) | Single endpoint returns campaign + brand + aggregated totals (totalEarnedCents, participantCount) |
| Campaign create form | Admins must create Draft campaigns | Med | Brands list (auto-resolved), channels list | Requires: name (1-50 chars), budgetCents (min 100), perUserCapCents (min 100), at least one platform rate; brand auto-selected from guild's first brand by backend |
| Campaign edit form | Admins must update campaign config | Med | Campaign detail, channels list | PATCH with 14 optional fields: name, budget, rates, rules, channels, payment methods, close threshold, daily submission limit; handle 409 Conflict |
| Campaign delete with status guards | Admins expect to clean up campaigns | Low | Campaign detail | Backend enforces Draft/Completed only; 409 for Active/Paused/SubmissionsClosed with clear messaging |
| Status badge display | Users need to see campaign state at a glance | Low | Campaign list + detail | Color-coded badges: Draft (gray), Active (green), Paused (yellow), SubmissionsClosed (orange), Completed (blue) |
| Participant earnings table | Core analytics; who earned what | Med | Campaign detail | Cursor-paginated; shows discordUserId, totalEarnedCents, postCount per participant; sorted by earnings DESC |
| Payout status list | Admins need paid vs unpaid visibility | Med | Campaign detail | Offset-paginated (page/pageSize, NOT cursor); shows isPaid, paidAt, paidAmountCents, paymentMethod; only participants with earnings > 0 |
| Mark single participant paid | Core payout action | Low | Payout status list | POST with discordUserId; handles 409 (already paid), 400 (zero earnings); confirm before executing |
| Bulk mark paid | Batch payout efficiency for 50+ participant campaigns | Med | Payout status list, `useSelection` hook | Max 50 per request; checkbox selection UI; shows paidCount/totalCents in success toast |
| Payout history audit trail | Accountability for payment actions | Low | Campaign detail | Offset-paginated; shows timestamp, actorId, discordUserId, amountCents, paymentMethod |
| Campaign export (CSV/XLSX) | Data portability requirement | Med | Campaign detail, existing export infrastructure | Two scopes: 'payment' (payout-focused) and 'full' (all campaign data); async via DataExport pipeline with 202 Accepted |
| Export progress with SSE | Feedback during async export | Low | Campaign export, existing `useSSE` hook | Reuse existing SSE progress pattern; poll export status endpoint; handle rate limit (429 with retryAfterSeconds) |
| Loading skeletons | Visual feedback while data loads | Low | All list/detail views | Reuse existing `RoundCardSkeleton` pattern |
| Empty states | Guidance when no campaigns exist | Low | Campaign list | "Create your first campaign" CTA using existing `EmptyState` component |
| Currency formatting | Cents displayed as human-readable dollars | Low | All monetary displays | Consistent format across earnings, rates, budget; create shared `formatCents()` utility |
| Error handling with toasts | Clear mutation failure feedback | Low | All mutations | Reuse `fetchWithRetry` + `parseApiError` + `toast` pattern; handle 400, 404, 409 specifically |

## Differentiators

Features that add polish beyond basic CRUD. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Budget utilization progress bar | Visual spend tracking more intuitive than raw cents | Low | Campaign detail | Calculate totalEarnedCents / budgetCents; color: green < 50%, yellow 50-85%, red > 85%; matches closeThreshold concept |
| Platform rate cards with icons | Visual per-platform rates with Instagram/TikTok/YouTube icons | Low | Campaign detail/edit | Reuse `PlatformIcon` component; show "per 1K views"; null = platform disabled (greyed out) |
| Campaign summary counter cards | At-a-glance metrics at top of detail view | Low | Campaign detail | Total earned, participants, posts, budget remaining; reuse `StatCard` component |
| Participant search in payouts | Quick lookup by userId in large participant lists | Low | Payout list | Backend already supports userId query param; add search input above table |
| Optimistic mutation updates | Instant UI on mark-paid without server round-trip | Med | Mark paid, bulk mark paid | Follow `useDeleteAccount` pattern: snapshot, optimistic update, rollback on error |
| Confirmation dialogs for destructive actions | Prevent accidental deletes and bulk payments | Low | Delete, bulk mark paid | Reuse Headless UI Dialog pattern from existing modals |

## Anti-Features

Features to explicitly NOT build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Status transition buttons (Activate/Pause/Complete) | Status changes trigger bot-side workflows: announcement embeds, Discord role management, scheduler changes; PATCH can set status but side effects run only in bot context | Display status as read-only badge; defer transition UI until bot webhook integration is validated |
| Campaign template management | Backend has CampaignTemplate model but no dashboard CRUD endpoints exist; UI without API is dead code | Omit entirely; wait for backend template endpoints |
| Fraud flag display | FraudFlag model exists in Prisma schema but no dashboard API exposes fraud data | Omit entirely; defer to fraud detection milestone |
| Real-time earnings via SSE | Would require new SSE endpoint; existing SSE is bot status + export progress only | Use React Query with 2min staleTime; participants don't update in real-time during admin sessions |
| Campaign image/logo upload | Campaign model has imageUrl/aiLogoUrl fields but no upload endpoint in dashboard API | Show as read-only text if present; upload managed via bot commands |
| Payment handle display | Backend explicitly sets paymentHandleEnc to null with comment "Never expose encrypted handles via API" | Show paymentMethod label only (e.g., "PayPal", "Venmo"); never display handles |
| Campaign scheduling UI (startAt/endAt) | Fields exist in schema but not exposed in dashboard create/update Zod schemas; auto-activation is bot-side logic | Omit from create/edit forms entirely |
| Campaign tags/hashtags editing | Fields exist in Campaign model but not in dashboard updateCampaignSchema | Show as read-only badges on detail view if present; editing deferred |
| Inline campaign duplication | Would need backend cloning endpoint with de-duplication logic; not in API | Defer; manual creation is sufficient |
| View anomaly threshold config | Field exists (viewAnomalyThreshold) but not in dashboard update schema | Omit from edit form |
| Per-post cap editing | perPostCapCents exists in model but not in dashboard create/update schemas | Omit from forms |
| Grammar check / AI logo toggles | grammarCheckEnabled, aiLogoEnabled exist but are bot-side features, not dashboard concerns | Omit from dashboard UI |

---

## Feature Dependencies

```
Existing infrastructure (already built):
  fetchWithRetry ---------> All campaign mutations (CSRF, retry, error handling)
  useSSE -----------------> Export progress streaming
  PlatformIcon -----------> Platform rate display (Instagram/TikTok/YouTube)
  StatCard ---------------> Campaign summary counters
  EmptyState -------------> Empty list/detail states
  useSelection -----------> Bulk mark-paid checkbox management
  Headless UI Dialog -----> Confirmation modals (delete, bulk pay)
  toast (sonner) ---------> All mutation feedback
  cursor pagination ------> Campaign list, participant analytics
  offset pagination ------> Payout list, payout history (different pattern!)

New feature dependency graph:

  Campaign types (types/campaign.ts)
    |
    v
  Campaign proxy routes (api/guilds/[guildId]/campaigns/*)
    |
    v
  Campaign hooks (hooks/use-campaigns.ts)
    |
    +---> Campaign list page --> Campaign detail page
    |                               |
    |                               +---> Participant analytics tab
    |                               |
    |                               +---> Payouts tab
    |                               |       |
    |                               |       +---> Mark paid (single)
    |                               |       +---> Bulk mark paid
    |                               |       +---> Payout history sub-tab
    |                               |
    |                               +---> Campaign edit form
    |                               |
    |                               +---> Campaign delete (with confirmation)
    |                               |
    |                               +---> Campaign export
    |                                       |
    |                                       +---> Export progress (SSE)
    |
    +---> Campaign create form
            |
            +---> Needs: brands list (existing useBrands hook)
            +---> Needs: channels list (existing useChannels or similar)
```

### Critical Dependency Notes

- **Mixed pagination types**: Campaign list and analytics use cursor (`next_cursor`/`has_more`). Payouts and history use offset (`page`/`pageSize`/`totalCount`). Hooks must support both. Do NOT try to unify them -- backend uses different patterns deliberately (cursor for large ordered sets, offset for smaller audit-oriented tables).
- **Brand auto-resolution**: Campaign create does NOT need a brand picker. Backend auto-selects guild's first brand. But if guild has no brand, backend returns 400. Frontend should pre-check or handle this error gracefully.
- **Channels list for edit form**: Campaign edit allows setting reviewChannelId, alertsChannelId, announcementChannelId. These need the existing channels list endpoint. Verify channels hook exists or create one.

---

## MVP Recommendation

### Phase 1: Campaign CRUD (list + detail + create + edit + delete)

Build order based on dependency chain:

1. **Campaign TypeScript types** -- Required by everything; derive from backend response shapes
2. **Campaign proxy routes** -- 5 routes (GET list, GET detail, POST create, PATCH update, DELETE)
3. **Campaign React Query hooks** -- useCampaigns (infinite), useCampaign (detail), create/update/delete mutations
4. **Campaign list page** -- Infinite scroll with status filter dropdown; status badges
5. **Campaign detail page** -- Summary counters, config display, navigation to sub-features
6. **Campaign create form** -- Modal or page; name + budget + rates; at least one rate required validation
7. **Campaign edit form** -- Inline or modal; 14 optional fields; optimistic locking (version field, 409 handling)
8. **Campaign delete** -- Confirmation dialog; status guard error messaging

### Phase 2: Analytics + Payouts

1. **Participant analytics tab** -- Cursor-paginated earnings table with post counts
2. **Payout status tab** -- Offset-paginated participant payment status
3. **Mark single paid** -- POST mutation with confirmation; handle 409 (already paid)
4. **Bulk mark paid** -- Checkbox selection + batch POST; max 50; show results summary
5. **Payout history tab** -- Offset-paginated audit log of mark-paid actions

### Phase 3: Export + Polish

1. **Campaign export trigger** -- Format selector (CSV/XLSX) + scope selector (payment/full)
2. **Export progress SSE** -- Reuse existing pattern; show progress bar + download link
3. **Budget utilization indicator** -- Progress bar on detail view
4. **Platform rate cards** -- Visual rate display with platform icons

### Defer to Future Milestones

- Status transition UI (Activate/Pause/Complete buttons)
- Template management
- Fraud flag display
- Campaign scheduling
- Tags/hashtags editing
- Image/logo upload

---

## API Endpoint Mapping

| Feature | Backend Endpoint | Method | Pagination | Dashboard Proxy Route |
|---------|-----------------|--------|------------|----------------------|
| Campaign list | `/:guildId/campaigns` | GET | Cursor (next_cursor) | `/api/guilds/[guildId]/campaigns` |
| Campaign detail | `/:guildId/campaigns/:campaignId` | GET | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]` |
| Campaign create | `/:guildId/campaigns` | POST | N/A | `/api/guilds/[guildId]/campaigns` |
| Campaign update | `/:guildId/campaigns/:campaignId` | PATCH | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]` |
| Campaign delete | `/:guildId/campaigns/:campaignId` | DELETE | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]` |
| Participant analytics | `/:guildId/campaigns/:campaignId/analytics` | GET | Cursor (next_cursor) | `/api/guilds/[guildId]/campaigns/[campaignId]/analytics` |
| Payout list | `/:guildId/campaigns/:campaignId/payouts` | GET | Offset (page/pageSize) | `/api/guilds/[guildId]/campaigns/[campaignId]/payouts` |
| Mark paid | `/:guildId/campaigns/:campaignId/payouts/mark-paid` | POST | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]/payouts/mark-paid` |
| Bulk mark paid | `/:guildId/campaigns/:campaignId/payouts/bulk` | POST | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]/payouts/bulk` |
| Payout history | `/:guildId/campaigns/:campaignId/payouts/history` | GET | Offset (page/pageSize) | `/api/guilds/[guildId]/campaigns/[campaignId]/payouts/history` |
| Trigger export | `/:guildId/campaigns/:campaignId/export` | POST | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]/export` |
| Export status | `/:guildId/campaigns/:campaignId/export/:exportId` | GET | N/A | `/api/guilds/[guildId]/campaigns/[campaignId]/export/[exportId]` |

---

## Complexity Notes

- **Mixed pagination**: Campaigns/analytics = cursor. Payouts/history = offset. Two distinct hook patterns needed. Do not abstract into a single generic -- the page param types are fundamentally different (`string | null` vs `number`).
- **Form validation**: Create requires 3 mandatory fields + at least 1 of 3 optional rates. Update has all 14 fields optional. Use Zod schemas on frontend matching backend exactly.
- **Optimistic locking**: Campaign has `version` field. PATCH may return 409 if version conflicts. Show "Campaign was modified, please refresh" toast with a refresh button.
- **Cent/dollar conversion**: All monetary fields are cents (integers). Create a `formatCents(cents: number): string` utility returning "$X.XX". Use everywhere: earnings, rates, budget, payout amounts.
- **Status-dependent guards**: Delete only on Draft/Completed (backend enforces, frontend should disable button + tooltip). Edit restrictions TBD -- backend `updateCampaign` service may reject certain fields on Active campaigns.
- **Proxy route count**: 12 new proxy routes. Follow existing pattern: `backendFetch` + `sanitizeError` + status-specific responses.
- **Component count estimate**: ~15 new components (list, detail, create form, edit form, analytics tab, payouts tab, history tab, status badge, rate card, budget bar, summary counters, confirmation dialogs, export panel, skeletons, empty states).

---

## Sources

- Backend code: `guildCampaigns.ts` -- 5 endpoints (list, detail, analytics, create, update, delete) with Zod schemas
- Backend code: `guildCampaignPayouts.ts` -- 4 endpoints (list, history, mark-paid, bulk) with Zod schemas
- Backend code: `guildCampaignExport.ts` -- 2 endpoints (trigger, status) via DataExport pipeline
- Prisma schema: Campaign model (lines 1417-1529) with 40+ fields, 7 related models
- Existing dashboard patterns: `use-tracking.ts` (cursor hooks), `bonus/` components (CRUD + payments), `export.ts` types
- Project requirements: `.planning/PROJECT.md` v1.3 milestone scope

---

*Feature research for: v1.3 Campaign System & Tech Debt milestone*
*Researched: 2026-03-06*
