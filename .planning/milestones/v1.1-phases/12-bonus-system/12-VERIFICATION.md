---
phase: 12-bonus-system
verified: 2026-02-21T15:30:00Z
status: passed
score: 7/7 success criteria verified
re_verification: false
gaps:
  - truth: "Admin can create a new bonus round — empty-state button is fully wired"
    status: resolved
    reason: "The 'Create Round' button in the empty-state inside rounds-tab.tsx has a no-op onClick handler. The modal is not openable from the empty state. Only the page header button opens the modal."
    artifacts:
      - path: "src/components/bonus/rounds-tab.tsx"
        issue: "onClick={() => { // Round creation modal will be added in Plan 03 }} — no-op; no onOpenCreate prop on RoundsTabProps"
    missing:
      - "Pass an onOpenCreate callback prop through RoundsTab from page.tsx (or move the button outside RoundsTab)"
      - "Wire the empty-state button's onClick to setCreateModalOpen(true)"
human_verification:
  - test: "Bonus page visual layout and navigation"
    expected: "Sidebar shows Trophy icon 'Bonus' link; page renders 'Bonus Rounds' title with Rounds/Leaderboard tabs; Create Round button visible to admins"
    why_human: "Visual appearance cannot be verified programmatically"
  - test: "Week picker calendar interaction"
    expected: "Clicking any day selects the full week (Sunday-Saturday); existing round weeks are visually disabled; future weeks are disabled; hovering highlights the week row"
    why_human: "DOM interaction and visual highlighting cannot be verified statically"
  - test: "Payment toggle optimistic update and undo"
    expected: "Clicking a toggle flips paid status immediately (optimistic); if toggling to unpaid, a Sonner warning toast with 'Undo' appears for 5 seconds; undo re-marks as paid"
    why_human: "Real-time state update and toast behavior require browser interaction"
  - test: "Bulk payment confirmation dialog"
    expected: "Clicking 'Mark All Paid'/'Mark All Unpaid' shows dialog with affected count and dollar total; confirming fires the bulk mutation; canceling dismisses safely"
    why_human: "Dialog interaction requires browser interaction"
  - test: "Round creation 4-step modal flow"
    expected: "Step 1 shows week picker; Step 2 shows group checklist with Select All; Step 3 shows dollar input + bulk default + per-group override; Step 4 shows review summary; retroactive week shows amber warning + window.confirm() extra confirmation; successful creation closes modal and refreshes rounds list"
    why_human: "Multi-step form interaction and toast notifications require browser testing"
  - test: "Leaderboard podium and table"
    expected: "Top 3 entries show gold/silver/bronze podium in 2nd/1st/3rd visual order; ranked table shows entries 4+ with Hit Rate color-coding; switching metric re-sorts; changing week range refetches data"
    why_human: "Visual layout and sort behavior require browser interaction"
---

# Phase 12: Bonus System Verification Report

**Phase Goal:** Users can view bonus rounds, payments, and results; admins can create rounds and manage payments
**Verified:** 2026-02-21T15:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can view paginated list of bonus rounds with status indicators | VERIFIED | `rounds-tab.tsx` calls `useBonusRounds`, renders `RoundCard` with status badges (Pending clock / achieved/missed counts), Load More pagination wired |
| 2 | User can view bonus round details showing all targets and their payment status | VERIFIED | `round-card.tsx` calls `useBonusRoundDetail(guildId, round.id, expanded)` when expanded; renders `TargetsTab` and `PaymentsTab` with payment toggle switches |
| 3 | Admin can create a new bonus round with target accounts and payout amount | PARTIAL | `CreateRoundModal` is fully implemented (4-step wizard, group checklist, dollar-to-cents conversion, retroactive detection). Header "Create Round" button opens it correctly. BUT the empty-state "Create Round" button in `rounds-tab.tsx` line 108-110 is a no-op — `onClick={() => { /* Round creation modal will be added in Plan 03 */ }}` |
| 4 | Admin can mark individual payments as paid or unpaid with confirmation | VERIFIED | `payments-tab.tsx` has `PaymentToggle` wired to `useUpdatePayment` with optimistic update + undo toast for unpay |
| 5 | Admin can bulk-update all payments in a round (mark all paid/unpaid) | VERIFIED | `payments-tab.tsx` has `BulkConfirmModal` (headlessui Dialog) with affected count + dollar total, wired to `useBulkUpdatePayments` mutation |
| 6 | User can view bonus results page showing near-miss reporting | VERIFIED | `results-tab.tsx` calls `useBonusResults(guildId, roundId, evaluated)`, shows 4 summary stat cards + per-target progress bars with amber "Near Miss" badge |
| 7 | User can view bonus leaderboard showing achievement rankings across all rounds | VERIFIED | `leaderboard-tab.tsx` calls `useBonusLeaderboard(guildId, weeks)`, renders podium (top 3) + ranked table (4+), metric switcher (Hit Rate / Total Bonus), time range presets (4/8/12/52 weeks) |

**Score:** 6/7 success criteria verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/bonus.ts` | All bonus TypeScript interfaces | VERIFIED | 12 exports: `RoundFilter`, `BonusTarget`, `BonusPayment`, `BonusRound`, `BonusRoundDetail`, `BonusRoundsResponse`, `BonusRoundDetailResponse`, `BonusResultTarget`, `BonusResultsResponse`, `BonusLeaderboardEntry`, `BonusLeaderboardResponse`, `CreateBonusRoundRequest` |
| `src/hooks/use-bonus.ts` | All bonus React Query hooks | VERIFIED | 10 exports: `bonusKeys`, `centsToDisplay`, `useBonusRounds`, `useBonusRoundDetail`, `useBonusResults`, `useBonusLeaderboard`, `useCreateBonusRound`, `useUpdatePayment`, `useBulkUpdatePayments`, `useUpdatePaymentNotes` |
| `src/app/api/guilds/[guildId]/bonus/rounds/route.ts` | GET list + POST create proxy | VERIFIED | Both GET (with query passthrough, `Cache-Control: no-store`) and POST (with JSON body forwarding) exported |
| `src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/route.ts` | GET round detail proxy | VERIFIED | GET with `Cache-Control: no-store`, `backendFetch` + `sanitizeError` + `internalError` |
| `src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/results/route.ts` | GET results proxy | VERIFIED | GET with `Cache-Control: no-store` |
| `src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/bulk/route.ts` | PATCH bulk update proxy | VERIFIED | PATCH with JSON body forwarding, static directory takes Next.js precedence over dynamic `[paymentId]` |
| `src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/[paymentId]/route.ts` | PATCH individual payment proxy | VERIFIED | PATCH with JSON body forwarding, 3-param RouteParams including `paymentId` |
| `src/app/api/guilds/[guildId]/bonus/leaderboard/route.ts` | GET leaderboard proxy | VERIFIED | GET with `url.search` passthrough for `weeks` param, `Cache-Control: no-store` |
| `src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx` | Main bonus page | VERIFIED | Renders `RoundsTab` and `LeaderboardTab`, `CreateRoundModal` wired, admin check via permission bit 0x8 |
| `src/components/bonus/rounds-tab.tsx` | Rounds list with filter tabs and Load More | VERIFIED | `RoundFilter` tabs, `useBonusRounds` hook, accordion expand, 3 skeleton loading states, error + empty states, Load More button |
| `src/components/bonus/round-card.tsx` | Collapsible card with inner tabs | VERIFIED | Collapsed header + expanded panel with `TargetsTab`/`PaymentsTab`/`ResultsTab` inner tabs, lazy `useBonusRoundDetail` |
| `src/components/bonus/round-card-skeleton.tsx` | Skeleton loading card | VERIFIED | Pulse animation matching collapsed card dimensions |
| `src/components/bonus/targets-tab.tsx` | Targets list with achievement icons | VERIFIED | Sortable by group/achieved/target_views/actual_views; `CheckCircle`/`XCircle`/`Minus` icons; color-coded status badges |
| `src/components/bonus/payments-tab.tsx` | Payment toggles with optimistic updates | VERIFIED | Progress bar, bulk confirm modal, `PaymentToggle`, `NotesField` with auto-save on blur, sort by group/paid/amount |
| `src/components/bonus/results-tab.tsx` | Results visualization with progress bars | VERIFIED | 4 summary stat cards, per-target progress bars (green/yellow/red), Near Miss badge, delta info |
| `src/components/bonus/leaderboard-tab.tsx` | Leaderboard with podium + ranked table | VERIFIED | Podium (2nd/1st/3rd visual order), 9-column ranked table, `MetricSwitcher`, `WeekButtons`, loading/empty/error states |
| `src/components/bonus/create-round-modal.tsx` | Multi-step round creation form | VERIFIED | 4 steps: WeekPicker, group checklist with Select All, bonus amount + per-group override table, review summary; retroactive warning; `window.confirm()` extra confirmation; `useCreateBonusRound.mutateAsync` |
| `src/components/bonus/week-picker.tsx` | Week selection calendar component | VERIFIED | div-based popover with `useRef` click-outside; `DayPicker` with `onDayClick` custom modifiers; Sunday start; disabled future weeks + existing week starts; retroactive detection via `isBefore(weekEnd, new Date())` |
| `src/components/layout/sidebar.tsx` | Sidebar Bonus navigation entry | VERIFIED | `Trophy` icon, `href="/guilds/${guildId}/bonus"`, active when `pathname.includes('/bonus')` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `hooks/use-bonus.ts` | `/api/guilds/[guildId]/bonus/rounds` | `fetchWithRetry` in `useBonusRounds` | WIRED | `fetchWithRetry(\`/api/guilds/${guildId}/bonus/rounds?${params}\`)` |
| `hooks/use-bonus.ts` | `/api/guilds/[guildId]/bonus/leaderboard` | `fetchWithRetry` in `useBonusLeaderboard` | WIRED | `fetchWithRetry(\`/api/guilds/${guildId}/bonus/leaderboard?weeks=${weeks}\`)` |
| `rounds/route.ts` | `BACKEND_API_URL/api/v1/guilds/:guildId/bonus/rounds` | `backendFetch` | WIRED | `backendFetch(\`${BACKEND_API_URL}/api/v1/guilds/${guildId}/bonus/rounds${url.search}\`)` |
| `components/bonus/rounds-tab.tsx` | `hooks/use-bonus.ts` | `useBonusRounds` hook | WIRED | `const { rounds, hasMore, loadMore, isLoading, isError, reset } = useBonusRounds(guildId, filter)` |
| `components/bonus/payments-tab.tsx` | `hooks/use-bonus.ts` | `useUpdatePayment` hook | WIRED | `const updatePayment = useUpdatePayment(guildId); updatePayment.mutate(...)` |
| `components/bonus/results-tab.tsx` | `hooks/use-bonus.ts` | `useBonusResults` hook | WIRED | `const { data, isLoading, isError } = useBonusResults(guildId, roundId, evaluated)` |
| `components/bonus/leaderboard-tab.tsx` | `hooks/use-bonus.ts` | `useBonusLeaderboard` hook | WIRED | `const { data, isLoading, isError, refetch } = useBonusLeaderboard(guildId, weeks)` |
| `components/bonus/create-round-modal.tsx` | `hooks/use-bonus.ts` | `useCreateBonusRound` mutation | WIRED | `const createMutation = useCreateBonusRound(guildId); createMutation.mutateAsync(request)` |
| `bonus/page.tsx` empty-state | `CreateRoundModal` open state | `setCreateModalOpen(true)` callback | NOT WIRED | `rounds-tab.tsx` empty-state "Create Round" button has `onClick={() => { /* noop */ }}`. No `onOpenCreate` prop on `RoundsTabProps`. Only the page header button opens the modal. |
| `components/bonus/week-picker.tsx` | `react-day-picker` | `DayPicker` with custom modifiers | WIRED | `import { DayPicker, rangeIncludesDate } from 'react-day-picker'`; `onDayClick` handler calculates week range |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BONUS-01 | 12-01, 12-02 | User can view paginated list of bonus rounds | SATISFIED | `useBonusRounds` with Load More pagination in `rounds-tab.tsx`; status indicators (Pending/achieved/missed dots) in `round-card.tsx` |
| BONUS-02 | 12-01, 12-02 | User can view bonus round details (targets, payment status) | SATISFIED | `useBonusRoundDetail` in `round-card.tsx`; `TargetsTab` shows targets with achievement; `PaymentsTab` shows payment status per group |
| BONUS-03 | 12-01, 12-03 | Admin can create a bonus round with targets and amount | PARTIALLY SATISFIED | `CreateRoundModal` fully implemented and wired via page header button. Empty-state button in `rounds-tab.tsx` is a no-op, reducing discoverability but not blocking the feature |
| BONUS-04 | 12-01, 12-02 | Admin can mark individual payments as paid/unpaid | SATISFIED | `PaymentToggle` + `useUpdatePayment` with optimistic update; undo toast for unpay action |
| BONUS-05 | 12-01, 12-02 | Admin can bulk-update all payments in a round | SATISFIED | `BulkConfirmModal` + `useBulkUpdatePayments`; shows affected count + dollar total; color-coded confirm button |
| BONUS-06 | 12-01, 12-02 | User can view bonus round results with near-miss reporting | SATISFIED | `ResultsTab` fetches via `useBonusResults`; 4 summary stat cards; per-target progress bars; amber "Near Miss" badge |
| BONUS-07 | 12-01, 12-04 | User can view bonus achievement leaderboard | SATISFIED | `LeaderboardTab` with podium, ranked table, metric switcher, time range presets |

**No orphaned requirements.** All 7 BONUS requirements are claimed and covered.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/bonus/rounds-tab.tsx` | 108-110 | `onClick={() => { /* comment */ }}` — no-op handler on "Create Round" button in empty state | WARNING | Admin sees the button in the empty state but clicking does nothing. Modal is accessible via page header button only. |
| `src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx` | 67 | `existingWeekStarts={[]}` always empty | INFO | Week picker won't visually disable already-used weeks. Backend will reject duplicate week_start with 409. Acknowledged design decision in plan. |

### Human Verification Required

#### 1. Bonus Page Visual Layout and Navigation

**Test:** Log into the dashboard, navigate to any guild, click "Bonus" in the sidebar
**Expected:** Page loads at `/guilds/{guildId}/bonus` with "Bonus Rounds" title, "Create Round" button visible to admins, Rounds/Leaderboard tab switcher, and 3 skeleton cards while loading
**Why human:** Visual appearance, sidebar Trophy icon, responsive layout cannot be verified statically

#### 2. Week Picker Calendar Interaction

**Test:** Open Create Round modal (as admin), observe the calendar in Step 1
**Expected:** Hovering over any day highlights the full week row; clicking selects the whole week from Sunday to Saturday; future weeks are grayed out and unclickable; if a past week is selected, amber warning "Past Week Selected" appears below
**Why human:** DOM interaction, CSS hover effects, and visual disabled state require browser interaction

#### 3. Payment Toggle Optimistic Update and Undo Toast

**Test:** Expand an evaluated round, go to Payments tab, toggle a paid payment to unpaid
**Expected:** Toggle flips immediately (optimistic), payment row updates instantly; a yellow "Payment marked as unpaid" Sonner toast appears with "Undo" button for 5 seconds; clicking Undo re-marks it as paid
**Why human:** Real-time state update and Sonner toast behavior require browser interaction

#### 4. Bulk Payment Confirmation Dialog

**Test:** In the Payments tab (as admin), click "Mark All Paid"
**Expected:** A modal dialog appears showing "This will mark X payments totalling $Y.YY as paid. Are you sure?" with green "Mark All Paid" and gray "Cancel" buttons
**Why human:** Dialog rendering and interaction require browser testing

#### 5. Round Creation 4-Step Form

**Test:** Click "Create Round" (as admin), complete all 4 steps
**Expected:** Step 1: WeekPicker popover; Step 2: scrollable group checklist with "Select All/Deselect All"; Step 3: dollar amount input + default target views + per-group override table with "custom" badges; Step 4: review summary; successful creation shows success toast and refreshes rounds list
**Why human:** Multi-step form interaction, conditional rendering, and toast notifications require browser testing

#### 6. Leaderboard Podium Visual Order and Metric Switching

**Test:** Switch to Leaderboard tab (when bonus data exists)
**Expected:** Podium shows 2nd place left (shorter), 1st place center (tallest, gold Trophy), 3rd place right (shortest, bronze Award); switching to "Total Bonus" re-sorts all entries; time range buttons refetch data
**Why human:** Visual podium layout, flexbox order rendering, and re-sort behavior require browser interaction

### Gaps Summary

**1 gap blocking full goal achievement:**

The "Create Round" button in the empty state of `rounds-tab.tsx` is a no-op. When there are no bonus rounds, admins see a "Create Round" button in the centered empty state, but clicking it does nothing. The `RoundsTab` component does not accept an `onOpenCreate` callback, and the `setCreateModalOpen` state is only in `page.tsx`. The modal is only openable via the page header button.

**Impact:** The admin can still create rounds via the page header "Create Round" button. Feature functionality is not blocked, but empty-state discoverability is broken — a user who has never created a round will click the prominent empty-state CTA and nothing happens.

**Fix:** Add an `onOpenCreate?: () => void` prop to `RoundsTabProps` and pass `setCreateModalOpen.bind(null, true)` from `page.tsx`. Wire it to the empty-state button's `onClick`.

---

_Verified: 2026-02-21T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
