# Phase 5: Configuration & Mutations - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can modify guild settings and manage tracked items through the dashboard. This includes editing settings, adding/removing tracked accounts and brands, selecting notification channels, and viewing an audit log of changes. Read-only analytics and data exports are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Form patterns
- **Claude's discretion** on editing pattern (inline vs modal vs edit-mode toggle)
- **Claude's discretion** on add-item form pattern (modal vs wizard vs inline)
- **Claude's discretion** on validation error display
- **Claude's discretion** on optimistic updates vs wait-for-API

### Confirmation flows
- Delete confirmations use **modal with confirm button** ("Are you sure?" style)
- Confirmation modal shows **just the item name** (not impact/cascading effects)
- Destructive buttons (delete, remove) are **red** to signal danger
- **Claude's discretion** on undo support after deletion

### Channel selection
- **Searchable combobox** for Discord channel selection (filter as you type)
- **Filter to text channels only** (voice/announcement channels not shown)
- Show all channels but **warn on select** if bot may not have permission
- **Claude's discretion** on whether to include a "Test notification" button

### Audit log display
- **Table format** with sortable columns (Time, User, Action, Details)
- Show **full diff** for changes (old value → new value)
- **Filterable by user and action type** (dropdowns)
- Lives on a **dedicated "Activity" page** in sidebar navigation

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for mutation UX patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-configuration-mutations*
*Context gathered: 2026-02-03*
