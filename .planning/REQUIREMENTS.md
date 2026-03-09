# Requirements: Tracking Dashboard

**Defined:** 2026-03-08
**Core Value:** Server admins can access their tracking data and bot status through a reliable web interface -- independent of bot uptime.

## v1.3 Requirements

Requirements for v1.3 Campaign System & Tech Debt. Each maps to roadmap phases.

### Campaign CRUD

- [ ] **CAMP-01**: User can view paginated campaign list with cursor-based infinite scroll
- [ ] **CAMP-02**: User can filter campaigns by status (Draft/Active/Paused/SubmissionsClosed/Completed)
- [ ] **CAMP-03**: User can view campaign detail with summary counters (earned, participants, posts, budget remaining)
- [ ] **CAMP-04**: User can see color-coded status badges on list and detail views
- [ ] **CAMP-05**: Admin can create a campaign with name, budget, per-user cap, and platform rates
- [ ] **CAMP-06**: Admin can edit campaign configuration (14 optional fields with 409 conflict handling)
- [ ] **CAMP-07**: Admin can delete campaign (Draft/Completed only, with confirmation dialog)
- [ ] **CAMP-08**: User can see platform rate cards with icons on campaign detail
- [ ] **CAMP-09**: User can see budget utilization progress bar on campaign detail

### Campaign Analytics

- [ ] **ANAL-01**: User can view cursor-paginated participant earnings table with post counts
- [ ] **ANAL-02**: User can search participants by userId in the analytics/payouts view

### Campaign Payouts

- [ ] **PAY-01**: User can view offset-paginated payout status list (paid/unpaid per participant)
- [ ] **PAY-02**: Admin can mark a single participant as paid with confirmation dialog
- [ ] **PAY-03**: Admin can bulk mark participants as paid (max 50, checkbox selection)
- [ ] **PAY-04**: User can view offset-paginated payout history audit trail
- [ ] **PAY-05**: Payout mutations use optimistic updates with rollback on error

### Campaign Export

- [ ] **EXP-01**: Admin can trigger campaign export (CSV/XLSX) with scope selection (payment/full)
- [ ] **EXP-02**: User can see export progress via SSE with download link on completion

### Tech Debt

- [x] **DEBT-01**: Old error envelope support removed from fetch-with-retry.ts and error-sanitizer.ts
- [x] **DEBT-02**: callbackUrl open redirect fixed with same-origin validation in callback/page.tsx
- [x] **DEBT-03**: ConnectionIssuesBanner wired to posts page
- [x] **DEBT-04**: validators.ts dead code removed

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Campaign Status Lifecycle

- **STAT-01**: Admin can transition campaign status (Draft->Active, Active->Paused, etc.)
- **STAT-02**: Status transition buttons reflect valid transitions per state machine

### Campaign Templates

- **TMPL-01**: Admin can create campaign from template
- **TMPL-02**: Admin can save campaign as template

### Fraud Detection

- **FRAUD-01**: User can view fraud flags on campaign participants

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Status transition UI (Activate/Pause/Complete) | Backend `updateCampaignSchema` does not include `status`; needs dedicated endpoint |
| Campaign template management | Backend has no template CRUD endpoints for dashboard |
| Fraud flag display | No dashboard API exposes fraud data |
| Real-time earnings via SSE | No dedicated SSE stream; React Query with 2min staleTime sufficient |
| Campaign image/logo upload | No upload endpoint; managed via bot commands |
| Payment handle display | Backend explicitly nullifies encrypted handles for security |
| Campaign scheduling UI (startAt/endAt) | Fields not in dashboard Zod schemas; auto-activation is bot-side |
| Tags/hashtags editing | Fields not in dashboard update schema |
| Campaign duplication | Needs backend cloning endpoint |
| View anomaly threshold config | Not in dashboard update schema |
| Per-post cap editing | Not in dashboard create/update schemas |
| Grammar check / AI logo toggles | Bot-side features, not dashboard concerns |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAMP-01 | Phase 26 | Pending |
| CAMP-02 | Phase 26 | Pending |
| CAMP-03 | Phase 26 | Pending |
| CAMP-04 | Phase 26 | Pending |
| CAMP-05 | Phase 27 | Pending |
| CAMP-06 | Phase 27 | Pending |
| CAMP-07 | Phase 27 | Pending |
| CAMP-08 | Phase 26 | Pending |
| CAMP-09 | Phase 26 | Pending |
| ANAL-01 | Phase 28 | Pending |
| ANAL-02 | Phase 28 | Pending |
| PAY-01 | Phase 28 | Pending |
| PAY-02 | Phase 28 | Pending |
| PAY-03 | Phase 28 | Pending |
| PAY-04 | Phase 28 | Pending |
| PAY-05 | Phase 28 | Pending |
| EXP-01 | Phase 29 | Pending |
| EXP-02 | Phase 29 | Pending |
| DEBT-01 | Phase 24 | Complete |
| DEBT-02 | Phase 24 | Complete |
| DEBT-03 | Phase 24 | Complete |
| DEBT-04 | Phase 24 | Complete |

**Coverage:**
- v1.3 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap creation (traceability complete)*
