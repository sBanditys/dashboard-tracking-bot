Implement the following plan:                                                                                                                       
                                                                                                                                                      
  # Enterprise Dashboard Architecture Plan                                                                                                            
                                                                                                                                                      
  ## Overview                                                                                                                                         
                                                                                                                                                      
  Add a web dashboard to the tracking bot that remains available when the Discord bot is down. Two-repository architecture with the API as the        
  single gateway for dashboard reads.                                                                                                                 
                                                                                                                                                      
  ## Current State Summary                                                                                                                            
                                                                                                                                                      
  - **Monorepo**: 4 services (API, Bot, Worker, Notifier) + shared library                                                                            
  - **Multi-tenancy**: Client ↔ Guild (1:1) → Brand → AccountGroup → ClientAccount                                                                    
  - **Database**: 38 Prisma models with audit logging, usage tracking                                                                                 
  - **Auth**: HMAC-signed requests (bot↔API), API keys, CSRF                                                                                          
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Target Architecture                                                                                                                              
                                                                                                                                                      
  ```                                                                                                                                                 
  ┌─────────────────┐     ┌─────────────────┐                                                                                                         
  │   Dashboard     │     │   Discord Bot   │                                                                                                         
  │  (Vercel/New    │     │   (VPS/PM2)     │                                                                                                         
  │   Repository)   │     │                 │                                                                                                         
  └────────┬────────┘     └────────┬────────┘                                                                                                         
  │                       │                                                                                                                           
  │ HTTPS + JWT           │ Direct DB                                                                                                                 
  │                       │                                                                                                                           
  ▼                       ▼                                                                                                                           
  ┌─────────────────────────────────────────┐                                                                                                         
  │              API Server                  │                                                                                                        
  │  - Dashboard endpoints (JWT auth)        │                                                                                                        
  │  - Bot integrations (HMAC auth)          │                                                                                                        
  │  - Webhook handlers                      │                                                                                                        
  └────────────────────┬────────────────────┘                                                                                                         
  │                                                                                                                                                   
  ▼                                                                                                                                                   
  ┌──────────────┐                                                                                                                                    
  │  PostgreSQL  │                                                                                                                                    
  └──────────────┘                                                                                                                                    
  ```                                                                                                                                                 
                                                                                                                                                      
  **Failure Isolation**: Dashboard on Vercel stays up when bot/worker crash.                                                                          
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Repository Structure                                                                                                                             
                                                                                                                                                      
  ### Repository 1: `tracking-bot-core` (Current - Modified)                                                                                          
  ```                                                                                                                                                 
  /api        - Add dashboard endpoints + JWT auth                                                                                                    
  /bot        - Add health beacon                                                                                                                     
  /worker     - Unchanged                                                                                                                             
  /notifier   - Unchanged                                                                                                                             
  /shared     - Schema ownership stays here                                                                                                           
  ```                                                                                                                                                 
                                                                                                                                                      
  ### Repository 2: `tracking-dashboard` (New)                                                                                                        
  ```                                                                                                                                                 
  /app                           - Next.js 14 App Router                                                                                              
  /(auth)/login/page.tsx       - Discord OAuth                                                                                                        
  /(dashboard)/page.tsx        - Tenant list                                                                                                          
  /(dashboard)/guilds/[guildId]/page.tsx      - Settings + usage                                                                                      
  /(dashboard)/guilds/[guildId]/tracking/     - Accounts/posts                                                                                        
  /(legal)/terms, /privacy                                                                                                                            
  /lib/api-client.ts             - API client with auth                                                                                               
  /lib/auth.ts                   - NextAuth.js config                                                                                                 
  ```                                                                                                                                                 
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## API Contract                                                                                                                                     
                                                                                                                                                      
  ### Authentication Endpoints                                                                                                                        
  ```                                                                                                                                                 
  GET  /api/v1/auth/discord          - Initiate Discord OAuth                                                                                         
  GET  /api/v1/auth/discord/callback - OAuth callback → JWT                                                                                           
  POST /api/v1/auth/refresh          - Refresh access token                                                                                           
  POST /api/v1/auth/logout           - Revoke session                                                                                                 
  GET  /api/v1/auth/me               - Current user + guilds                                                                                          
  ```                                                                                                                                                 
                                                                                                                                                      
  ### Guild Endpoints                                                                                                                                 
  ```                                                                                                                                                 
  GET  /api/v1/guilds                      - List accessible guilds                                                                                   
  GET  /api/v1/guilds/:guildId             - Guild details                                                                                            
  PUT  /api/v1/guilds/:guildId/settings    - Update settings (Phase 2)                                                                                
  GET  /api/v1/guilds/:guildId/usage       - Usage stats                                                                                              
  GET  /api/v1/guilds/:guildId/status      - Bot health + queue depth                                                                                 
  GET  /api/v1/guilds/:guildId/brands      - List brands                                                                                              
  GET  /api/v1/guilds/:guildId/accounts    - List accounts (paginated)                                                                                
  GET  /api/v1/guilds/:guildId/posts       - List posts (paginated)                                                                                   
  GET  /api/v1/guilds/:guildId/audit       - Audit log (Phase 2)                                                                                      
  POST /api/v1/guilds/:guildId/exports     - Request export (Phase 2)                                                                                 
  ```                                                                                                                                                 
                                                                                                                                                      
  ### Auth Flow                                                                                                                                       
  1. User clicks "Login with Discord" → redirect to Discord OAuth                                                                                     
  2. Discord callback → API exchanges code for tokens                                                                                                 
  3. API fetches user's guilds, filters to managed guilds                                                                                             
  4. API issues JWT (15min) + refresh token (30 days)                                                                                                 
  5. JWT contains: `{ sub, username, guilds: [{ id, clientId, permissions }] }`                                                                       
                                                                                                                                                      
  ### Authorization                                                                                                                                   
  - Middleware extracts `clientId` from JWT guild list                                                                                                
  - All queries scoped by `clientId` (defense-in-depth)                                                                                               
  - Write operations require Discord ADMINISTRATOR or MANAGE_GUILD permission                                                                         
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Database Schema Changes                                                                                                                          
                                                                                                                                                      
  Add to `shared/prisma/schema.prisma`:                                                                                                               
                                                                                                                                                      
  ```prisma                                                                                                                                           
  model DashboardSession {                                                                                                                            
  id           String    @id @default(cuid())                                                                                                         
  userId       String    @db.VarChar(32)                                                                                                              
  refreshToken String    @unique @db.VarChar(128)                                                                                                     
  userAgent    String?   @db.VarChar(256)                                                                                                             
  ipAddress    String?   @db.VarChar(45)                                                                                                              
  createdAt    DateTime  @default(now())                                                                                                              
  expiresAt    DateTime                                                                                                                               
  revokedAt    DateTime?                                                                                                                              
                                                                                                                                                      
  @@index([userId, expiresAt])                                                                                                                        
  }                                                                                                                                                   
                                                                                                                                                      
  model AuditLog {                                                                                                                                    
  id         String   @id @default(cuid())                                                                                                            
  createdAt  DateTime @default(now())                                                                                                                 
  actorId    String   @db.VarChar(32)                                                                                                                 
  actorType  String   @db.VarChar(16)   // "user" | "system" | "bot"                                                                                  
  guildId    String   @db.VarChar(32)                                                                                                                 
  targetType String   @db.VarChar(32)   // "guild_settings" | "brand" | etc.                                                                          
  targetId   String?  @db.VarChar(64)                                                                                                                 
  action     String   @db.VarChar(32)   // "create" | "update" | "delete"                                                                             
  changes    Json?                                                                                                                                    
  source     String   @db.VarChar(16)   // "dashboard" | "bot"                                                                                        
  ipAddress  String?  @db.VarChar(45)                                                                                                                 
                                                                                                                                                      
  @@index([guildId, createdAt(sort: Desc)])                                                                                                           
  }                                                                                                                                                   
                                                                                                                                                      
  model BotHealth {                                                                                                                                   
  id            Int      @id @default(1)                                                                                                              
  lastHeartbeat DateTime                                                                                                                              
  shardCount    Int      @default(1)                                                                                                                  
  guildCount    Int      @default(0)                                                                                                                  
  status        String   @default("unknown") @db.VarChar(16)                                                                                          
  version       String?  @db.VarChar(32)                                                                                                              
  updatedAt     DateTime @updatedAt                                                                                                                   
  }                                                                                                                                                   
  ```                                                                                                                                                 
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Critical Files to Modify                                                                                                                         
                                                                                                                                                      
  | File | Changes |                                                                                                                                  
  |------|---------|                                                                                                                                  
  | `api/src/server.ts` | Add dashboard routes, CORS for dashboard origin |                                                                           
  | `api/src/middleware/dashboardAuth.ts` | New: JWT validation + guild access check |                                                                
  | `api/src/routes/dashboard-auth.ts` | New: OAuth + token endpoints |                                                                               
  | `api/src/routes/dashboard.ts` | New: Guild/tracking read endpoints |                                                                              
  | `api/src/services/jwtService.ts` | New: JWT sign/verify/refresh |                                                                                 
  | `api/src/services/discordOAuth.ts` | New: Discord OAuth helpers |                                                                                 
  | `shared/prisma/schema.prisma` | Add 3 new models |                                                                                                
  | `bot/src/lib/healthBeacon.ts` | New: 30s heartbeat to BotHealth table |                                                                           
  | `bot/src/index.ts` | Start health beacon on ready |                                                                                               
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Phased Roadmap                                                                                                                                   
                                                                                                                                                      
  ### Phase 0: API Foundation                                                                                                                         
  **Goal**: Add dashboard API endpoints to existing API server                                                                                        
                                                                                                                                                      
  1. Add Prisma models (DashboardSession, AuditLog, BotHealth)                                                                                        
  2. Run migration                                                                                                                                    
  3. Create JWT middleware and services                                                                                                               
  4. Create Discord OAuth service                                                                                                                     
  5. Add auth endpoints (`/api/v1/auth/*`)                                                                                                            
  6. Add read-only guild endpoints (`/api/v1/guilds/*`)                                                                                               
  7. Add bot health beacon                                                                                                                            
  8. Update CORS config                                                                                                                               
  9. Write integration tests                                                                                                                          
                                                                                                                                                      
  ### Phase 1: Dashboard MVP                                                                                                                          
  **Goal**: Functional Next.js dashboard with read-only views                                                                                         
                                                                                                                                                      
  1. Create `tracking-dashboard` repository                                                                                                           
  2. Set up Next.js 14 with App Router                                                                                                                
  3. Implement Discord OAuth flow                                                                                                                     
  4. Build pages: login, tenant list, guild details, tracking                                                                                         
  5. Add legal pages (terms, privacy)                                                                                                                 
  6. Deploy to Vercel                                                                                                                                 
  7. Configure production env vars                                                                                                                    
                                                                                                                                                      
  ### Phase 2: Enhanced Features                                                                                                                      
  **Goal**: Write operations and real-time updates                                                                                                    
                                                                                                                                                      
  1. Add guild settings edit endpoint + UI                                                                                                            
  2. Add audit log endpoint + UI                                                                                                                      
  3. Add export management UI                                                                                                                         
  4. Implement SSE for real-time status                                                                                                               
  5. Add caching with React Query                                                                                                                     
                                                                                                                                                      
  ### Phase 3: SaaS Hardening                                                                                                                         
  **Goal**: Production-ready multi-tenant SaaS                                                                                                        
                                                                                                                                                      
  1. Per-tenant rate limiting                                                                                                                         
  2. Subscription tier schema + enforcement                                                                                                           
  3. Usage metering hooks                                                                                                                             
  4. Security audit                                                                                                                                   
  5. Load testing                                                                                                                                     
  6. Monitoring dashboards                                                                                                                            
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Security Controls Checklist                                                                                                                      
                                                                                                                                                      
  - [ ] JWT secret: 64+ bytes, rotated quarterly                                                                                                      
  - [ ] Access tokens: 15min expiry                                                                                                                   
  - [ ] Refresh tokens: 30 days, stored hashed, revocable                                                                                             
  - [ ] CORS: Strict allowlist (dashboard origin only)                                                                                                
  - [ ] Rate limiting: 60 req/min per user, 10 auth attempts/15min per IP                                                                             
  - [ ] Tenant isolation: clientId in JWT, validated in middleware, double-checked in queries                                                         
  - [ ] Audit logging: All config changes logged with actor, timestamp, source                                                                        
  - [ ] Input validation: Zod schemas on all endpoints                                                                                                
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Environment Variables (New)                                                                                                                      
                                                                                                                                                      
  ```bash                                                                                                                                             
  # Dashboard API                                                                                                                                     
  JWT_SECRET=<64-byte-random>                                                                                                                         
  DASHBOARD_URL=https://dashboard.example.com                                                                                                         
  DASHBOARD_DISCORD_CLIENT_ID=<separate-oauth-app>                                                                                                    
  DASHBOARD_DISCORD_CLIENT_SECRET=<secret>                                                                                                            
  DASHBOARD_OAUTH_CALLBACK=https://api.example.com/api/v1/auth/discord/callback                                                                       
  CORS_ALLOWED_ORIGINS=https://dashboard.example.com                                                                                                  
  ```                                                                                                                                                 
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Risk Mitigations                                                                                                                                 
                                                                                                                                                      
  | Risk | Mitigation |                                                                                                                               
  |------|------------|                                                                                                                               
  | Cross-tenant data leak | JWT contains clientId, middleware validates, queries double-check |                                                      
  | JWT compromise | Short expiry (15min), refresh rotation, revocation support |                                                                     
  | Dashboard DDoS | Vercel edge caching, per-user rate limits, CloudFlare |                                                                          
  | API unavailable | Dashboard shows cached data with "stale" indicator |                                                                            
  | Type drift between repos | Generate types from OpenAPI spec at build time |                                                                       
                                                                                                                                                      
  ---                                                                                                                                                 
                                                                                                                                                      
  ## Verification Plan                                                                                                                                
                                                                                                                                                      
  1. **Unit tests**: JWT service, OAuth service, auth middleware                                                                                      
  2. **Integration tests**: Full auth flow, tenant isolation (verify user A can't access guild B)                                                     
  3. **Manual testing**:                                                                                                                              
  - Login via Discord OAuth                                                                                                                           
  - View guild list (only shows guilds user is member of)                                                                                             
  - View guild details, tracking data                                                                                                                 
  - Verify bot status shows correctly when bot is up/down                                                                                             
  4. **Security testing**:                                                                                                                            
  - Attempt cross-tenant access with modified JWT                                                                                                     
  - Rate limit verification                                                                                                                           
  - CORS rejection from unauthorized origins                                                                  