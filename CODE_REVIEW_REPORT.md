# Grace by Faith — Full Code Review Report
**Date:** March 21, 2026
**Scope:** Complete end-to-end review of the Grace by Faith SDA hub application

---

## 1. Architecture Overview

### Stack
- **Frontend:** React Native (Expo SDK), Expo Router (file-based routing), TanStack React Query, React Native Reanimated
- **Backend:** Node.js, Express, TypeScript, Drizzle ORM
- **Database:** PostgreSQL
- **External Services:** OpenAI (AI study tools), ElevenLabs (TTS), LiveKit (streaming rooms)
- **Internationalization:** i18next / react-i18next with 6 locales (en, es, fr, pt, zh, fil)

### Structure
```
app/                  # 80+ screens via Expo Router file-based routing
  (tabs)/             # Main tab navigation (Home, Explore, Read, Study, Kids, Profile, etc.)
  (auth)/             # Login and registration
  kids/               # Kids Mode dedicated screens
  read/               # Bible reader with dynamic book/chapter routing
components/           # ~30 reusable components
contexts/             # AuthContext, AudioContext, KidsModeContext, ProContext, etc.
hooks/                # Custom hooks (useBibleAudio, useTheme, etc.)
lib/                  # Utilities (query-client, i18n, notifications, analytics)
server/               # Express backend
  routes/             # 15 route modules
  services/           # AI engine, LiveKit, content engine, cache warmup
  middleware/         # Auth, rate limiting, response caching
shared/               # Shared schema (1,766 lines, ~60 tables)
data/                 # Static data (translations, topics, music)
scripts/              # Seed scripts, security regression, deploy build
```

### Architectural Concerns
1. **study.tsx is 5,324 lines** — This is the single largest file in the codebase and combines what should be 15+ separate components/screens into one monolithic file. This is the biggest structural problem in the codebase.
2. **kids/story/[id].tsx is 3,173 lines** — Similar monolith problem.
3. **Schema at 1,766 lines / ~60 tables in a single file** — Manageable but approaching the point where it should be split into domains.
4. **No migration files exist** — The project uses `db:push` only, which means there's no versioned migration history. This is fine for development but risky for production schema changes.
5. **Server routes are well-modularized** — 15 separate route files, largest being kids.ts at 1,281 lines.

### Technical Debt
- The monolithic screen files (study.tsx, story/[id].tsx, family.tsx at 1,740 lines) will become increasingly difficult to maintain and debug.
- Heavy reliance on JSONB columns means some data is opaque to SQL-level queries and constraints.

---

## 2. Security Audit

### Authentication & Authorization ✅ Mostly Solid
- JWT-based auth with 90-day expiration using bcryptjs (10 rounds).
- `requireAuth`, `optionalAuth`, `requireRole`, `requireEditor`, `requireAdmin`, `requirePipelineAccess` middleware properly layered.
- Guest users supported via `X-Device-Id` header with device UUID validation.
- Organization endpoints (9 total) all properly require auth — verified by 45-check security regression script.

### Environment & Secrets ✅ Good
- `server/env.ts` uses Zod validation — no hardcoded fallback secrets.
- Production safety: blocks `RUN_STARTUP_SEEDS=true` and `ALLOW_INSECURE_PASSWORD_RESET=true` in production with `process.exit(1)`.
- JWT_SECRET requires minimum 16 characters.
- API keys are optional (graceful degradation when missing).

### Rate Limiting ✅ Present
- `aiGenerationLimiter`: 10 req/min per user for AI endpoints
- `ttsLimiter`: 15 req/min per user for TTS
- `authLimiter`: 20 req/15min per IP for login/register
- All use user-based keying when authenticated, IP fallback for anonymous.

### CORS ✅ Properly Configured
- Whitelist-based CORS using `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` environment variables.
- Localhost allowed only in development mode.
- Credentials enabled. Correct headers allowed (Content-Type, Authorization, X-Device-Id, X-Content-Language).

### Issues Found

**MEDIUM — No `helmet` middleware:**
The server does not use `helmet` or set security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.). While Replit's proxy adds some of these, the application should set them explicitly.

**MEDIUM — `/api/search/recent` leaks global search terms:**
`server/routes/search.ts` line 151+ returns the 10 most recent entries from the global `searchCache` table to any requester. This exposes what other users have searched for. Should be filtered to the requesting user's own searches only.

**LOW — User content routes use `/:userId` parameter that is ignored:**
`server/routes/user.ts` routes like `/api/notes/:userId`, `/api/highlights/:userId`, `/api/bookmarks/:userId` accept a `:userId` parameter but internally use `getEffectiveUserId(req)`. The parameter is misleading and could lead to IDOR bugs if a future developer assumes it's used.

**LOW — Missing input length validation on organization names:**
`server/routes/organizations.ts` checks for presence of `name` but doesn't enforce maximum length, allowing arbitrarily long strings.

**LOW — No CSRF protection:**
JWT-based auth doesn't need traditional CSRF tokens, but the `Access-Control-Allow-Credentials: true` header means cookie-based attacks could theoretically be crafted if cookies are ever added.

### No Issues Found
- No hardcoded API keys or secrets in the codebase.
- SQL injection risk is minimal — Drizzle ORM parameterizes queries. Raw `sql` template tags are used safely.
- No XSS risk from user-generated content (React Native doesn't use `dangerouslySetInnerHTML`; seed scripts contain HTML but are admin-only).
- Password hashing is bcrypt with adequate rounds.

---

## 3. Database & Data Layer

### Schema Quality
- **~60 tables** covering users, organizations, Bible content, study tools, devotionals, kids content, community features, formation system, Sabbath school, and resources.
- **27 unique indexes** defined for data integrity (composite indexes on user+feature, org+user, translation+book+chapter+verse, etc.).
- **UUID primary keys** used consistently across all tables via `gen_random_uuid()`.
- **Timestamps** (`createdAt`, `updatedAt`) present on most tables.

### Issues Found

**HIGH — Very few foreign key constraints:**
Only 1 explicit `references()` found in the entire schema. Most relationships are logical (matching varchar IDs) but not enforced at the database level. This means:
- Orphaned records can exist (e.g., organization_members referencing deleted organizations)
- Cascading deletes are not handled by the database
- Data integrity depends entirely on application code

**MEDIUM — No migration history:**
The `drizzle/` directory is empty — no SQL migration files exist. The project uses `db:push` exclusively. This means:
- No way to roll back schema changes in production
- No audit trail of schema evolution
- Risk of data loss if `db:push` generates destructive ALTER statements

**MEDIUM — Missing indexes for common query patterns:**
While 27 unique indexes exist for integrity, performance-oriented indexes appear sparse. Likely missing:
- `reading_history` by `userId` + `readAt` (for streak calculations)
- `user_note`, `user_highlight`, `user_bookmark` by `userId` (for profile data fetching)
- `prayer_requests` or `prayers` by `userId` (for prayer journal)
- `resources` queries use multiple filter columns but index coverage isn't visible

**LOW — Large JSONB usage:**
Tables like `resources`, `devotional_day`, `formation_lesson`, `context_card` store complex structured data in JSONB columns. This is fine for flexibility but makes it impossible to index or query individual fields efficiently.

### N+1 Query Risks
No obvious N+1 patterns found. The API routes generally make single queries or use joins. The organization members list does a single query with proper filtering.

---

## 4. Backend API Quality

### Consistency ✅ Good
- All routes use consistent `{ error: "message" }` format for errors.
- HTTP status codes used correctly (200, 201, 400, 401, 403, 404, 500).
- Most routes use try-catch with 500 fallback and server-side logging.

### Validation
- Zod schemas used for auth routes (`authRegisterSchema`, `authLoginSchema`).
- Zod schemas used for user content (`noteSchema`, `highlightSchema`, `bookmarkSchema`, `prayerSchema`).
- Organization creation validates `name` and `type` presence.
- AI endpoints validate required fields (verse references, topics, etc.).

### Issues Found

**MEDIUM — Inconsistent validation approach:**
Some routes use Zod schemas (auth, user content), while others do manual `if (!req.body.name)` checks (organizations, resources). Should standardize on Zod throughout.

**LOW — `/api/auth/me` doesn't use middleware:**
The `/api/auth/me` endpoint manually calls `getAuthUserId(req)` instead of using `requireAuth` middleware. Functionally identical but inconsistent with other protected routes.

**LOW — Some 500 errors leak implementation details:**
Several catch blocks return the raw error message: `res.status(500).json({ error: String(err) })`. In production, this could expose internal details. Should return generic messages and log the full error server-side.

### Performance
- Response caching middleware exists (`server/middleware/response-cache.ts`).
- AI endpoints use a concurrency semaphore to prevent overloading.
- `fetchWithTimeout` utility wraps all outbound calls (OpenAI: 30s, ElevenLabs: 20s, External: 10s).
- TTS results are LRU-cached server-side.

---

## 5. Frontend Code Quality

### Component Structure
- **80+ screens** in the `app/` directory with proper file-based routing.
- **~30 reusable components** in `components/` directory.
- Design system components exist (`ui/Button`, `ui/Card`, `ui/Badge`, `ui/Chip`, `ui/ListItem`, `ui/Skeleton`).

### Issues Found

**HIGH — Monolithic screen files:**
| File | Lines | Concern |
|:---|:---|:---|
| `app/(tabs)/study.tsx` | 5,324 | Should be 15+ components |
| `app/kids/story/[id].tsx` | 3,173 | Should be 8+ components |
| `app/(tabs)/family.tsx` | 1,740 | Should be 6+ components |
| `app/prophecy-explorer.tsx` | 1,603 | Should be 5+ components |
| `app/resource-detail.tsx` | 1,514 | Should be 5+ components |
| `app/(tabs)/index.tsx` | 1,487 | Should be 4+ components |

**MEDIUM — `any` type usage:**
- **~97 instances** of `: any` across frontend files (app/ directory).
- **~63 instances** of `: any` across backend files (server/ directory).
- Heaviest offenders: `app/resource-detail.tsx` (23), `app/admin-review.tsx` (24), `server/services/ai-engine.ts` (17), `app/kids/story/[id].tsx` (15).

**MEDIUM — Audio cleanup on unmount:**
`hooks/useBibleAudio.ts` sets `mountedRef = false` on unmount but does not explicitly call `cleanupPlayer()` or `handleStop()`. This can cause:
- Audio continuing after navigating away
- Memory leaks from unreleased audio resources
- "Ghost audio" playback

**MEDIUM — Kids scene audio cleanup:**
`components/kids/LivingScene.tsx` and `CinematicScene.tsx` use `setTimeout` to clean up audio players. If the component unmounts before the timeout fires, the player may not be properly released.

**LOW — console.log statements in production code:**
- `app/kids/story/[id].tsx`: 14 console.log statements
- `server/` total: ~104 console.log statements across all files (many are legitimate logging, but seed files have ~35 debug logs)

### State Management ✅ Well Architected
- React Query is properly configured with `staleTime: 24h`, `gcTime: 7 days`, and AsyncStorage persistence.
- Custom throttling (2000ms) prevents excessive AsyncStorage writes.
- Global auth token integration via `setAuthTokenGetter` avoids circular dependencies.
- Context providers properly layered (QueryClient > Auth > Theme > Audio > Kids).

### React Query Usage ✅ Correct
- Object API used consistently (`{ queryKey, queryFn }` or default fetcher).
- Mutations use `apiRequest` and invalidate caches by queryKey.
- `removeQueries` used after org mutations to ensure fresh data.
- Stale time configured per-query where appropriate (0 for user-specific, 24h for content).

### testID Coverage ✅ Present
testID attributes found across 30 screens — reasonable coverage for automated testing.

---

## 6. Feature Completeness Audit

| Feature | Status | Notes |
|:---|:---|:---|
| **Bible Reader** | ✅ Complete | Multi-translation support, chapter navigation, verse actions, highlights, notes, bookmarks. KJV default with fallback. |
| **Sabbath Experience** | ✅ Complete | Time-aware UI with `SabbathBanner`, `SabbathOverlay`, Sabbath reflections (read/write). |
| **Kids Club** | ✅ Complete | Story player with cinematic/living scenes, interactive choices, star rewards system, Kids Sabbath School, parent controls, shop. |
| **Family Altar** | ✅ Complete | Family dashboard, family heatmap, family worship launcher, `FamilyWorshipLauncher` component (685 lines). |
| **Prayer** | ✅ Complete | Prayer journal (CRUD), prayer wall component, prayer groups with join codes, group announcements. |
| **Word Study** | ✅ Complete | Strong's Concordance integration, AI-powered word analysis. |
| **Historical Voices** | ✅ Complete | `app/historic-voices.tsx` screen with speaker profiles and content. |
| **Context Tool** | ✅ Complete | `app/passage-context.tsx` and `ContextPanel` component for historical/literary context. |
| **Verse Map** | ✅ Complete | `app/verse-map.tsx` for visual/thematic verse connections. |
| **Insight/Deep Study** | ✅ Complete | `app/study-guide.tsx` (1,189 lines) with AI-powered interactive study sessions. |
| **Devotional Plans** | ✅ Complete | Plan enrollment, daily content, progress tracking, custom plan creation. |
| **Connect Tab** | ✅ Complete | `app/(tabs)/connect.tsx` with community features, broadcasts, church connect. |
| **LiveKit Streaming** | ⚠️ Partial | Backend infrastructure exists (`server/services/livekit.ts`), stream creation/token endpoints in `community.ts`, `app/stream/[id].tsx` (360 lines). Frontend does not import LiveKit SDK — no `livekit` import found in `app/` directory. Room UI may be a WebView wrapper or incomplete native integration. |
| **Organization/Church Accounts** | ✅ Complete | Full CRUD: create church/conference, join via code, member management (promote/remove), conference child churches, 45 security checks passing. |
| **Multilingual Support** | ⚠️ Partial | i18n infrastructure in place (i18next, 6 locale files: en, es, fr, pt, zh, fil). Only ~12 screens actually import `useTranslation`. Content is primarily English. Bible translations support multiple languages via database. |
| **TTS Audio** | ✅ Complete | ElevenLabs integration with 2 narrators (George, Sarah). Sophisticated fallback to device-native `expo-speech` after 3 retries. LRU server-side caching. |
| **Notifications** | ⚠️ Partial | `lib/notifications.ts` exists with push notification registration. No visible notification triggers in backend routes (no push sending logic). |
| **User Profile & Settings** | ✅ Complete | Profile with org info, reading streaks, settings preferences (language, translation, narrator, theme). Admin dashboard link for admin users. |
| **Prophecy Hub** | ✅ Complete | `app/prophecy-hub.tsx` and `app/prophecy-explorer.tsx` (1,603 lines) with prophecy links and timelines. |
| **Semantic Search** | ✅ Complete | `app/semantic-search.tsx` with AI-powered thematic Bible search. |
| **Great Controversy** | ✅ Complete | `app/great-controversy.tsx` (1,077 lines) dedicated experience. |
| **Maps & Timeline** | ✅ Complete | `app/maps-timeline.tsx` with locations and timeline events linked to scripture. |
| **Formation System** | ✅ Complete | Full LMS with tracks, modules, lessons, assessments, progress tracking, i18n support. |
| **Resource Library** | ✅ Complete | Browseable library with categories, bookmarks, progress tracking, admin pipeline for AI-generated content. |
| **Music** | ✅ Complete | `app/music.tsx` (328 lines) with audio playback. |
| **Growth Map** | ✅ Complete | `app/growth-map.tsx` with spiritual progress visualization. |

---

## 7. Performance & Scalability

### Bundle Size Concerns
- **80+ screen files** will impact initial bundle, though Expo Router provides automatic code splitting for native.
- **5,324-line study.tsx** — Even with code splitting, this single screen loads a massive component tree. Performance impact on lower-end devices.
- **Static data files** in `data/` directory (Bible topics, music, translations) are bundled with the app.

### API Response Times
- OpenAI calls have 30-second timeout — AI features can be slow but have proper loading states.
- ElevenLabs TTS has 20-second timeout — reasonable for audio generation.
- Database queries use Drizzle ORM with no obvious slow query patterns.
- Response caching middleware helps with repeated requests.

### Scalability Concerns

**HIGH — In-memory caching won't scale horizontally:**
If the app is deployed behind a load balancer with multiple server instances, in-memory caches (LRU for TTS, any other in-memory state) won't be shared across instances. Would need Redis or similar for multi-instance deployment.

**MEDIUM — Missing database indexes:**
As noted in Section 3, common query patterns on user-specific data lack explicit indexes. With hundreds of users, queries on `reading_history`, `user_note`, `user_highlight`, etc. will slow down without proper indexing.

**MEDIUM — No pagination on some list endpoints:**
Organization members list, prayer requests, and some resource listings don't appear to have pagination. These will degrade with scale.

**LOW — AI concurrency semaphore is per-process:**
The `withAIConcurrency` semaphore limits concurrent AI calls per server process but won't help with multi-instance deployments.

### Caching Strategy ✅ Reasonable
- React Query client-side: 24h staleTime, 7d gcTime with AsyncStorage persistence.
- Server-side: Response caching middleware, LRU cache for TTS, 2-minute cache for resource listings.
- No-cache headers on user-specific endpoints (organizations, auth) to prevent stale data.
- ETag disabled for user-specific routes (prevents 304 bugs in production).

---

## 8. Code Consistency & Standards

### TypeScript Usage
- **~160 instances of `: any`** across the codebase (97 frontend + 63 backend).
- Type safety is generally good for core flows (auth, database queries, API responses).
- AI engine has the most `: any` usage (17) due to dynamic OpenAI response parsing.
- Zod schemas provide runtime type validation on critical paths.

### Naming Conventions ✅ Consistent
- **Files:** kebab-case for routes and components, PascalCase for component names.
- **Variables/functions:** camelCase throughout.
- **Database columns:** camelCase in Drizzle schema, mapping to snake_case in PostgreSQL.
- **API endpoints:** RESTful `/api/resource/action` pattern consistently.

### Dead Code
- **Seed files** (`server/seed-beliefs-wave1.ts` through `wave4.ts`, `seed-plans.ts`, `seed-books.ts`, etc.) contain console.log statements and are only run conditionally. These are not dead code but could be moved to a separate `scripts/seeds/` directory.
- No obviously unused screen files found — all are referenced via Expo Router's file-based routing.

### Console.log in Production
| Area | Count | Assessment |
|:---|:---|:---|
| Server routes | ~30 | Legitimate logging (errors, status) |
| Server services | ~40 | Mix of debug and operational |
| Server seeds | ~35 | Debug only, acceptable (seeds don't run in production) |
| Frontend app/ | ~16 | Should be removed (kids story has 14 alone) |
| Frontend components/ | ~2 | Acceptable |

**Recommendation:** Remove the 14 console.log statements from `app/kids/story/[id].tsx` and the ~2 from components.

### Commented-Out Code
No significant blocks of commented-out code found during review.

---

## 9. Third-Party Integrations

### OpenAI ✅ Well Integrated
- **Centralized** in `server/services/ai-engine.ts` (1,717 lines).
- **Error handling:** Try-catch with JSON parse recovery, fallback strings for study guide.
- **Cost control:** AI concurrency semaphore, rate limiting (10 req/min), timeout (30s).
- **Prompt quality:** Structured prompts with system messages, SDA theological context, and output format instructions.

### ElevenLabs TTS ✅ Well Integrated
- **Two narrators:** George (`JBFqnCBsd6RMkjVDRZzb`) and Sarah (`EXAVITQu4vr4xnSDxMaL`).
- **Error handling:** 20s timeout, status check, server-side logging.
- **Fallback:** Client-side falls back to `expo-speech` native TTS after 3 failed retries. This is excellent resilience design.
- **Performance:** Server-side LRU cache for generated audio.

### LiveKit ⚠️ Partially Complete
- **Backend:** Room creation, token generation, participant count API all implemented in `server/services/livekit.ts`.
- **Error handling:** "Already exists" handled gracefully, participant count returns 0 on failure.
- **Frontend:** `app/stream/[id].tsx` exists (360 lines) but no LiveKit client SDK imports found in the frontend. The streaming UI may be using a WebView approach or is incomplete for native integration.

### Bible Content ✅ Self-Contained
- Bible text served from local PostgreSQL — **no external Bible API dependency**.
- Imported via seed scripts (`scripts/import-kjv.ts`, `scripts/import-translations.ts`).
- Translation fallback to KJV when requested translation unavailable.

### Infrastructure Utilities ✅ Good
- `server/services/api-client.ts` provides centralized `fetchWithTimeout` with:
  - Configurable timeouts per service type
  - Request/response logging with duration tracking
  - AbortController support for clean cancellation
  - Sanitized URL logging (no credentials exposed)

---

## 10. Critical Issues & Priority Recommendations

### Critical (Must Fix Before Beta)

1. **`/api/search/recent` privacy leak** — Returns global search terms from all users. Filter to requesting user only or remove the endpoint.
   - File: `server/routes/search.ts`, line 151+
   - Effort: 15 minutes

2. **Audio cleanup on unmount** — `useBibleAudio` hook doesn't stop audio when component unmounts, causing "ghost audio" and memory leaks.
   - File: `hooks/useBibleAudio.ts`
   - Effort: 30 minutes

3. **Add foreign key constraints** — At minimum, add ON DELETE CASCADE for `organization_members → organizations`, `prayer_group_member → prayer_groups`, `user_plan_enrollment → devotional_plan`, and other junction tables.
   - File: `shared/schema.ts`
   - Effort: 2-3 hours (plus careful migration testing)

### High Priority

4. **Add `helmet` security middleware** — Standard Express security headers.
   - File: `server/index.ts`
   - Effort: 15 minutes

5. **Split study.tsx (5,324 lines)** — Break into separate components/screens. This is the biggest maintainability risk.
   - File: `app/(tabs)/study.tsx`
   - Effort: 4-6 hours

6. **Add database indexes for user-specific queries** — `reading_history(userId)`, `user_note(userId)`, `user_highlight(userId)`, `user_bookmark(userId)`.
   - File: `shared/schema.ts`
   - Effort: 1 hour

7. **Create migration history** — Set up `drizzle-kit generate` to create versioned SQL migrations instead of using `db:push` only.
   - Effort: 1-2 hours

8. **Reduce `: any` usage** — Prioritize `ai-engine.ts` (17), `resource-detail.tsx` (23), `admin-review.tsx` (24), `kids/story/[id].tsx` (15).
   - Effort: 3-4 hours

### Nice to Have

9. **Complete LiveKit frontend integration** — Add native LiveKit SDK or confirm WebView approach is intentional.
   - Effort: 4-8 hours

10. **Expand i18n coverage** — Only ~12 of 80+ screens use `useTranslation`. Either commit to full i18n or document which screens are translated.
    - Effort: 8-16 hours

11. **Add push notification triggers** — `lib/notifications.ts` handles registration but no backend logic sends notifications.
    - Effort: 4-8 hours

12. **Remove console.log from kids story** — 14 debug statements in production code.
    - File: `app/kids/story/[id].tsx`
    - Effort: 10 minutes

13. **Split kids/story/[id].tsx (3,173 lines)** — Second-largest monolith file.
    - Effort: 3-4 hours

14. **Standardize validation on Zod** — Replace manual `if (!req.body.field)` checks with Zod schemas.
    - Effort: 2-3 hours

15. **Add pagination to list endpoints** — Organization members, prayer requests, resource listings.
    - Effort: 2-3 hours

### Recommended Priority Order
1. Search privacy fix (#1) — 15 min, critical security
2. Helmet middleware (#4) — 15 min, security hardening
3. Audio cleanup (#2) — 30 min, user-facing bug
4. Console.log cleanup (#12) — 10 min, quick win
5. Database indexes (#6) — 1 hour, performance
6. Foreign key constraints (#3) — 2-3 hours, data integrity
7. Migration history (#7) — 1-2 hours, operational safety
8. Split study.tsx (#5) — 4-6 hours, maintainability
9. Type safety improvements (#8) — 3-4 hours, code quality
10. Everything else based on product priorities

---

## Summary

Grace by Faith is a feature-rich, well-structured application with **25+ major features** in complete or near-complete state. The architecture is sound — clean separation between frontend and backend, proper auth with role-based access control, good error handling patterns, and thoughtful resilience design (especially the TTS fallback chain).

The biggest risks are:
1. **Data integrity** — Missing foreign key constraints could cause orphaned data
2. **Maintainability** — A few monolithic files (especially study.tsx at 5,300+ lines) will become pain points
3. **One privacy bug** — The search recent endpoint leaks cross-user data

The codebase is in good shape for a beta launch. The critical items above (search privacy, audio cleanup, helmet) can be addressed in a single day. The high-priority items (indexes, foreign keys, file splitting) should be tackled before a public launch but are not blockers for a controlled beta.
