# External Integrations

**Analysis Date:** 2026-02-16

## APIs & External Services

**Apify Web Scraping Platform:**
- **Purpose:** Scrape metrics (views, likes, comments) from social media platforms (TikTok, Instagram, X/Twitter, YouTube, Facebook)
- **SDK/Client:** `apify-client` 2.7.2
- **Implementation files:**
  - `api/src/integrations/apify/client.ts` - Apify client initialization
  - `api/src/integrations/apify/webhook.ts` - Webhook handler for run completion
  - `api/src/integrations/apify/runs/` - Platform-specific run executors (tiktokRun.ts, instagramRun.ts, xRun.ts)
  - `api/src/integrations/apify/normalize/` - Data normalization for each platform
- **Auth:** `APIFY_API_TOKEN` (env var)
- **Webhook Security:** `APIFY_WEBHOOK_SIGNING_SECRET` for request signature verification
- **Actor IDs (configurable via env):**
  - Instagram: `APIFY_INSTAGRAM_ACTOR_ID` (default: apify/instagram-scraper)
  - TikTok: `APIFY_TIKTOK_ACTOR_ID` (default: clockworks/tiktok-scraper)
  - X/Twitter: `APIFY_X_ACTOR_ID` (default: apidojo/twitter-scraper-lite)
  - X Profile: `APIFY_X_PROFILE_ACTOR_ID` (default: apidojo/twitter-user-scraper)
- **Run Registry:** `ApifyRunRegistry` Prisma model tracks initiated runs for webhook verification
- **Error Handling:** Runs can fail, are tracked in database with status (initiated, succeeded, failed, expired)
- **Rate Limiting:** Tracked via `GuildApiUsage.apifyRunCount` per guild per day
- **Budget Enforcement:** `GuildBudgetConfig.dailyApifyRunLimit` (default 100 runs/day)

**YouTube Data API v3:**
- **Purpose:** Fetch video metrics (views, likes, comments) for YouTube channels
- **Client:** Native `https` module calls via `fetchWithTimeout` wrapper
- **Implementation files:**
  - `api/src/ingest/helpers/youtubeHelpers.ts` - Helper functions for fetching video stats
  - `api/src/services/youtubeRefresh.ts` - Service for refreshing YouTube video metrics
  - `api/src/services/youtubeSubmit.ts` - Service for submitting YouTube posts
- **Auth:** `YOUTUBE_API_KEY` (API key, not OAuth)
- **Quota Tracking:** `GuildApiUsage.youtubeQuotaUsed` tracks daily quota consumption per guild
- **Timeout:** `YOUTUBE_HTTP_TIMEOUT_MS` (default via `DEFAULT_OUTBOUND_HTTP_TIMEOUT_MS`)
- **Database Model:** `VideoMetrics` stores collected metrics per videoId and timestamp

**OpenAI API:**
- **Purpose:** Grammar checking on post descriptions/captions before submission
- **SDK/Client:** `openai` 6.16.0 (official SDK)
- **Implementation file:** `api/src/services/grammarCheck.ts`
- **Auth:** `OPENAI_API_KEY` (API key)
- **Optional:** If `OPENAI_API_KEY` not configured, grammar checking is disabled (graceful degradation)
- **Cost Tracking:** `GuildApiUsage.openaiCallCount` and `openaiTokensUsed` tracked per guild per day
- **Budget:** `GuildBudgetConfig.weeklyOpenaiCallLimit` (default 270 calls/week for "last 7 days" operations)

**Discord OAuth 2.0:**
- **Purpose:** Authenticate dashboard users and authorize access to Discord guilds
- **Client:** Manual OAuth2 flow via HTTP (no discord.js library for this flow)
- **Implementation file:** `api/src/services/dashboard/discordOAuth.ts`
- **OAuth Credentials:**
  - `DASHBOARD_DISCORD_CLIENT_ID` - OAuth application ID
  - `DASHBOARD_DISCORD_CLIENT_SECRET` - OAuth application secret
  - `DASHBOARD_OAUTH_CALLBACK` - Redirect URI (e.g., https://api.your-domain.com/api/v1/auth/discord/callback)
- **Scopes Requested:** `identify`, `guilds`
- **API Endpoint:** `https://discord.com/api/v10` (Discord API v10)
- **Timeout:** `DISCORD_HTTP_TIMEOUT_MS` (default via `DEFAULT_OUTBOUND_HTTP_TIMEOUT_MS`)
- **Token Response:** Access token, refresh token, token type, expiration
- **Permission Checking:** Filters guilds based on ADMINISTRATOR (0x8) or MANAGE_GUILD (0x20) permission bits
- **Database Model:** `DashboardSession` stores refresh tokens (hashed) with expiration
- **Additional Metadata:** User agent and IP address captured for security audit

**Discord Webhooks (Incoming):**
- **Purpose:** Send security alerts and notifications to Discord channels
- **Type:** Webhook URLs configured as Discord channel webhooks
- **Security Webhook:** `SECURITY_ALERT_WEBHOOK_URL` - Sends failed authentication attempts, suspicious activity
- **Implementation file:** `api/src/routes/dashboard/guilds.ts` (security alert dispatch)

## Data Storage

**Primary Database:**
- **Provider:** PostgreSQL 13+
- **Connection:** `DATABASE_URL` environment variable
- **Client:** Prisma 5.22.0 (`@prisma/client`)
- **Initialization:** `api/src/shared/db/client.ts` (singleton Prisma instance)
- **Connection Pooling:**
  - Formula: `(num_physical_cpus * 2 + 1) / num_application_instances`
  - Configurable via `connection_limit` query parameter in `DATABASE_URL`
  - Default for 4-core server with 4 PM2 instances: 3 connections per instance
- **RLS (Row-Level Security):** Custom extension in `api/src/shared/db/rls-extension.ts`
  - Guild-scoped Prisma clients for tenant isolation
  - `createGuildPrisma()` - Creates RLS-enforced client per guild
  - `createBypassPrisma()` - Creates unrestricted client (admin operations)
- **Migrations:** Managed via Prisma (`prisma migrate`)
- **Schema Location:** `/Users/gabrielleal/Desktop/Tracking Data Bot/shared/prisma/schema.prisma`
- **Key Tables:**
  - `Guild` - Discord servers (main tenant)
  - `User` - Platform users being tracked
  - `Profile` - Social media account profiles (Instagram, TikTok, YouTube, X, Facebook)
  - `ClientAccount` - Brand accounts on social platforms
  - `Post` - Submissions and tracked posts
  - `VideoMetrics` - Time-series metrics (views, likes, comments)
  - `DashboardAuditLog` - Audit trail for dashboard changes
  - `DashboardSession` - JWT refresh token storage

**Caching & Session Storage:**
- **Provider:** Valkey (Redis-compatible) or Redis
- **Connection:** `VALKEY_URL` or `REDIS_URL` environment variable
- **Client:** ioredis 5.x (via `@lx/shared/db/valkey.ts`)
- **Graceful Degradation:** If `VALKEY_URL` not configured, caching disabled (warning logged)
- **Health Check:** PING command via `isValkeyHealthy()`
- **Usage:**
  - Rate limiting via `rate-limit-redis` middleware
  - Session state management
  - Query result caching
- **Connection Options:**
  - Max retries per request: 3
  - Exponential backoff retry strategy (capped at 3 seconds between retries)
  - Lazy connect enabled
  - Ready check enabled

**File Storage:**
- **Screenshots:** Local filesystem at `SCREENSHOT_STORAGE_PATH` (default `/app/screenshots`)
  - Stored in Discord CDN via webhook uploads (stored as `discordUrl` in `ScreenshotUpload` model)
  - Optional local path tracking in `filePath` field
- **Logs:** Local filesystem at `LOG_PATH` (default `./app/logs`)
- **Database Backup:** Managed externally (not configured in codebase)

## Authentication & Identity

**Authentication Strategy:**

Dashboard (Frontend to Backend):
1. OAuth2 with Discord
   - User clicks "Login with Discord"
   - Dashboard redirects to Discord OAuth endpoint via backend
   - Discord redirects to `api/auth/discord/callback`
   - Backend exchanges code for tokens
   - Backend issues JWT access token and refresh token
   - Tokens stored in secure HTTP-only cookies
   - Implementation: `api/src/services/dashboard/discordOAuth.ts` + `api/src/routes/auth/`

API Requests (Frontend to Backend):
- JWT bearer token in Authorization header: `Authorization: Bearer {jwt}`
- Optional API key for service-to-service calls (scoped via `API_SERVICE_KEYS`)
- Session refresh flow in `lib/fetch-with-retry.ts`:
  - If 401 received, calls `POST /api/auth/refresh`
  - Backend validates refresh token from cookie
  - Issues new JWT pair
  - Frontend retries original request

Backend Service Authentication:
- Internal API secret in `X-Internal-Secret` header for SSR-to-API requests
- Signed webhook payloads for bot callbacks and Apify webhooks
- API service keys with scope enforcement (`API_SERVICE_KEYS` format: `serviceName:apiKey:scope1|scope2`)

**Authorization:**
- Dashboard routes use `requireDashboardAuth` middleware (JWT validation)
- Admin operations use `requireGuildAdmin` middleware (checks ADMINISTRATOR permission bit 0x8)
- Guild access enforced via `requireGuildAccess` middleware (RLS-enforced queries)
- Role-based access via Discord guild permissions (owner, MANAGE_GUILD, ADMINISTRATOR)

**Token Management:**
- **JWT Secret:** `JWT_SECRET` (64+ bytes, must be strong)
- **JWT Refresh Tokens:** Hashed in `DashboardSession` table
- **Expiration:** Configurable per token type
- **Session Cookies:**
  - `DASHBOARD_ACCESS_COOKIE_NAME` (default: dashboard_at)
  - `DASHBOARD_REFRESH_COOKIE_NAME` (default: dashboard_rt)
  - `DASHBOARD_SESSION_COOKIE_SAMESITE` (default: strict)

## Monitoring & Observability

**Error Tracking:**
- Logger: `@lx/shared/lib/logger` (pino-based logger shared across services)
- Structured logging with module/context awareness
- Log levels configurable via `LOG_LEVEL` (default: info)
- Files: Various logger.child() calls throughout codebase

**Logs:**
- **Output:** Console (development), file-based (production)
- **Path:** `LOG_PATH` environment variable
- **Logging Patterns:**
  - HTTP requests via Morgan middleware
  - Application events (server startup, shutdown, errors)
  - API call latency and errors
  - Database connection events
- **Security Alerts:** Logged to Discord via `SECURITY_ALERT_WEBHOOK_URL`

**Health Checks:**
- Bot health status in `BotHealth` model (singleton pattern with id=1)
  - Last heartbeat timestamp
  - Shard count, guild count
  - Status: online | degraded | offline | unknown
  - Memory usage and uptime

**Observability Endpoints:**
- Observability token: `OBSERVABILITY_TOKEN` (must be provided in header)
- Security dashboard read/admin keys: `SECURITY_DASHBOARD_READ_KEYS`, `SECURITY_DASHBOARD_ADMIN_KEYS`
- Metrics endpoint with cardinality limits (HTTP path: 300 limit, labels: 200 limit)

## CI/CD & Deployment

**Hosting:**
- Self-hosted: Node.js application servers (VPS or dedicated servers)
- PM2 process manager for process management (referenced in graceful shutdown code)
- Reverse proxy required: nginx, Cloudflare, or equivalent
- Requires trust proxy configuration (`TRUST_PROXY_CIDRS` or `TRUST_PROXY_HOPS`)

**CI Pipeline:**
- Not configured in codebase - assumes manual deployment or external CI/CD
- Build steps: `npm install`, `npm run build`
- Start command: `npm start` (for frontend) or `npm start` (for API)

**Build Artifacts:**
- Frontend: Next.js build output (`.next/` directory)
- Backend: TypeScript compiled to JavaScript (`dist/` directory)

**Environment Management:**
- Environment files: `.env` (not committed)
- Example files: `.env.example` (committed, for reference)

## Environment Configuration

**Required env vars (Frontend - `dashboard-tracking-bot/.env`):**
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `SESSION_SECRET` - Session encryption

**Required env vars (Backend - `api/.env`):**
See `api/.env.example` for complete list. Critical vars:
- `DATABASE_URL` - PostgreSQL connection
- `API_SECRET` - Internal request signing
- `JWT_SECRET` - Dashboard token signing
- `DASHBOARD_DISCORD_CLIENT_ID` - OAuth
- `DASHBOARD_DISCORD_CLIENT_SECRET` - OAuth
- `APIFY_API_TOKEN` - Web scraping
- `YOUTUBE_API_KEY` - YouTube metrics
- `OPENAI_API_KEY` - Grammar checking (optional)
- `VALKEY_URL` - Redis/caching
- `APIFY_WEBHOOK_SIGNING_SECRET` - Webhook verification
- `BOT_CALLBACK_SIGNING_SECRET` - Bot callback verification

**Secrets location:**
- `.env` files (gitignored, never committed)
- Use environment-specific .env files in production
- Secrets never logged or exposed to clients

## Webhooks & Callbacks

**Incoming Webhooks:**

**Apify Webhook:**
- **Endpoint:** `POST /api/webhooks/apify` (or routing via `apifyWebhook` middleware)
- **Purpose:** Receive web scraping run completion events
- **Security:** HMAC signature verification using `APIFY_WEBHOOK_SIGNING_SECRET`
- **Signed Payload Mode:** `WEBHOOK_SIGNED_PAYLOAD_MODE=enforce`
- **TTL:** `WEBHOOK_SIGNED_PAYLOAD_TTL_SECONDS` (default 3600)
- **Dispatch TTL:** `WEBHOOK_DISPATCH_TTL_SECONDS` (default 86400)
- **Allowed Origins:** `WEBHOOK_ALLOWED_ORIGINS` (api.apify.com, my.apify.com)
- **Processing:** Normalizes data, stores metrics, updates post status
- **Error Handling:** Failed runs trigger alerts, status updated to "failed"
- **Implementation:** `api/src/integrations/apify/webhook.ts`

**Bot Callback Webhook:**
- **Endpoint:** `POST /api/callbacks` (handled by bot callback middleware)
- **Purpose:** Receive events from Discord bot (message commands, events)
- **Security:** HMAC signature verification using `BOT_CALLBACK_SIGNING_SECRET`
- **Signed Mode:** `BOT_CALLBACK_SIGNED_MODE=enforce`
- **Allowed Services:** `BOT_CALLBACK_ALLOWED_SERVICES` (e.g., "api")
- **Service Name:** `BOT_CALLBACK_SERVICE_NAME` (e.g., "api")
- **Token:** `BOT_CALLBACK_TOKEN` for idempotency
- **URL:** `BOT_CALLBACK_URL` (default http://127.0.0.1:4000)

**Verification Webhook:**
- **Endpoint:** `POST /api/webhooks/verify` (via `apifyVerificationWebhook`)
- **Purpose:** Handle Apify runs for profile verification (Instagram, TikTok handles)
- **Implementation:** `api/src/routes/hooks.ts`

**Outgoing Webhooks:**

**Discord Notifications:**
- **Security Alerts:** Via `SECURITY_ALERT_WEBHOOK_URL` Discord webhook
- **Guild Notifications:** Per-guild alerts via `Guild.logsChannelId` Discord channel
- **Daily Reports:** Via `Guild.updatesChannelId` Discord channel
- **Bonus Announcements:** Via guild channels for weekly bonus events

---

*Integration audit: 2026-02-16*
