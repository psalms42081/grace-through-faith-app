# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app. Its core purpose is to provide an immersive and comprehensive study experience, becoming the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. Key capabilities include a unique "4-Layer Study Model" (Text, Context, Historic Voices, Application) powered by AI, offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application is built with a mobile-first architecture. The frontend uses **Expo (React Native)**, the backend uses **Express.js**, and **PostgreSQL** with **Drizzle ORM** handles data persistence. **TanStack Query** manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`.

**SDA-First Architecture:** The app is exclusively designed for Seventh-day Adventists, with no multi-denomination framework or tradition filtering. All devotional content is presented without tradition-based filtering, reflecting a dedicated SDA experience.

**Backend Route Architecture (Modular):** Routes are organized into domain-specific Express Router modules located under `server/routes/`. This includes modules for authentication (`auth.ts`), user management (`user.ts`), Bible study (`bible.ts`), general study features (`study.ts`), devotionals (`devotionals.ts`), Kids Club (`kids.ts`), community features (`community.ts`), family dashboard (`family-dashboard.ts`), spiritual formation tracks (`formation.ts`), and text-to-speech (`tts.ts`). Shared middleware for authentication, validation (using Zod), rate limiting, and content language resolution are located in `server/middleware/`.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`). A distinct palette is used for Kids Mode. During Sabbath hours, a specific theme with warmer tones is applied.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Features a playful and vibrant design with custom elements, animations, and larger touch targets.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content, including progress tracking and deep study modes.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation (context, commentary, application, word study), with all generated content cached in PostgreSQL.
- **Text-to-Speech (TTS):** Employs OpenAI's `gpt-audio model` via a server-side API, with `expo-speech` as a device fallback.
- **Offline Support & Proactive Prefetch:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **Socratic AI Study Guide:** An interactive, AI-driven study guide based on the Inductive Method.
- **Visual Verse Mapper & Strong's Concordance:** Tools for in-depth word studies of biblical texts.
- **Pro/Paywall System:** Guards premium features with a trial period.
- **Family Dashboard:** A premium feature allowing parents to monitor children's spiritual progress.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, and reading history with streak tracking.
- **Devotionals:** Browsing, enrollment, progress tracking, and interactive AI reflection.
- **SDA Doctrinal Studies:** A dedicated section for the 28 Fundamental Beliefs, linking externally to EGW Writings.
- **Formation System (Study Paths):** A curriculum-based engine for spiritual formation, managed through eight database tables for tracks, modules, lessons, assessments, and progress tracking. Lessons are structured with Anchor Text, Explain, Integrate, Practice, Reflection, and Assessment sections.
- **Sabbath Mode (Lesson Screen):** A UI-only toggle within the lesson viewer that adjusts presentation for Sabbath reading, including hiding progress elements and increasing font size, without affecting backend progress.
- **Sabbath Experience Mode:** Detects Sabbath hours using astronomical sunset calculations and provides a specialized home screen banner, reflection prompts, and worship pathways.
- **Small Groups 2.0:** An enhanced system for SDA small groups with various types, member roles, discussions, and announcements.
- **Live Streaming:** Integrates Jitsi Meet via WebView for live streaming sessions, supporting group and church streams.
- **Church Connect:** A global SDA church finder with 792 churches across 50+ countries, geo-radius search (Haversine), text search by city/state/country, and map/list views. Seeded via `scripts/seed-global-churches.ts` on server startup — all Australian churches (497) are refreshed from official conference directory data on each restart (atomic delete + re-insert in batches of 100), other regions use case-insensitive name+country dedup. DB has a unique index on `LOWER(name), LOWER(country)`. Australian coverage: VIC (130 with official addresses), NSW (36), Greater Sydney (95), QLD (105), North QLD/NT (31), TAS (14), WA (65), SA (20). Global coverage: US (50), UK (30), NZ (20), Kenya (8), Nigeria (8), South Africa (8), Ghana (4), Tanzania (3), Uganda (2), Zambia (2), Zimbabwe (2), Rwanda (2), Ethiopia, DR Congo, Cameroon, Ivory Coast, Angola, Mozambique (1 each), Brazil (10), Argentina (3), Peru (3), Colombia (3), Chile (2), Ecuador, Venezuela, Bolivia, Paraguay, Uruguay (1 each), Caribbean (8), Europe (16), Asia (20), Pacific (5), Mexico/Central America (12), Canada (10).
- **Guest User Identity:** Each device gets a unique UUID (stored in AsyncStorage via `contexts/AuthContext.tsx`) — no hardcoded "guest" userId. All API calls use the device-specific ID for per-user data isolation.
- **Donation/Mission Partner Modal:** Donations are disabled (no payment processor). The modal shows "Donations Coming Soon" with a clear "Continue Studying" dismiss button. The Thank You screen code is preserved for future payment integration.
- **Data Layer Extraction:** Hardcoded data arrays are extracted to `data/` folder: `beliefs.ts`, `topics.ts`, `music.ts`, `book-topics.ts`, `radio-stations.ts`.
- **Christian Radio:** Live streaming radio player (`app/music.tsx`) with 15 SDA/gospel stations using `expo-audio`. Categories: Adventist, Gospel, Worship, Kids. Explore screen links as "Christian Radio" with radio icon.
- **Dynamic Topic Content:** Topic detail pages (`app/topic/[id].tsx`) feature AI-generated daily reflections via `/api/topic-reflection/:topicId` (rate-limited, cached in-memory per day). Verses and media are shuffled daily using a date-based seed for fresh content without changing the underlying data.
- **useTheme Hook:** All screens use the centralized `hooks/useTheme.ts` hook instead of inline `useColorScheme()` + `Colors.dark/light` patterns.
- **Internationalization (i18n):** A comprehensive UI language system using `i18next` and `react-i18next` for multiple locales. A content translation architecture is also in place, using overlay tables for localized lesson content, with English as the canonical base.
- **Contextual Tutorial System:** Premium full-screen walkthrough tutorials for each major feature (Home, 4-Layer Study, Bible Reader, Connect, Explore, Profile, Prayer Journal, Family Dashboard). Uses `components/FeatureTutorial.tsx` with pulsing animated rings, floating gold particles, and paginated steps. Persistence via `contexts/TutorialContext.tsx` with AsyncStorage. Tutorial step definitions in `lib/tutorial-steps.tsx`. A "Replay Tutorials" button is available in Profile settings.

## External Dependencies

**Core:**
- **OpenAI API:** For AI content generation (`gpt-4o-mini`) and Text-to-Speech (`gpt-audio model`).
- **PostgreSQL:** The primary database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework, navigation (`expo-router`), icons (`@expo/vector-icons`), speech (`expo-speech`), audio/video (`expo-av`), and localization (`expo-localization`).
- **AsyncStorage:** For client-side data persistence and offline caching.
- **i18next + react-i18next:** For UI internationalization.

**External Content Sources:**
- **egwwritings.org:** External source for Ellen G. White's writings.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides public domain commentaries.

**Authentication & Security:**
- **bcryptjs:** For password hashing.
- **jsonwebtoken:** For JWT token generation and verification.

**Maps & Location:**
- **react-native-maps@1.18.0:** For interactive maps on native platforms.
- **OpenStreetMap:** For embedded tile maps on the web platform.

**Streaming:**
- **Jitsi Meet (meet.jit.si):** For live video conferencing sessions.
- **react-native-webview:** For embedding Jitsi Meet on native platforms.