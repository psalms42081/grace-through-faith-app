# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed to be the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. Its core purpose is to provide an immersive study experience, featuring a unique "4-Layer Study Model" powered by AI, offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture. The frontend uses Expo (React Native), the backend uses Express.js, and PostgreSQL with Drizzle ORM handles data persistence. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`. The app is exclusively designed for Seventh-day Adventists, with all devotional content presented without tradition-based filtering.

**Backend Route Architecture:** Routes are modular, organized into domain-specific Express Router modules under `server/routes/` for features like authentication, user management, Bible study, devotionals, Kids Club, community, family dashboard, spiritual formation, and text-to-speech. Shared middleware for authentication, validation (using Zod), rate limiting, and content language resolution are located in `server/middleware/`.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme with warmer tones.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, and larger touch targets. Features include a scene-based story viewer with Ken Burns effect, sentence-level text highlighting, auto-play mode, mood-based animated particle overlays, tap-to-interact animations, an optional Cinema Mode for synchronized video shorts, and ElevenLabs narrator voice selection (7 voices, persisted via AsyncStorage, with device voice fallback).

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content. Supports three study depth levels (Quick 5min / Standard 15min / Deep Dive 30min) via `StudyDepthContext` persisted to AsyncStorage. Depth selector shown at entry points (Sabbath Experience, Study tab, Study Paths) and on content screens (Devotional Day, Formation Lesson). Backend AI functions (`generateContextCards`, `generateApplicationStudy`) accept `depth` parameter to tailor output length and detail. Quick mode shows concise insights; Deep mode adds word studies, EGW references, and cross-references.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, with all generated content cached in PostgreSQL. Features include a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs (`eleven_turbo_v2_5` model) for high-quality cinematic voices, with fallback to `expo-speech` device voices when offline. Two-step flow: `POST /api/tts/prepare` (generates audio, caches in-memory 10-min TTL, returns audioId) → `GET /api/tts/audio/:id` (serves cached buffer). Client uses `createAudioPlayer(urlString)` — must pass string URL, not `{uri}` object, to avoid Android native bridge crash. expo-audio v55 patched (`patches/expo-audio+55.0.8.patch`) to pass only 3 args to Android AudioPlayer constructor (4th arg `preferredForwardBufferDuration` is iOS-only). `playbackRate` must be set via `player.setPlaybackRate()` method, not direct property assignment (read-only getter on Android). Server must NOT use `reusePort: true` — it causes multiple processes sharing port 5000 with separate in-memory caches, breaking the prepare→GET flow. Includes background audio playback with a persistent MiniPlayer.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history with streak tracking, and a unified "My Library" screen.
- **Semantic Search:** AI-powered natural language Bible search using OpenAI, also searching user's notes/highlights/bookmarks, with results cached.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking. Includes a Sabbath Mode UI toggle for lessons.
- **Sabbath Experience Mode (Full):** Time-phased Sabbath environment with four distinct phases: Friday Evening (opening scripture, family prayer, worship songs), Sabbath Morning (Sabbath School link, reflection questions, church prep), Afternoon (nature meditation, missionary stories, family discussions), and Closing (closing prayer, gratitude, farewell reflection). Phase detection via `getSabbathPhase()` in `lib/sabbath.ts` with auto-refresh every 60 seconds. Visual phase timeline indicator at top. Preserves existing theological framing, reflection saving, worship pathways, and study depth selection.
- **Church Connect:** A global SDA church finder with geo-radius and text search capabilities, supporting map and list views.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines (Study, Prayer, Engage).
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`, with content translation architecture using overlay tables.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features with persistence via AsyncStorage.
- **Pro/Paywall System:** Guards premium features with a trial period, including a Family Dashboard.
- **Small Groups 2.0:** Enhanced system for SDA small groups with member roles, discussions, and announcements.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView with native permission handling.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen (`app/prophecy-explorer.tsx`) with expandable/collapsible sections covering Daniel 2 (Great Image), Daniel 7 (Four Beasts), Daniel 8-9 (2300 Day Prophecy), and Revelation timelines (Seven Churches, Seals, Trumpets, Three Angels' Messages, Sanctuary, Little Horn/Antichrist, Mark of the Beast, Second Coming). Each symbol includes Bible reference, key verse, SDA interpretation, and historical fulfillment. Interactive timeline bar (tap date to navigate to section). Historicist interpretation header. Accessible from Study tab and Sabbath Experience worship pathways.
- **Spiritual Growth Map:** Visual spiritual journey screen (`app/growth-map.tsx`) tracking 5 dimensions (Prayer Life, Scripture, Service, Character, Wisdom) with 4 levels each. Levels calculated from real app data via `GET /api/growth-map` endpoint (aggregates prayer entries, chapters read, group participation, study depth usage, study path progress). Concentric growth rings visualization and detailed breakdown cards with progress bars. Accessible from "You" tab quick links.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Guest User Identity:** Each device receives a unique UUID for API calls and data isolation.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content (GitHub: `Adventech/sabbath-school-lessons`). Backend sync service (`server/services/sabbath-school-sync.ts`) fetches current quarter data daily from `raw.githubusercontent.com`, parsing YAML metadata and markdown lesson content into 5 database tables. Stability hardened: UTC-normalized date calculations (no timezone drift), quarter rollover fallback (tries previous quarter by code when current unavailable, selects by `quarterCode` descending not `createdAt`), network resilience (15s fetch timeout, 3-retry init with 10s backoff), and discussion prep cache invalidation on content re-sync (tracks day-level content changes). Server provides `todayDayNumber` to frontend for timezone-safe day highlighting. Content source boundaries clearly labeled: official Adventech lesson text has attribution in day reader; AI-generated discussion aids have prominent disclaimers both pre- and post-generation. API routes at `server/routes/sabbath-school.ts` use shared `getMostRecentQuarterly()` for consistent fallback. Frontend: main hub (`app/sabbath-school.tsx`), day reader (`app/sabbath-school-day.tsx`), discussion companion (`app/sabbath-school-discussion.tsx`). Entry points on Home screen and Sabbath Experience.
- **Great Controversy Map:** An immersive vertical timeline tracing the cosmic conflict from Creation to the New Earth through 15 narrative nodes aligned with Adventist theology. Each node shows scripture references, linked Fundamental Beliefs, connected study paths, and depth-aware content (Quick/Standard/Deep). Deep mode includes AI-generated contextual narratives via `POST /api/great-controversy/explore` with database caching (`gcExplorationCache` table). Entry points on Sabbath Experience and Study Paths. Data model in `data/great-controversy.ts`, screen at `app/great-controversy.tsx`, backend route at `server/routes/great-controversy.ts`.
- **Shared UI Components:** Reusable `SectionHeader` (`components/SectionHeader.tsx`), `AnimatedSection` (`components/AnimatedSection.tsx`), and `ScreenHeader` (`components/ScreenHeader.tsx`) extracted from duplicated patterns. ScreenHeader provides consistent back-button + title headers across standalone screens (prophecy-explorer, sabbath-school, great-controversy, growth-map, sda-studies). Props: title, subtitle?, showBackButton, rightAction?, backIcon?, testID?.
- **Component Structure:** Profile screen decomposed into `components/profile/` (BibleHeatmap, BadgesGrid, GrowthAnalytics, ActivitySections, LanguageSettings). Home screen decomposed into `components/home/` (GoldDivider, VerseOfTheDay, ContinueReadingCard, GuidedToolsRow, SabbathSchoolCard, DevotionalCard, SabbathBanner, LiveNowSection, WeeklyCalendar, ChildPickerModal).
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations. Accessible from Connect tab ("Watch & Listen" section).
- **Route Consolidation:** Legacy `kids-story/[id]` route removed; only immersive scene-based `kids/story/[id]` remains.

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

**Authentication & Security:**
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.

**Maps & Location:**
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.

**Streaming:**
- **LiveKit Cloud:** Real-time video/audio conferencing via WebRTC. Backend generates tokens via `livekit-server-sdk`. Room name stored in `liveSessions.roomUrl`.
- **server/services/livekit.ts:** Room creation, token generation, room cleanup.
- **server/templates/livekit-room.html:** Self-contained LiveKit room UI (loads `livekit-client` from CDN). Served at `/api/streams/:id/room`.
- **react-native-webview:** Loads the LiveKit room HTML on native. `mediaCapturePermissionGrantType="grant"` for camera/mic.
- **Env vars:** `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` (wss:// URL).