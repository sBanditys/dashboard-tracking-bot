---
phase: 28
slug: analytics-payouts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit` + visual verification
- **Before `/gsd:verify-work`:** Full TypeScript check must pass + all tabs render correctly
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | ANAL-01 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |
| 28-01-02 | 01 | 1 | ANAL-02 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |
| 28-01-03 | 01 | 1 | PAY-01 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |
| 28-02-01 | 02 | 1 | PAY-02 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |
| 28-02-02 | 02 | 1 | PAY-03 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |
| 28-02-03 | 02 | 1 | PAY-04 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |
| 28-02-04 | 02 | 1 | PAY-05 | manual-only | `npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework setup needed — all verification is TypeScript compilation + manual visual testing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor-paginated analytics table renders participants | ANAL-01 | UI rendering — no test framework | Navigate to campaign detail, verify table loads with pagination |
| Search filters participants by userId | ANAL-02 | UI interaction — no test framework | Type userId in search, verify results filter in real time |
| Offset-paginated payout list with paid/unpaid badges | PAY-01 | UI rendering — no test framework | Navigate to payouts tab, verify pagination and status badges |
| Single mark-paid with confirmation dialog | PAY-02 | UI interaction — no test framework | Click mark-paid, verify confirmation dialog, verify optimistic update |
| Bulk mark-paid with checkbox selection (50 cap) | PAY-03 | UI interaction — no test framework | Select multiple participants, verify bulk action, verify toast |
| Payout history audit trail | PAY-04 | UI rendering — no test framework | Navigate to history tab, verify entries with who/when/amount |
| Optimistic updates with rollback on error | PAY-05 | Error scenario — no test framework | Simulate error, verify UI rolls back to previous state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
