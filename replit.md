# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed to be the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. Its core purpose is to provide an immersive study experience, featuring a unique "4-Layer Study Model" powered by AI, offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture. The frontend uses Expo (React Native), the backend uses Express.js, and PostgreSQL with Drizzle ORM handles data persistence. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`. All devotional content is presented without tradition-based filtering, specifically designed for Seventh-day Adventists.

**Backend Route Architecture:** Routes are modular, organized into domain-specific Express Router modules under `server/routes/` for features like authentication, user management, Bible study, devotionals, Kids Club, community, family dashboard, spiritual formation, and text-to-speech. Shared middleware for authentication, validation (using Zod), rate limiting, and content language resolution are located in `server/middleware/`.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, and larger touch targets, including a scene-based story viewer with Ken Burns effect, sentence-level text highlighting, auto-play, mood-based animated particle overlays, tap-to-interact animations, an optional Cinema Mode for synchronized video shorts, and ElevenLabs narrator voice selection.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content. Supports three study depth levels (Quick 5min / Standard 15min / Deep Dive 30min).
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, with all generated content cached in PostgreSQL. Features include a Socratic AI Study Guide (with progression engine) and Dynamic AI Reading Plans.
- **Inductive Study Progression Engine:** The Socratic Study Guide tracks real learning progress through Observe, Interpret, and Apply stages, requiring meaningful engagement for advancement.
- **Text-to-Speech (TTS):** Employs ElevenLabs (`eleven_turbo_v2_5` model) for high-quality voices, with fallback to `expo-speech` device voices when offline. Includes background audio playback with a persistent MiniPlayer.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history with streak tracking, and a unified "My Library" screen.
- **Semantic Search:** AI-powered natural language Bible search using OpenAI, also searching user's notes/highlights/bookmarks, with results cached.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle for lessons.
- **Sabbath Experience Mode:** Time-phased Sabbath environment with four distinct phases: Friday Evening, Sabbath Morning, Afternoon, and Closing.
- **Church Connect:** A global SDA church finder with geo-radius and text search capabilities.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines (Study, Prayer, Engage).
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`, with content translation architecture using overlay tables.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Supporter/Mission System:** Mission-driven donation model replacing traditional paywall. Family Dashboard and advanced features labeled as "Supporter Features." Donation popup uses spiritual, voluntary language ("You're Diving Deep," "Support the Mission"). Triggers only after meaningful engagement (study completion, devotional completion) with 7-day AsyncStorage cooldown. No "Upgrade," "Unlock," or "Subscribe" language anywhere.
- **Small Groups 2.0:** Enhanced system for SDA small groups with member roles, discussions, and announcements.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView with native permission handling.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with expandable/collapsible sections covering key prophecies and timelines. Features an interactive horizontal timeline bar with 8 tappable markers (605 BC to Future), contextual tooltip panels with fade+slide animation showing title/explanation/scripture, scroll-synced marker highlighting (debounced 80ms), auto-centering of active marker, 5-category color legend (Scripture/History/Prophecy/Belief/Hope), accessibility labels on all markers, and viewed-symbol tracking via AsyncStorage.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions (Prayer Life, Scripture, Service, Character, Wisdom) with 4 levels each, calculated from app data.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Verse Action Tools:** Bottom-sheet verse tools (Copy, Highlight, Bookmark, Words, Insight, Verse Map, Guided Study) navigate to standalone stack routes.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives and classic commentators.
- **Feedback Widget:** Home screen card ("Share Feedback") opens a modal with topic selection (Bug Report, Feature Request, Content, Other) and text input. Submits to `POST /api/feedback` which stores in `user_feedback` table with topic validation and 5000-char message cap.
- **Guest User Identity:** Unauthenticated requests use a shared "guest" userId on the server. Per-device UUIDs are generated client-side for cache isolation but are not sent to the server. Guest server-backed data (reading history, progress) is effectively anonymous and shared — meaningful personalization requires sign-in.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Belief cards feature animated chevron rotation, scripture navigation with verse-specific highlight, and authority hierarchy.
- **Great Controversy Timeline Engine:** An immersive vertical timeline tracing the cosmic conflict from Creation to the New Earth through 15 narrative nodes aligned with Adventist theology.
- **Shared Scripture Navigation:** Centralized helper for parsing scripture references and navigating to the Bible reader with verse highlighting.
- **UI Primitive System:** Standardized reusable UI components for consistent appearance across the app.
- **Shared Layout Components:** Reusable `SectionHeader`, `AnimatedSection`, and `ScreenHeader` for consistent UI elements.
- **Component Structure:** Screens are decomposed into modular components for better organization and reusability.
- **Onboarding:** 4-screen onboarding flow shown once, skippable.
- **Today's Path:** Daily guidance section on home screen showing actionable items with completion indicators.
- **ContinueCard:** Context-aware "continue" card that surfaces the most recent user activity.
- **Analytics System:** Lightweight event tracking with offline queue, tracking events like `onboarding_completed`, `prayer_journal_entry`, `prophecy_explorer_opened`.
- **Crash Reporting:** `ErrorBoundary` reports crashes to backend with stack traces.
- **Empty State Polish:** Consolidated empty states using a shared `EmptyState` component.
- **Kids Mode Improvements:** Includes story animation fallbacks, micro animations, age-adaptive Kids Sabbath School lessons, and progress visualization.

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
- **Environment Validation:** `server/env.ts` validates required env vars (DATABASE_URL, JWT_SECRET) on startup via Zod; server exits if missing.
- **Auth Middleware:** `server/middleware/auth.ts` exports `requireAuth`, `optionalAuth`, `getAuthUserId`, `getEffectiveUserId`, `checkProStatus`. All user-owned route writes use `requireAuth`; reads use `optionalAuth` + `getEffectiveUserId`. Client-supplied `userId` in body/query is ignored for authenticated requests.
- **Rate Limiting:** `server/middleware/rate-limit.ts` keys by authenticated JWT user ID or falls back to anonymous bucket. Auth limiter uses default IP-based keying.
- **Password Reset:** Disabled (returns 501) — no token/email verification exists. Frontend handles 501 gracefully.
- **Startup Seeds:** Guarded behind `RUN_STARTUP_SEEDS=true` env flag. Production does not seed on boot.
- **JWT_SECRET:** Required env secret, minimum 16 characters. No hardcoded fallback.

**Guest Persistence Policy:**
- **Blocked until sign-in (401):** Notes, highlights, bookmarks, prayers, donations, family dashboard, account management, mission invite dismiss. These endpoints require Bearer token auth.
- **Server-backed with guest fallback:** Reading history, activity tracking, feedback, study guide sessions, kids progress, devotional progress, formation progress, sabbath school progress. Unauthenticated requests use "guest" as userId — data goes to a shared guest bucket (effectively a no-op for personalization, but harmless).
- **Public reads (no auth needed):** Bible text, study tracks listing, live streams, sabbath school content, devotional plans, kids collections, church directory, fundamental beliefs, radio stations, analytics events.
- **Pro/Supporter-only (requires auth + isPro):** Family Dashboard (stats, heatmap, prayers, conversation starters, dinner topics), Chapter Context (4D Scripture deep study layer). These use `checkProStatus` middleware which enforces auth + pro status server-side.

**Deploy Environment Checklist:**
- `DATABASE_URL` — required, validated on startup
- `JWT_SECRET` — required, min 16 chars, no hardcoded fallback
- `RUN_STARTUP_SEEDS` — must be unset or "false" in production
- `ALLOW_INSECURE_PASSWORD_RESET` — must be unset or "false" in production
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` — required for AI features
- `ELEVENLABS_API_KEY` — required for TTS narration
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` — required for live streaming
- Startup logs print full security posture on boot for verification.

**Maps & Location:**
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.

**Resume System:**
- **`useResumeJourney` hook (`hooks/useResumeJourney.ts`):** Aggregates progress from 8 sources (guided study, devotional, study path, GC timeline, prophecy, beliefs, Bible reading, sabbath school) with priority-based selection. Builds normalized `ResumeItem` with type badge, progress label, and direct route. Caches last valid item to `@grace-through-faith/resume-item` in AsyncStorage.
- **ContinueCard (`components/home/ContinueCard.tsx`):** Displays highest-priority resumable item on Home screen with type badge, progress subtitle, and "Resume" CTA. Returns null when no resumable progress exists.

**Streaming:**
- **LiveKit Cloud:** Real-time video/audio conferencing via WebRTC.
- **react-native-webview:** Loads the LiveKit room HTML on native.