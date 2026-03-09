# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed to be the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. Its core purpose is to provide an immersive study experience, featuring a unique "4-Layer Study Model" powered by AI, offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture. The frontend uses Expo (React Native), the backend uses Express.js, and PostgreSQL with Drizzle ORM handles data persistence. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`. All devotional content is presented without tradition-based filtering, specifically designed for Seventh-day Adventists.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, a scene-based story viewer with Ken Burns effect, sentence-level text highlighting, auto-play, mood-based animated particle overlays, tap-to-interact animations, an optional Cinema Mode for synchronized video shorts, and ElevenLabs narrator voice selection.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content, supporting three study depth levels.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, including a Socratic AI Study Guide (with progression engine) and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs (`eleven_turbo_v2_5` model) for high-quality voices, with fallback to `expo-speech` device voices for offline use.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history, and a unified "My Library" screen.
- **Semantic Search:** AI-powered natural language Bible search, including user's notes/highlights/bookmarks.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle.
- **Sabbath Experience Mode:** Time-phased Sabbath environment with four distinct phases.
- **Church Connect:** A global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`, with content translation architecture.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Supporter/Mission System:** Mission-driven donation model replacing traditional paywall, with specific language and trigger conditions.
- **Small Groups 2.0:** Enhanced system for SDA small groups.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with a horizontal timeline and contextual tooltip panels.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Verse Action Tools:** Bottom-sheet verse tools for various interactions.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Feedback Widget:** Home screen card for submitting feedback, stored in a `user_feedback` table.
- **Guest User Identity:** Unauthenticated requests use a shared "guest" userId on the server; per-device UUIDs for client-side cache isolation.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Belief cards with animated chevrons, scripture navigation, and authority hierarchy.
- **Great Controversy Timeline Engine:** An immersive vertical timeline tracing the cosmic conflict.
- **Shared Scripture Navigation:** Centralized helper for parsing scripture references and navigating to the Bible reader.
- **UI Primitive System:** Standardized reusable UI components for consistency.
- **Shared Layout Components:** Reusable `SectionHeader`, `AnimatedSection`, and `ScreenHeader`.
- **Component Structure:** Screens are decomposed into modular components.
- **Onboarding:** 4-screen onboarding flow.
- **Today's Path:** Daily guidance section on home screen.
- **ContinueCard:** Context-aware "continue" card for recent user activity.
- **Analytics System:** Lightweight event tracking with offline queue.
- **Crash Reporting:** `ErrorBoundary` reports crashes to backend.
- **Empty State Polish:** Consolidated empty states using a shared `EmptyState` component.
- **Kids Mode Improvements:** Story animation fallbacks, micro animations, age-adaptive Kids Sabbath School lessons, and progress visualization.
- **Resume System:** `useResumeJourney` hook aggregates progress from 8 sources and `ContinueCard` displays the highest-priority resumable item.
- **Content Engine & Resources Library:** Centralized SDA content generation and distribution system:
  - `server/services/content-engine.ts` — AI-powered generation functions: `generateSabbathSchoolCompanion`, `generateTopicalStudy`, `generateFamilyWorshipPlan`. All enforce SDA doctrinal guardrails and output structured JSON.
  - `resources` table — central catalog with slug-based access, tier-based gating (free/pro), status workflow (draft/review/published), sourceRef linking to originating content.
  - `resource_progress` / `resource_bookmarks` — per-user engagement tracking.
  - `server/routes/resources.ts` — full CRUD API: list (paginated, filterable, cached), detail with pro-gating (teasers for non-pro users), progress tracking, bookmarks, generation triggers.
  - Auto-generation: Sabbath School sync triggers companion generation for new/updated lessons (async, non-blocking).
  - Resource types: sabbath-school-companion, family-worship, study-guide, devotional-series, topical-study.
  - Categories: sabbath-school, family, prophecy, doctrine, spiritual-growth, kids.
  - Frontend: `app/resources.tsx` (library with search/filter) and `app/resource-detail.tsx` (reader with type-specific rendering, progress, bookmarks, pro-gate).
  - UX: Featured gradient entry card on Explore screen, resource cards with colored accent strips + type icons + explicit Free/Supporter tier badges, enhanced pro gate upsell with benefit list.
  - Content renderers fully aligned with AI output schemas: sabbath-school companions (dayTitle/focusText/studyPrompt/keyInsight, structured memoryVerseGuide/egwConnections/familyWorshipAdaptation), topical studies (structured scriptureFoundation/applicationQuestions/sdaContext/furtherStudy), family worship (structured reading/activity/questions/songSuggestion + introduction/closingThought).
  - Publish authorization: requires isPro (stopgap until admin role is added).

## External Dependencies

**Core:**
- **OpenAI API:** For AI content generation (`gpt-4o-mini`).
- **PostgreSQL:** Primary database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework, navigation, icons, speech, audio/video, and localization.
- **AsyncStorage:** Client-side data persistence and offline caching.
- **i18next + react-i18next:** UI internationalization.
- **ElevenLabs API:** For high-quality Text-to-Speech.

**External Content Sources:**
- **egwwritings.org:** External source for Ellen G. White's writings.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides public domain commentaries.
- **Adventech/sabbath-school-lessons (GitHub):** Open-source quarterly content for Sabbath School.

**Authentication & Security:**
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.
- **LiveKit Cloud:** Real-time video/audio conferencing.
- **react-native-webview:** Loads LiveKit room HTML on native.

**Maps & Location:**
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.

**Resume System:**
- `useResumeJourney` hook aggregates progress from 8 sources.
- `ContinueCard` displays the highest-priority resumable item.

## Security & Deploy Configuration

**Guest Persistence Policy:**
- **Blocked (401):** Notes, highlights, bookmarks, prayers, donations, trial, mission-invite dismiss, account deletion, family dashboard, community writes.
- **Guest fallback:** Reading history, progress, pro-status (returns defaults). Uses shared "guest" userId.
- **Public reads (no auth):** Books, passages, tracks, streams, sabbath school, devotionals, kids collections, churches, feedback, health.

**Pro-Gated Endpoints (requireAuth + checkProStatus):**
- Family Dashboard: stats, heatmap, children, prayers, conversation starters, dinner topics.
- Chapter Context: `/api/chapter-context/:bookId/:chapter`.

**Deploy Environment Checklist:**
- `DATABASE_URL` — required
- `JWT_SECRET` — required, minimum 32 chars recommended
- `RUN_STARTUP_SEEDS` — must be "false" in production (hard-fail on startup if "true")
- `ALLOW_INSECURE_PASSWORD_RESET` — must be unset or "false" in production (hard-fail on startup if "true")
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` — required for AI features
- `ELEVENLABS_API_KEY` — required for TTS narration
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` — required for live streaming
- Startup logs print full security posture on boot for verification.
- **Security Regression Script:** `bash scripts/security-regression.sh` — 37-check automated suite covering protected writes (401), invalid tokens (401), pro-only endpoints (401/403), spoofed userId rejection, disabled password reset (501), guest auth/me behavior, health endpoint (200 + DB ok), public reads (200), and community write auth. **Run gates:** before deploy (automated in deploy-build.sh), after auth/pro route changes, after middleware changes, after guest persistence changes. Exits with code 1 on any failure. **Deploy gate:** deploy-build.sh boots a temporary server after server build + seeds, runs the regression suite, and blocks the deploy (`exit 1`) if any check fails.

## Observability & Performance

- **Structured Request Logging:** All API requests logged as `[req] METHOD PATH STATUS DURATIONms`. Slow requests flagged with `[SLOW]` prefix (>2s normal, >15s AI routes).
- **External API Timeout Protection:** OpenAI 30s, ElevenLabs 20s, external fetches 10s. Logged as `[api:ok]`/`[api:fail]`.
- **AI Concurrency Control:** Process-level semaphore (`server/services/ai-semaphore.ts`) limits simultaneous OpenAI calls to 5 concurrent + 10 queued. Beyond that, 503 rejection. Logs `[ai:queue]`/`[ai:reject]`. Applied to all OpenAI clients: ai-engine.ts, openai-tts.ts, audio client, study.ts EGW insight.
- **Response Cache:** In-memory TTL cache (`server/middleware/response-cache.ts`): `/api/books` (5min), `/api/tracks` (2min), `/api/devotionals/plans` (2min), `/api/kids/collections` (2min), `/api/churches` (5min), `/api/streams/active` (30s). Sets `X-Cache: HIT/MISS` header.
- **Health Endpoint:** `GET /api/health` — returns status, uptime, DB connectivity, error counts, AI semaphore stats, cache stats. 200 when healthy, 503 when degraded.
- **Error Categorization:** Global error handler categorizes errors (validation/auth/not_found/rate_limit/server) with `[error]` prefix.
- **Rate Limiting:** `aiGenerationLimiter` (10/min/user), `ttsLimiter` (15/min/user), `authLimiter` (20/15min/user).
- **Key files:** `server/index.ts`, `server/services/api-client.ts`, `server/services/ai-semaphore.ts`, `server/middleware/response-cache.ts`, `server/middleware/rate-limit.ts`, `server/routes.ts`.