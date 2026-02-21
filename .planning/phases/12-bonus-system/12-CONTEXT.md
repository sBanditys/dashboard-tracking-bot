# Phase 12: Bonus System - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard UI for viewing bonus rounds, managing payments, and displaying results/leaderboard. The backend API is fully built with 7 endpoints (create round, list rounds, get round detail, update payment, bulk payment, results with near-miss, leaderboard). This phase builds the Next.js dashboard pages that consume these endpoints.

</domain>

<decisions>
## Implementation Decisions

### Round Listing
- Chronological card layout, newest first
- Each card shows mini target list inline: week dates, bonus amount, target count with achieved/missed icons per group
- Filter tabs at top: All / Evaluated / Pending
- "Load more" button for pagination (not infinite scroll)
- Unevaluated rounds: "Pending" badge with muted/faded card style; evaluated rounds show green/red achievement summary
- Clicking a card expands it inline (not a separate page) with full details
- Targets shown as flat list (not grouped by brand) with brand shown as label on each row
- Expanded card has separate sections: "Targets", "Payments", and "Results" (as tabs)
- Friendly empty state with illustration/icon + "No bonus rounds yet" + prominent "Create Round" button

### Round Creation
- Form layout: Claude's discretion (sheet/drawer or full page based on complexity)
- Week picker defaults to current week with option to select past weeks
- Past week selection shows a warning confirmation dialog: "This week has ended. The round will be evaluated immediately. Continue?"
- Week picker disables weeks that already have bonus rounds
- Account group selection: full checklist with "Select all" toggle
- Target views: bulk default input for all groups + individual override per group
- Bonus amount: dollar input ($50.00) — frontend converts to cents for API
- Currency display: $ (USD) throughout
- Account group labels in checklist: Claude's discretion on whether to show brand prefix
- Review summary step before final creation (shows week, amount, and selected targets)
- Confirmation dialog for retroactive rounds in addition to summary step

### Payment Management
- Individual payments: inline toggle switch for paid/unpaid (no confirmation dialog for single toggle)
- Reversing payment (toggling to unpaid): warning toast with undo option for a few seconds
- Optimistic UI updates: toggle flips immediately, reverts if API fails
- Bulk actions: "Mark All Paid" / "Mark All Unpaid" buttons above payment list
- Dynamic bulk buttons: show only relevant button based on current payment states
- Bulk actions always require confirmation dialog showing count + total dollar amount
- Each payment row shows: group name, amount in dollars, paid/unpaid toggle, paid-by user + date
- Notes field always visible per payment row with character counter (42/500)
- Notes auto-save on blur
- Running total progress bar at top of payments section showing paid vs total amount
- Payment list sortable by group name, paid status, and amount
- Non-admin users see payments section read-only (toggles disabled)
- Unevaluated rounds show explanation: "Payments will be available after this round is evaluated"

### Results & Near-Miss Display
- Accessed via "Results" tab in expanded round card (not separate page)
- Summary stat cards at top: "X Achieved", "Y Missed", "Z Near-Miss", "$X Total Bonus"
- Each target shows a progress bar (actual vs target views) with color fill based on achievement
- Near-miss highlighting: Claude's discretion on prominence (inline highlight vs dedicated section)

### Leaderboard
- Accessed via "Leaderboard" tab on main bonus page (alongside "Rounds" tab)
- Primary ranking switchable between hit rate % and total bonus earned
- Time range: preset buttons for 4 weeks, 8 weeks, 12 weeks, All time
- Top 3 get podium treatment with gold/silver/bronze medal icons showing group name, hit rate, and bonus amount
- Rest shown in ranked table below podium
- Paid vs unpaid bonus columns: Claude's discretion
- Friendly empty state: "No bonus data yet — create and evaluate rounds to see rankings"

### Claude's Discretion
- Creation form layout (sheet/drawer vs full page)
- Account group label format in checklist (brand prefix or not)
- Near-miss visual treatment (inline badge vs dedicated section)
- Leaderboard paid/unpaid column split
- Loading skeleton designs
- Exact spacing, typography, and color palette
- Error state handling throughout
- Animation and transition details

</decisions>

<specifics>
## Specific Ideas

- Main bonus page has two top-level tabs: "Rounds" and "Leaderboard"
- Expanded round cards have inner tabs: "Targets", "Payments", "Results"
- Progress bars for results visualization — actual views vs target views with color coding
- Podium with medal icons for top 3 leaderboard entries (gold/silver/bronze)
- Payment management feels instant via optimistic updates
- Auto-saving notes with visual character counter
- Warning toast with undo for payment reversals

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-bonus-system*
*Context gathered: 2026-02-21*
