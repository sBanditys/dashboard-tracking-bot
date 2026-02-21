---
phase: 12-bonus-system
plan: 03
subsystem: bonus-creation-ui
tags: [typescript, react-day-picker, headlessui, bonus, creation-form, week-picker]
dependency_graph:
  requires:
    - src/types/bonus.ts (from 12-01)
    - src/hooks/use-bonus.ts (from 12-01)
    - src/hooks/use-tracking.ts (useBrands for groups)
  provides:
    - src/components/bonus/week-picker.tsx
    - src/components/bonus/create-round-modal.tsx
  affects:
    - src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx (Create Round button wires to CreateRoundModal)
tech_stack:
  added: []
  patterns:
    - div-based popover with useRef click-outside (matching date-range-picker.tsx pattern)
    - DayPicker v9 custom modifiers for week-level selection (no mode="range", use onDayClick)
    - useBrands() + brands[].groups[] flatten for account group list
    - Math.round(parseFloat(amount) * 100) dollar-to-cents conversion at submission
    - window.confirm() for retroactive round extra confirmation
    - useCallback + useEffect for form reset on modal open
key_files:
  created:
    - src/components/bonus/week-picker.tsx
    - src/components/bonus/create-round-modal.tsx
  modified: []
decisions:
  - "Week start: Sunday (weekStartsOn:0) confirmed from 12-01 — no override needed in date-fns calls"
  - "Groups fetched from useBrands() flattening brands[].groups[] — no dedicated groups endpoint exists; brand_label shown as secondary label in checklist"
  - "Retroactive confirmation via window.confirm() (not nested Dialog) — simpler and sufficient for this UX"
  - "Per-group target override tracked via overriddenGroups Set — non-overridden targets follow bulk default on change"
metrics:
  duration: "3m 37s"
  completed: "2026-02-21"
  tasks: 2
  files: 2
---

# Phase 12 Plan 03: Bonus Round Creation Form Summary

Multi-step bonus round creation wizard with week picker, group checklist with bulk/override targets, and retroactive round detection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WeekPicker component with disabled weeks and retroactive detection | 0ec947f | src/components/bonus/week-picker.tsx |
| 2 | CreateRoundModal multi-step creation form | a1d3e9e | src/components/bonus/create-round-modal.tsx |

## What Was Built

### src/components/bonus/week-picker.tsx

A week-level calendar picker in a div-based popover (matching the existing `date-range-picker.tsx` pattern — `useRef` + click-outside `useEffect`, not headlessui Popover).

Key behaviors:
- **Week start: Sunday** (`weekStartsOn: 0`) — confirmed from 12-01, matches backend `weekBoundary.ts`
- **Disabled future weeks**: `{ after: endOfWeek(new Date(), { weekStartsOn: 0 }) }` — current week is selectable, next week and beyond are disabled
- **Disabled existing rounds**: maps `existingWeekStarts` strings to DateRange objects covering the full week
- **Hover highlighting**: `onDayMouseEnter` computes the week range to show before click
- **Week selection**: `onDayClick` calculates `startOfWeek`/`endOfWeek`, calls `onSelect` and `onRetroactiveDetected`
- **Retroactive detection**: `isBefore(weekEnd, new Date())` — if week end is in the past, fires `onRetroactiveDetected(true)`
- **Display**: button shows "MMM d - MMM d, yyyy" or "Select a week" placeholder; chevron rotates when open
- **DayPicker**: `showWeekNumber`, custom `classNames` for dark theme (surface/border/accent-purple), no `mode` prop (custom selection via modifiers)

### src/components/bonus/create-round-modal.tsx

4-step headlessui Dialog (`max-w-2xl`) with step progress indicator.

**Step 1: Week Selection**
- Renders `<WeekPicker>` with passed `existingWeekStarts`
- On retroactive selection: amber warning banner with AlertTriangleIcon
- Next button disabled until week selected

**Step 2: Account Group Selection**
- Fetches groups via `useBrands(guildId)` — flattens `brands[].groups[]` with brand label as secondary text
- "Select All / Deselect All" toggle button
- Scrollable checklist (max-h-72) with per-row checkbox + group label + brand label
- Selected count displayed below list
- Next button disabled if no groups selected

**Step 3: Target Views & Bonus Amount**
- Dollar input with `$` prefix span, `type="number"`, `step="0.01"`, `min="0.01"`
- Validation: positive number required, error message on invalid
- Bulk default target views: updating changes all non-overridden group targets
- Per-group override table: shows "custom" amber badge on overridden rows + Reset button to return to default
- `overriddenGroups: Set<string>` tracks which groups were manually edited
- Review button disabled if amount invalid or any target is 0/empty

**Step 4: Review Summary**
- Retroactive amber warning banner (if applicable)
- Summary card: week range, bonus amount (via `centsToDisplay`), group count
- Group targets list with custom badges and view counts
- On "Create Round": if retroactive → `window.confirm()` extra confirmation
- Converts `$amount` to cents: `Math.round(parseFloat(amount) * 100)`
- Calls `useCreateBonusRound(guildId).mutateAsync(request)`
- Loading spinner during mutation; `resetForm()` + `onClose()` on success

**Form reset:** `useCallback` + `useEffect` on `open` prop resets all state to defaults.

## Key Discoveries

**No dedicated groups endpoint.** Groups must be fetched from `useBrands()` which returns `BrandsResponse.brands[].groups[]`. Each `AccountGroup` has `id`, `label`, `slug`, `discord_channel_id`, and `account_count`. The modal flattens all groups across all brands and displays `brand_label` as secondary context.

**DayPicker week selection uses `onDayClick` not `mode="range"`.** The v9 API with custom modifiers requires manual week range calculation in `onDayClick`. The `mode` prop should not be set — it conflicts with custom modifier-based selection.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one clarification:

**Source of groups data:** Plan said "check how existing hooks fetch groups or fetch from `/api/guilds/${guildId}/groups`". No groups endpoint exists; `useBrands()` is the correct source. Groups are embedded in brand data. Used `useBrands()` + flatten pattern — aligns with how the threshold-create-modal receives groups (passed from parent that also fetches from brands).

## Self-Check

### Files Created

- FOUND: src/components/bonus/week-picker.tsx
- FOUND: src/components/bonus/create-round-modal.tsx

### Commits

- FOUND: 0ec947f (feat(12-03): add WeekPicker component with disabled weeks and retroactive detection)
- FOUND: a1d3e9e (feat(12-03): add CreateRoundModal multi-step creation form)

### TypeScript

- No new type errors in either file
- Pre-existing errors unchanged: validator.ts (unrelated .next/dev types) and rounds-tab import in bonus/page.tsx (plan 02 incomplete — out of scope)

## Self-Check: PASSED
