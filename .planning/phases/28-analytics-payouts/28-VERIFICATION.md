---
phase: 28-analytics-payouts
verified: 2026-03-10T16:00:00Z
status: human_needed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Open a campaign with participants, switch between Analytics / Payouts / History tabs"
    expected: "Each tab renders its own content with no placeholder text remaining; tab switching is instant"
    why_human: "Tab rendering and visual correctness cannot be verified from static analysis"
  - test: "As non-admin, visit campaign detail page"
    expected: "Payouts tab shows no checkboxes, no 'Mark Paid' buttons, and no bulk action bar"
    why_human: "Admin gating on UI elements requires live session verification"
  - test: "Type a userId into the search box and wait 300ms"
    expected: "Analytics, Payouts, and History results filter to that userId; clearing the input restores all results"
    why_human: "Debounce timing and live filter behavior require browser interaction"
  - test: "As admin, click 'Mark Paid' on an unpaid participant row"
    expected: "ConfirmationModal opens with custom description showing userId and dollar amount; button reads 'Mark Paid' (purple, not red); loading shows 'Processing...'; row optimistically updates to Paid badge before server response"
    why_human: "Optimistic update timing and modal appearance need live verification"
  - test: "As admin, select 3 unpaid participants via checkboxes then click bulk 'Mark Paid'"
    expected: "ConfirmationModal shows '3 participants'; all selected rows update; selection set clears on success; toast shows paidCount and total amount"
    why_human: "Bulk confirmation flow and toast message need live verification"
  - test: "PAY-05 scope: verify bulk mark-paid behavior on error"
    expected: "On network failure, bulk operation shows error toast; payouts list refreshes to actual server state (invalidation-based, not optimistic rollback)"
    why_human: "PAY-05 requires optimistic updates with rollback — single mark-paid fully satisfies this; bulk mark-paid intentionally uses invalidation instead of optimistic update. Human should confirm this scoping is acceptable or flag as gap"
---

# Phase 28: Analytics, Payouts, and History Verification Report

**Phase Goal:** Add Analytics, Payouts, and History tabs to campaign detail page
**Verified:** 2026-03-10T16:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | User can see three tabs (Analytics, Payouts, History) on campaign detail page between budget bar and platform rates | VERIFIED | `page.tsx:85-89` defines `tabs` array with all three; rendered between `BudgetProgressBar` (line 158) and `PlatformRateCards` (line 224) |
| 2 | User can view cursor-paginated participant earnings table showing userId, post count, and earned amount | VERIFIED | `analytics-tab.tsx` calls `useCampaignAnalytics` with infinite query, flattens pages, renders DataTable with User ID / Posts / Earned columns |
| 3 | User can type a userId in the search input and analytics results filter accordingly | VERIFIED | `page.tsx:38-44` debounces search 300ms; `debouncedSearch || undefined` passed to all three tab components |
| 4 | ConfirmationModal accepts custom description prop for non-delete use cases | VERIFIED | `confirmation-modal.tsx:14,44` — `description?: React.ReactNode` prop; renders via `description ?? (hardcoded delete text)` — backward compatible |
| 5 | User can view offset-paginated payout list showing earned amount and paid/unpaid status | VERIFIED | `payouts-tab.tsx:22-349` — full custom table with Earned column and Paid/Unpaid badge; offset pagination controls below table |
| 6 | Admin can mark a single participant as paid via confirmation dialog with optimistic UI update | VERIFIED | `payouts-tab.tsx:276-313` — ConfirmationModal wired to `markPaid.mutate`; `use-campaigns.ts:371-396` implements full optimistic update with snapshot rollback |
| 7 | Admin can select multiple unpaid participants (up to 50) and bulk mark them as paid | VERIFIED | `payouts-tab.tsx:19,66-96,317-345` — `MAX_SELECTION=50`, `toggleAll` caps at 50, bulk ConfirmationModal wired to `bulkMarkPaid.mutate` |
| 8 | User can view offset-paginated payout history showing who marked whom as paid, when, and amount | VERIFIED | `history-tab.tsx:44-100` — `usePayoutHistory` with DataTable columns Date/Admin/Participant/Amount; offset pagination |
| 9 | Non-admin users do not see checkboxes or mark-paid buttons | VERIFIED | `payouts-tab.tsx:172,203,227` — all checkbox and action elements gated on `isAdmin` prop; `page.tsx:209` passes `isAdmin` computed from guild permissions |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/components/campaigns/analytics-tab.tsx` | Participant earnings table with infinite scroll | VERIFIED | 76 lines (exceeds min_lines: 40); real implementation with `useInView` sentinel, DataTable, NoResults |
| `src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx` | Tab bar, search input, conditional tab rendering | VERIFIED | Contains `activeTab` state (line 37), tab bar (lines 179-194), search input (lines 165-176), conditional renders for all three tabs (lines 198-220) |
| `src/components/campaigns/payouts-tab.tsx` | Payout list with checkbox selection, status filter, mark-paid and bulk actions | VERIFIED | 349 lines (exceeds min_lines: 100); full implementation with all required features |
| `src/components/campaigns/history-tab.tsx` | Payout history audit trail table with offset pagination | VERIFIED | 100 lines (exceeds min_lines: 40); DataTable with 4 columns, offset pagination |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `analytics-tab.tsx` | `use-campaigns.ts` | `useCampaignAnalytics` | WIRED | Line 5 import; line 41 call with `guildId, campaignId, userId` |
| `page.tsx` | `analytics-tab.tsx` | conditional render on `activeTab === 'analytics'` | WIRED | Line 18 import; line 198 conditional render |
| `payouts-tab.tsx` | `use-campaigns.ts` | `useCampaignPayouts`, `useMarkPaid`, `useBulkMarkPaid` | WIRED | Line 4 imports; lines 28-30 calls |
| `history-tab.tsx` | `use-campaigns.ts` | `usePayoutHistory` | WIRED | Line 4 import; line 47 call |
| `page.tsx` | `payouts-tab.tsx` | conditional render on `activeTab === 'payouts'` | WIRED | Line 19 import; line 205 conditional render |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ANAL-01 | 28-01 | Cursor-paginated participant earnings table with post counts | SATISFIED | `analytics-tab.tsx` infinite scroll via `useInfiniteQuery`; DataTable with User ID, Posts, Earned columns |
| ANAL-02 | 28-01 | Search participants by userId in analytics/payouts view | SATISFIED | Debounced search in `page.tsx` passes `debouncedSearch` as `userId` to AnalyticsTab, PayoutsTab, HistoryTab |
| PAY-01 | 28-02 | Offset-paginated payout status list (paid/unpaid per participant) | SATISFIED | `payouts-tab.tsx` with Paid/Unpaid badges; offset pagination; `useCampaignPayouts` with page param |
| PAY-02 | 28-02 | Admin can mark single participant as paid with confirmation dialog | SATISFIED | ConfirmationModal in `payouts-tab.tsx:276-313` with custom description, purple button, "Mark Paid" label |
| PAY-03 | 28-02 | Admin can bulk mark participants as paid (max 50, checkbox selection) | SATISFIED | `MAX_SELECTION=50`; checkbox toggleAll; bulk ConfirmationModal; `useBulkMarkPaid` sends `{ userIds }` |
| PAY-04 | 28-02 | Offset-paginated payout history audit trail | SATISFIED | `history-tab.tsx` with `usePayoutHistory`; DataTable 4 columns; offset pagination |
| PAY-05 | 28-02 | Payout mutations use optimistic updates with rollback on error | PARTIAL — see note | `useMarkPaid` (single): full optimistic update + snapshot rollback on error. `useBulkMarkPaid` (bulk): cancels in-flight queries only; no optimistic state update and no rollback — uses invalidation on success instead. Plan explicitly documented this as intentional. Needs human validation of acceptable scope. |

**Note on PAY-05:** The plan's truth for PAY-05 coverage specifically said "optimistic UI update" only for the single mark-paid case. `useBulkMarkPaid` comments in the code state "No optimistic updates (too complex for bulk)." The requirement text says "Payout mutations use optimistic updates with rollback on error" without specifying per-mutation. This is a deliberate scoping decision documented in the plan. A human should confirm this is acceptable.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found in phase-modified files |

Scanned: `analytics-tab.tsx`, `payouts-tab.tsx`, `history-tab.tsx`, `confirmation-modal.tsx`, `page.tsx` (tab sections), `use-campaigns.ts` (new hooks). No TODO/FIXME/placeholder/return null stubs found in any phase-modified file.

### Additional Verifications

**TypeScript:** `npx tsc --noEmit` passes with zero errors — all 4 modified files compile cleanly.

**Commit integrity:** All commits documented in SUMMARYs exist in git history:
- `051ff71` — feat: analytics query key fix, ConfirmationModal extension, AnalyticsTab creation
- `082b371` — feat: tab bar, search input, AnalyticsTab wiring
- `47bd091` — feat: PayoutsTab, HistoryTab, bulk endpoint field name fix
- `3193922` — feat: PayoutsTab and HistoryTab wired into campaign detail page

**Bulk endpoint fix verified:** `use-campaigns.ts:434` sends `JSON.stringify({ userIds: discordUserIds })` — the `discordUserIds` local variable is correctly remapped to `userIds` key as required by backend `bulkMarkPaidBodySchema`.

**Query key fix verified:** `campaignKeys.analytics` at line 42-43 accepts `userId?: string` parameter; `useCampaignAnalytics` passes it at line 123 — cache correctly keyed by userId so searches invalidate independently.

**Backward compatibility verified:** `ConfirmationModal` delete usage in `page.tsx:244-260` passes no `description`, `confirmClassName`, or `loadingLabel` — falls back to hardcoded "Are you sure you want to delete..." text and red button.

### Human Verification Required

#### 1. Tab switching and visual layout

**Test:** Open any campaign detail page; observe tab bar position and switch between tabs
**Expected:** Analytics, Payouts, History tabs appear between the budget progress bar and platform rates section; switching renders correct content with no placeholder text
**Why human:** Visual placement and absence of stubs cannot be confirmed from static analysis

#### 2. Non-admin view

**Test:** Visit campaign detail page as a non-admin user
**Expected:** Payouts tab table has no checkbox column, no "Mark Paid" row buttons, and no bulk action bar above the table
**Why human:** Admin permission gating requires a live session with a non-admin account

#### 3. Search debounce behavior

**Test:** Type a partial userId, wait 300ms, observe each tab
**Expected:** All three tabs filter by that userId; clearing the input restores unfiltered results; no premature API calls during typing
**Why human:** Timing and network behavior require browser DevTools observation

#### 4. Single mark-paid optimistic update

**Test:** As admin, click "Mark Paid" on an unpaid row; confirm in modal; observe row before server responds
**Expected:** Row immediately shows "Paid" badge (optimistic); modal closes; on error, row reverts to "Unpaid"
**Why human:** Optimistic update timing and error rollback require controlled network conditions

#### 5. Bulk mark-paid confirmation and toast

**Test:** As admin, select multiple unpaid participants via checkboxes; click bulk "Mark Paid"
**Expected:** Modal description shows correct count ("N participants"); on confirm, toast displays paidCount and total; selection clears; table refreshes
**Why human:** Toast message content and selection clearing require live interaction

#### 6. PAY-05 scope acceptance

**Test:** Review whether bulk mark-paid's lack of optimistic update is acceptable for the project
**Expected:** Project owner confirms that optimistic updates for bulk operations were intentionally descoped (plan comment: "No optimistic updates — too complex for bulk") and that invalidation-on-success is sufficient
**Why human:** This is a product/architectural decision, not a code defect — static analysis cannot determine acceptability

### Gaps Summary

No structural gaps detected. All 9 observable truths are verified by code evidence. All artifacts exist at substantive size with real implementations. All key links are wired. TypeScript compiles cleanly.

The only open item is PAY-05 partial coverage (bulk mark-paid lacks optimistic update) which was an intentional, documented design decision — not an oversight. Human confirmation of that scoping decision is recommended before marking PAY-05 fully satisfied.

---

_Verified: 2026-03-10T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
