# Technology Stack

**Analysis Date:** 2026-02-16

## Languages

**Primary:**
- TypeScript 5.5.4+ - Used across entire codebase (frontend and backend)
- JavaScript - ES2020+ modules, Node.js runtime

**Secondary:**
- SQL (PostgreSQL) - Database schemas and queries via Prisma
- JSON - Configuration and data serialization

## Runtime

**Environment:**
- Node.js 18+ (inferred from package.json dependencies and TypeScript config)

**Package Manager:**
- npm (npm 9+)
- Lockfile: `package-lock.json` present in both projects

## Frameworks

**Frontend (Dashboard):**
- Next.js 14.2.35 - React metaframework for SSR/SSG
  - App Router pattern used
  - API routes in `src/app/api/`
- React 18 - UI component library
- Headless UI 2.2.9 - Accessible UI components (Popover, Dialog, Menu)

**Backend:**
- Express.js 4.21.2 - HTTP API server
- Prisma 5.22.0 - TypeScript ORM for PostgreSQL

**Build & Development:**
- tsx 4.16.2 - TypeScript execution for development
- TypeScript 5.5.4 - Type checking and compilation
- ESLint 8.x - Linting (via eslint-config-next)
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- PostCSS 8 - CSS transformations

**Testing:**
- Vitest 4.0.16 - Unit/integration test runner
- @vitest/ui 4.0.16 - Test visualization
- Supertest 7.1.4 - HTTP assertion library for API testing

## Key Dependencies

**Data Management:**
- @prisma/client 5.22.0 - Database client for PostgreSQL ORM
  - Handles all database operations with type safety
  - Used across frontend and backend via shared library
  - Supports Row-Level Security (RLS) extensions
- ioredis 5.x (via @lx/shared) - Redis/Valkey client for caching and sessions
- fast-csv 4.3.6 - CSV parsing and generation for bulk operations

**UI & Visualization:**
- recharts 3.7.0 - React charting library for metrics dashboards
- sonner 2.0.7 - Toast notifications
- nprogress 0.2.0 - Page loading progress indicator
- react-day-picker 9.13.0 - Date picker component
- react-intersection-observer 10.0.2 - Intersection Observer hook
- clsx 2.1.1 - Conditional className utility
- date-fns 4.1.0 - Date formatting and manipulation
- next-themes 0.4.6 - Dark/light theme management

**State Management & Data Fetching:**
- @tanstack/react-query 5.90.20 - Server state management and caching
  - Used for API calls, pagination, cache invalidation
  - Provides deduplication and background refetching

**API & HTTP:**
- express 4.21.2 - Backend HTTP server
- cors 2.8.5 - CORS middleware for Express
- helmet 8.1.0 - Security headers middleware
- cookie-parser 1.4.7 - Cookie parsing middleware
- morgan 1.10.1 - HTTP request logging
- express-rate-limit 8.2.1 - Rate limiting middleware
- rate-limit-redis 4.3.1 - Distributed rate limiting via Redis/Valkey
- multer 2.0.2 - File upload handling

**External Integrations:**
- apify-client 2.7.2 - Official Apify SDK for web scraping
- openai 6.16.0 - OpenAI API client for grammar checking

**Security & Validation:**
- zod 4.3.6 (frontend), 3.25.76 (backend) - TypeScript-first schema validation
- dotenv 16.6.1 - Environment variable loading

**Development Dependencies:**
- @types/node 20.x - Node.js type definitions
- @types/react 18.x - React type definitions
- @types/react-dom 18.x - React DOM type definitions
- @types/express 5.0.3 - Express type definitions
- @types/cookie-parser 1.4.10 - Cookie parser types
- @types/cors 2.8.19 - CORS types
- @types/morgan 1.9.10 - Morgan types
- @types/multer 2.0.0 - Multer types
- @next/bundle-analyzer 16.1.6 - Next.js bundle analysis
- postcss 8.x - CSS processing
- tailwindcss 3.4.1 - Utility CSS framework

## Configuration

**Environment Configuration:**

Frontend uses environment variables:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint (exposed to browser)
- `SESSION_SECRET` - Session encryption secret (min 32 chars)
- Additional secrets never exposed (prefixed without NEXT_PUBLIC_)

Backend uses environment variables (in `api/.env.example`):
- Database: `DATABASE_URL` (PostgreSQL connection string with connection_limit)
- API: `PORT`, `API_BASE_URL`, `PUBLIC_URL`
- Auth: `API_SECRET`, `JWT_SECRET`, `SESSION_SECRET`
- Dashboard OAuth: `DASHBOARD_DISCORD_CLIENT_ID`, `DASHBOARD_DISCORD_CLIENT_SECRET`, `DASHBOARD_OAUTH_CALLBACK`
- External Services: `APIFY_API_TOKEN`, `YOUTUBE_API_KEY`, `OPENAI_API_KEY`
- Cache: `VALKEY_URL` (Redis/Valkey connection)
- Security: `APIFY_WEBHOOK_SIGNING_SECRET`, `BOT_CALLBACK_SIGNING_SECRET`
- Timeouts: `OUTBOUND_HTTP_TIMEOUT_MS`, `DISCORD_HTTP_TIMEOUT_MS`, `YOUTUBE_HTTP_TIMEOUT_MS`, `INSTAGRAM_HTTP_TIMEOUT_MS`

**Build Configuration:**

Frontend:
- `next.config.mjs` - Next.js configuration with bundle analyzer
- `tsconfig.json` - TypeScript strict mode enabled
- Path alias: `@/*` → `./src/*`
- Image remotePatterns: Discord CDN (`cdn.discordapp.com`)

Backend:
- `tsconfig.json` - TypeScript configuration for Node.js
- `package.json` scripts: `dev` (tsx watch), `build` (tsc), `start` (node), `test` (vitest)

## Platform Requirements

**Development:**
- Node.js 18+
- npm 9+
- PostgreSQL 13+ (local or remote)
- Valkey/Redis 6+ (optional but recommended for caching, rate limiting)

**Production:**
- Node.js 18+ (LTS recommended)
- PostgreSQL 13+ database
- Valkey/Redis 6+ (required for distributed rate limiting, caching)
- HTTPS reverse proxy (nginx/Cloudflare) for both frontend and backend
- Disk storage for screenshot uploads (`/app/screenshots`)
- External service credentials (Apify, YouTube API, Discord OAuth, OpenAI)

**Deployment Target:**
- Node.js application servers (VPS, Docker, Kubernetes)
- Can run behind reverse proxy with trust proxy configuration
- PM2 process manager for production (references in graceful shutdown code)

---

*Stack analysis: 2026-02-16*
