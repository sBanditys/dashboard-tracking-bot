---
phase: 08-polish-optimization
plan: 07
subsystem: ui-polish
tags: [edge-cases, expired-exports, zero-state, concurrent-edits, ux]
dependency_graph:
  requires: [08-04, 08-05]
  provides: [expired-export-handling, zero-guild-state, concurrent-edit-detection]
  affects: [export-history, guilds-page, guild-settings]
tech_stack:
  added: []
  patterns: [snapshot-comparison, inline-warning, disabled-state]
key_files:
  created: []
  modified:
    - src/components/export/export-history-table.tsx
    - src/app/(dashboard)/guilds/page.tsx
    - src/components/forms/guild-settings-form.tsx
decisions: []
metrics:
  duration: 3m 24s
  completed: 2026-02-08T14:45:04Z
---

# Phase 08 Plan 07: Edge Case Handling Summary

**One-liner:** Expired export badges with disabled downloads, zero-guild empty state, and concurrent edit detection for guild settings.

## What Was Built

**Expired Export Handling:**
- Export history table checks `expiresAt` field against current date
- Shows orange "Expired" badge alongside status badge for expired exports
- Disables download button/link for expired exports (pointer-events-none, opacity-50)
- Adds tooltip: "Export expired. Create a new export."
- Works in both desktop table and mobile card layouts

**Zero-Guild Empty State:**
- Guilds page detects when `data?.guilds.length === 0` after loading
- Shows centered empty state with icon (mail/server SVG), not blank page
- Primary message: "You don't have access to any servers"
- Subtext guides user: "Ask a server admin to grant you access, or make sure you have the correct permissions on Discord."
- Clean vertical/horizontal centering with muted colors

**Concurrent Edit Detection:**
- Guild settings form stores initial settings snapshot in ref on mount
- Before each channel change save, compares current query cache against snapshot
- If settings changed (logs_channel_id or updates_channel_id differ), shows yellow warning banner
- Warning message: "Settings were updated by another user. Reload to see changes or save to overwrite."
- Two action buttons: "Reload" (invalidates query, resets form) and "Save Anyway" (proceeds with save)
- Pending change stored in state until user decides
- Snapshot resets after reload or successful save

## Task Breakdown

### Task 1: Handle expired exports and zero-guild state
**Commit:** 983589f
**Duration:** ~2m

**Changes:**
- Added `isExpired()` helper to ExportHistoryTable checking expiresAt vs current date
- Desktop table: Shows "Expired" badge in status column, disables download link with tooltip
- Mobile cards: Same expired badge and disabled download state
- Guilds page: Replaced minimal empty state with centered message, icon, and helpful guidance

**Files Modified:**
- `src/components/export/export-history-table.tsx` - Expired badge and disabled download
- `src/app/(dashboard)/guilds/page.tsx` - Zero-guild centered empty state

### Task 2: Concurrent edit detection and form validation improvements
**Commit:** 3fbafdf
**Duration:** ~1m 24s

**Changes:**
- Added React Query's useQueryClient import to GuildSettingsForm
- Stored initial settings snapshot in `initialSettingsRef` on mount
- Created `checkForStaleSettings()` comparing cache state with snapshot
- Modified `handleChannelChange()` to check staleness before saving
- Added warning banner with yellow color scheme
- Implemented Reload (invalidate query) and Save Anyway (execute pending change) handlers
- Pending change stored in state until user resolves conflict

**Files Modified:**
- `src/components/forms/guild-settings-form.tsx` - Concurrent edit detection with warning banner

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**TypeScript:** `npx tsc --noEmit` passed with no errors.
**Build:** `npm run build` succeeded - all routes built successfully.

**Manual Verification (Expected Behavior):**
- Export history with expired exports shows orange badge and disabled download
- Guilds page with zero guilds shows centered empty state message
- Guild settings form detects when cache settings differ from mount snapshot
- Warning banner appears with Reload/Save Anyway options

## Self-Check

**Created files:** None (all modifications)

**Modified files:**
```bash
[ -f "src/components/export/export-history-table.tsx" ] && echo "FOUND"
[ -f "src/app/(dashboard)/guilds/page.tsx" ] && echo "FOUND"
[ -f "src/components/forms/guild-settings-form.tsx" ] && echo "FOUND"
```
All files: FOUND

**Commits:**
```bash
git log --oneline | grep -q "983589f" && echo "FOUND: 983589f (Task 1)"
git log --oneline | grep -q "3fbafdf" && echo "FOUND: 3fbafdf (Task 2)"
```
Both commits: FOUND

**Self-Check: PASSED**

## Integration Points

**Expired Exports:**
- Uses existing `ExportRecord.expiresAt` field from export types
- Integrates with export history table status badge system
- No API changes needed (field already exists)

**Zero-Guild State:**
- Uses existing guilds hook and loading states
- Shows only when data loaded AND empty (not during loading)
- No conflicts with existing error states

**Concurrent Edit Detection:**
- Uses React Query's queryClient.getQueryData() for cache access
- Integrates with existing useUpdateGuildSettings mutation hook
- Works with optimistic updates (checks cache, not just props)
- No backend changes needed (client-side staleness check)

## Testing Notes

**Expired Exports:**
- Test with export records where `expiresAt < new Date()`
- Verify badge appears for expired completed exports
- Verify download button disabled and tooltip present
- Check both desktop table and mobile card layouts

**Zero-Guild State:**
- Test with user account that has no guild access
- Verify empty state only shows after loading completes
- Verify message is centered and helpful

**Concurrent Edit Detection:**
- Test: User A loads settings page
- User B changes a channel setting
- User A attempts to change a setting
- Expected: Warning banner appears with Reload/Save Anyway
- Test: User A clicks Reload → form updates to latest
- Test: User A clicks Save Anyway → user A's change saves

## Next Phase Readiness

No blockers. Edge case handling complete. Next plan can proceed.

**Wave 3 Status:** Plan 08-07 complete. Ready for remaining Wave 3 plans (08-08, 08-09).

---

*Summary created: 2026-02-08*
*Execution time: 3m 24s*
