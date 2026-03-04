---
phase: 23
slug: security-audit-report
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual + shell checks (documentation deliverable) |
| **Config file** | none — no test framework needed for Markdown output |
| **Quick run command** | `test -f .planning/AUDIT-REPORT.md && echo "EXISTS"` |
| **Full suite command** | `grep -c "^### A0" .planning/AUDIT-REPORT.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `test -f .planning/AUDIT-REPORT.md && echo "EXISTS"`
- **After every plan wave:** Run `grep -c "^### A0" .planning/AUDIT-REPORT.md`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | AUDIT-01 | manual + shell | `test -f .planning/AUDIT-REPORT.md && echo "EXISTS"` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | AUDIT-01 | manual + shell | `grep -c "^### A0" .planning/AUDIT-REPORT.md` | ❌ W0 | ⬜ pending |
| 23-01-03 | 01 | 1 | AUDIT-01 | manual | Review by human — CWE correctness | manual-only | ⬜ pending |
| 23-01-04 | 01 | 1 | AUDIT-01 | manual | Review by human — post-hardening state | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/AUDIT-REPORT.md` — the deliverable itself (produced by this phase's sole task)

*No test framework gaps — the deliverable is a Markdown document, not code.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Every finding has CWE field | AUDIT-01 | Requires domain knowledge to verify CWE accuracy | Review each finding row for CWE column presence and correctness |
| Report reflects post-hardening state | AUDIT-01 | Requires understanding of Phase 17-22 changes | Verify findings reference actual current code, not pre-hardening state |
| Risk scores are appropriate | AUDIT-01 | Subjective severity assessment | Review CVSS/risk scores against finding descriptions |
| Fix plans are actionable | AUDIT-01 | Qualitative assessment | Check each finding has either a fix plan or accepted-risk justification |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
