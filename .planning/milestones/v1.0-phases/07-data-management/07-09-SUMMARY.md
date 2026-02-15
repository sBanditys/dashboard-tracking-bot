---
status: complete
started: 2026-02-07T16:30:00Z
completed: 2026-02-07T16:32:00Z
commits: [2abc059]
---

## What was done

Wired all Phase 7 features into navigation and guild overview for discoverability.

## Changes

1. **Sidebar**: Added "Deleted Items" link after Exports (links to /guilds/[guildId]/settings/trash)
2. **Guild Tabs**: Added "Exports" tab to the tab navigation bar
3. **Guild Overview**: Added "Data Management" section with Exports and Deleted Items quick access cards between the existing quick access cards and analytics preview

## Decisions

- DEV-074: Data management cards placed before analytics preview (maintains primary action flow pattern from DEV-060)

## Files modified

- src/components/layout/sidebar.tsx — Added Deleted Items link
- src/components/guild-tabs.tsx — Added Exports tab
- src/app/(dashboard)/guilds/[guildId]/page.tsx — Added data management quick access cards
