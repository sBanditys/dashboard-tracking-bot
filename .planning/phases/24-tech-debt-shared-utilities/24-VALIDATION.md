---
phase: 24
slug: tech-debt-shared-utilities
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (no test runner) |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | DEBT-01 | type-check + manual | `npx tsc --noEmit` | N/A | ⬜ pending |
| 24-01-02 | 01 | 1 | DEBT-04 | smoke | `test ! -f src/lib/validators.ts && echo PASS` | N/A | ⬜ pending |
| 24-01-03 | 01 | 1 | DEBT-02 | manual-only | Manual: set `auth_callback_url` to `https://evil.com` in sessionStorage | N/A | ⬜ pending |
| 24-01-04 | 01 | 1 | DEBT-03 | manual-only | Visual: disconnect backend on posts page | N/A | ⬜ pending |
| 24-01-05 | 01 | 2 | DEBT-01 | type-check | `npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. TypeScript compiler serves as automated verification for all refactoring changes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Malicious callbackUrl redirects to `/` | DEBT-02 | Requires browser sessionStorage manipulation | 1. Set `auth_callback_url` to `https://evil.com` in sessionStorage 2. Navigate to `/auth/callback` 3. Verify redirect to `/` not `evil.com` |
| ConnectionIssuesBanner on posts page | DEBT-03 | Requires visual check of component rendering | 1. Open posts page 2. Stop backend 3. Verify banner appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
