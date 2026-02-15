---
phase: 01-foundation-authentication
plan: 04
subsystem: user-interface
status: complete
tags: [dashboard, layout, sidebar, responsive, dark-mode, ui-components]

requires:
  - 01-01: Next.js project with Tailwind and dark mode setup
  - 01-03: User authentication hooks (useUser, useLogout)

provides:
  - Complete dashboard shell with responsive layout
  - Reusable UI components (Button, Skeleton)
  - Navigation sidebar with active state
  - Mobile drawer with slide-out animation
  - Theme toggle (dark/light mode)
  - User menu with logout confirmation
  - Breadcrumb navigation
  - Welcome page with guild selection CTA

affects:
  - 01-05: Guild management will use dashboard layout
  - All future plans: Dashboard shell provides structure for all pages

tech-stack:
  added: []
  patterns:
    - Client component layout with useState for drawer control
    - Responsive design with Tailwind breakpoints (lg:1024px)
    - Component composition (Sidebar, Topbar, MobileDrawer)
    - Compound variants pattern for Button component
    - Skeleton loading states for async content
    - Click-outside detection with useRef and useEffect
    - Media query hook for mobile detection

key-files:
  created:
    - src/components/ui/button.tsx: Reusable button with variants (primary, secondary, ghost, destructive)
    - src/components/ui/skeleton.tsx: Pulse-animated skeleton loader
    - src/components/theme-toggle.tsx: Theme switcher with sun/moon icons
    - src/hooks/use-mobile.ts: Media query hook for responsive breakpoint
    - src/components/layout/sidebar.tsx: Always-expanded navigation sidebar
    - src/components/layout/topbar.tsx: Top bar with hamburger, logo, theme toggle, user menu
    - src/components/layout/mobile-drawer.tsx: Slide-out drawer for mobile navigation
    - src/components/layout/breadcrumbs.tsx: Path-based breadcrumb navigation
    - src/components/layout/user-menu.tsx: Dropdown menu with logout confirmation
    - src/app/(dashboard)/layout.tsx: Dashboard layout wrapper
    - src/app/(dashboard)/page.tsx: Welcome page with user greeting
    - src/app/(dashboard)/loading.tsx: Full-page skeleton loading state
  modified:
    - src/middleware.ts: Added protection for /guilds and /settings routes

decisions:
  - id: DEV-010
    decision: Always-expanded sidebar (not collapsible)
    rationale: Per CONTEXT.md phase decisions, sidebar stays expanded for desktop navigation clarity
    impact: Desktop users always see full navigation labels, mobile uses drawer
  - id: DEV-011
    decision: Logout confirmation in dropdown (not modal)
    rationale: Per CONTEXT.md "quick confirmation", dropdown provides faster UX than modal
    impact: Two-click logout with inline confirmation buttons
  - id: DEV-012
    decision: Theme toggle in topbar (not user menu)
    rationale: Theme switching is frequent action, topbar placement makes it more accessible
    impact: Users can toggle theme without opening dropdown

metrics:
  duration: 2m 49s
  completed: 2026-01-25
---

# Phase 01 Plan 04: Dashboard Shell UI Summary

**One-liner:** Responsive dashboard layout with sidebar navigation, mobile drawer, theme toggle, user menu, and welcome page

## What Was Built

Implemented complete dashboard shell with responsive design, providing the UI foundation for all authenticated pages. Desktop view displays always-expanded sidebar with navigation items, mobile view uses hamburger menu with slide-out drawer. Theme toggle enables dark/light mode switching. User menu shows avatar with logout confirmation dropdown. Welcome page greets users and guides them to guild selection.

**Key capabilities:**
- Desktop: 256px sidebar always visible, topbar with logo and user controls
- Mobile: Hamburger menu opens drawer from left with backdrop overlay
- Theme toggle: Switch between dark and light mode (dark default)
- User menu: Avatar button opens dropdown with user info and logout option
- Logout: Two-click confirmation (click "Sign out" → confirm or cancel)
- Breadcrumbs: Auto-generated from URL path (Home > Section > Page)
- Loading states: Skeleton components for async content
- Welcome page: Personalized greeting with "Select a Guild" CTA

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create base UI components | 24d5cfd | button.tsx, skeleton.tsx, theme-toggle.tsx, use-mobile.ts |
| 2 | Create layout components | 8278d9b | sidebar.tsx, topbar.tsx, mobile-drawer.tsx, breadcrumbs.tsx, user-menu.tsx |
| 3 | Assemble dashboard layout and welcome page | 88919ae | (dashboard)/layout.tsx, page.tsx, loading.tsx, middleware.ts |

## Technical Implementation

### Component Architecture

**Base UI Components**
- **Button**: Variant system (primary/secondary/ghost/destructive), size system (sm/md/lg), loading state with spinner, disabled state, accessibility attributes
- **Skeleton**: Pulse animation, shape variants (line/circle/rect), dark mode compatible
- **ThemeToggle**: Uses next-themes, hydration-safe mounting check, emoji icons (☀️/🌙)
- **useMobile hook**: Window.matchMedia for 1024px breakpoint, SSR-safe initialization, cleanup event listeners

**Layout Components**
- **Sidebar**: Navigation items with active state (purple highlight), legal links in footer, emoji icons, 256px fixed width
- **Topbar**: Hamburger menu (mobile only), logo link, theme toggle, user menu, 64px height
- **MobileDrawer**: Slide-out from left, backdrop overlay, click-outside close, Escape key close, body scroll lock
- **Breadcrumbs**: Path parsing from usePathname, Home always first, last item not clickable, responsive (hide on small screens if long)
- **UserMenu**: Avatar with first letter initial, dropdown with user info, logout confirmation flow, click-outside close

### Responsive Behavior

**Desktop (≥1024px)**
- Sidebar: Always visible, 256px width
- Topbar: Logo visible, hamburger hidden
- Main content: Flex-1 with padding

**Mobile (<1024px)**
- Sidebar: Hidden, replaced by drawer
- Topbar: Hamburger visible, logo hidden
- Drawer: Slides from left, covers viewport
- Backdrop: Semi-transparent black overlay

### Theme System

**Dark Mode (default)**
- Background: #1a1a1a
- Surface: #2d2d2d
- Border: #404040
- Accent: #8B5CF6 (purple)
- Text: white, gray-300, gray-400

**Light Mode**
- Background: #ffffff
- Surface: #f5f5f5
- Border: #e5e5e5
- (Full palette from tailwind.config.ts)

### Navigation Flow

**Route Protection**
- Middleware protects: /, /guilds/*, /settings/*
- Unauthenticated: Redirect to /login with callbackUrl
- Authenticated at /login: Redirect to /

**Active State**
- Sidebar links check pathname === href
- Active: Purple background (bg-accent-purple)
- Inactive: Gray text with hover (hover:bg-surface/50)

**Mobile Navigation**
- Click hamburger → setDrawerOpen(true)
- Click nav item → setDrawerOpen(false) + navigate
- Click backdrop → setDrawerOpen(false)
- Press Escape → setDrawerOpen(false)

### Loading States

**Dashboard Loading (loading.tsx)**
- Header skeleton (title + subtitle)
- Content card skeleton (48px height)
- Grid of 3 skeletons (cards)

**User Menu Loading**
- Circle skeleton (10x10)
- Shown while useUser isLoading

**Welcome Page Loading**
- Inline loading state in page component
- Same skeleton structure as loading.tsx

### Code Patterns Established

**Component Variant Pattern**
```typescript
const variants = {
  primary: 'bg-accent-purple text-white hover:bg-accent-purple/90',
  secondary: 'bg-surface text-white hover:bg-surface/80',
  // ...
}
```

**Responsive Class Pattern**
```typescript
className="hidden lg:block" // Desktop only
className="lg:hidden" // Mobile only
className="p-4 md:p-6" // Responsive padding
```

**Click Outside Pattern**
```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      onClose()
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [open])
```

**Media Query Hook Pattern**
```typescript
const mediaQuery = window.matchMedia('(max-width: 1023px)')
setIsMobile(mediaQuery.matches)
mediaQuery.addEventListener('change', handler)
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria from plan passed:

- [x] Desktop view: Sidebar always visible, 256px wide
- [x] Mobile view (<1024px): Hamburger menu, slide-out drawer
- [x] Theme toggle works (dark/light switch)
- [x] User menu dropdown shows logout option
- [x] Logout confirmation appears before actual logout
- [x] Breadcrumbs show current path
- [x] Loading state uses skeleton components
- [x] Welcome page displays user name and guidance
- [x] Dark mode is default, colors match spec (#1a1a1a, #8B5CF6)

**Build output:**
```
Route (app)                              Size     First Load JS
┌ ○ /                                    150 B          87.4 kB
├ ƒ /api/auth/callback                   0 B                0 B
├ ƒ /api/auth/login                      0 B                0 B
├ ƒ /api/auth/logout                     0 B                0 B
├ ƒ /api/user                            0 B                0 B
├ ○ /legal/privacy                       150 B          87.4 kB
├ ○ /legal/terms                         150 B          87.4 kB
└ ○ /login                               1.57 kB        88.8 kB

ƒ Middleware                             26.6 kB
```

**Success Criteria Met:**
- UX-01: Dark mode dashboard with Discord-style theme (dark gray backgrounds, purple accent)
- UX-02: Fully responsive on mobile devices (drawer, hamburger, responsive padding)
- Sidebar always expanded (not collapsible to icons)
- Top bar with minimal design (logo left, user right)
- Mobile drawer slides out from hamburger
- Theme toggle functional (next-themes integration)
- Logout with confirmation dropdown (inline confirmation)
- Breadcrumbs for navigation context
- Loading skeletons for async content
- Welcome page guides new users to guild selection

## Next Phase Readiness

**Ready for 01-05 (Phase completion):**
- [x] Dashboard shell complete with all UI components
- [x] Layout wrapper ready for all dashboard pages
- [x] User menu integrated with auth hooks
- [x] Theme toggle functional
- [x] Loading states defined
- [x] Mobile responsive design complete

**No blockers or concerns.**

**Recommended next steps:**
1. Complete Phase 1 with any remaining tasks
2. Begin Phase 2: Guild management features
3. Build guild selection page using dashboard layout
4. Add guild detail views with tracking data

## Knowledge for Future Plans

**When building dashboard pages:**

1. **Use dashboard layout:** Place pages inside `src/app/(dashboard)/` route group
2. **Layout wrapper:** Automatically includes sidebar, topbar, breadcrumbs
3. **Loading states:** Create `loading.tsx` with Skeleton components
4. **User data:** Use `useUser()` hook from existing auth
5. **Navigation:** Add items to Sidebar component nav array
6. **Protected routes:** Add to middleware isDashboardRoute check
7. **Theme support:** Use Tailwind dark: prefix for dark mode styles
8. **Responsive:** Use lg: breakpoint (1024px) for mobile/desktop split

**Component usage patterns:**

```typescript
// Button
<Button variant="primary" size="lg" loading={isLoading}>
  Click me
</Button>

// Skeleton
<Skeleton className="h-10 w-64" />
<Skeleton shape="circle" className="w-10 h-10" />

// Theme Toggle
<ThemeToggle /> // Automatic theme switching

// Mobile Detection
const isMobile = useMobile()
```

**Files to reference:**
- src/components/ui/button.tsx: Button variant pattern
- src/components/layout/sidebar.tsx: Navigation structure
- src/app/(dashboard)/layout.tsx: Layout composition
- src/hooks/use-mobile.ts: Responsive hook pattern

**Gotchas to avoid:**
- Don't forget 'use client' for components using hooks (useState, usePathname, etc.)
- Sidebar navigation items need manual active state check
- Mobile drawer needs both drawer state and close handler
- Theme toggle needs mounted check to prevent hydration mismatch
- Click-outside handlers need cleanup in useEffect
- Body scroll lock needed when drawer open

---

**Duration:** 2m 49s
**Completed:** 2026-01-25
**Agent:** Claude Sonnet 4.5
