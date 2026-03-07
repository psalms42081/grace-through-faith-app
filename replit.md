# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed to be the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. Its core purpose is to provide an immersive study experience, featuring a unique "4-Layer Study Model" powered by AI, offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth within the SDA framework.

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
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content. Supports three study depth levels (Quick 5min / Standard 15min / Deep Dive 30min) via `StudyDepthContext` persisted to AsyncStorage. Depth selector is shown at various entry points, tailoring AI output length and detail.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, with all generated content cached in PostgreSQL. Features include a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs (`eleven_turbo_v2_5` model) for high-quality voices, with fallback to `expo-speech` device voices when offline. Includes background audio playback with a persistent MiniPlayer.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history with streak tracking, and a unified "My Library" screen.
- **Semantic Search:** AI-powered natural language Bible search using OpenAI, also searching user's notes/highlights/bookmarks, with results cached.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle for lessons.
- **Sabbath Experience Mode:** Time-phased Sabbath environment with four distinct phases: Friday Evening, Sabbath Morning, Afternoon, and Closing, with phase detection and visual timeline indicator.
- **Church Connect:** A global SDA church finder with geo-radius and text search capabilities.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines (Study, Prayer, Engage).
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`, with content translation architecture using overlay tables.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Pro/Paywall System:** Guards premium features with a trial period, including a Family Dashboard.
- **Small Groups 2.0:** Enhanced system for SDA small groups with member roles, discussions, and announcements.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView with native permission handling.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with expandable/collapsible sections covering key prophecies and timelines, including Bible references, SDA interpretation, and historical fulfillment.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions (Prayer Life, Scripture, Service, Character, Wisdom) with 4 levels each, calculated from app data.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Verse Action Tools:** Bottom-sheet verse tools (Copy, Highlight, Bookmark, Words, Voices, Verse Map, Guided Study) navigate to standalone stack routes (`/word-study`, `/historic-voices`, `/verse-map`, `/study-guide`, `/passage-context`) for proper Android back-button behavior. All tools available to all users (no pro gate).
- **Guest User Identity:** Each device receives a unique UUID for API calls and data isolation.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content, with robust backend sync service and timezone-safe date calculations.
- **Great Controversy Map:** An immersive vertical timeline tracing the cosmic conflict from Creation to the New Earth through 15 narrative nodes aligned with Adventist theology, including scripture, Fundamental Beliefs, and depth-aware content.
- **UI Primitive System (`components/ui/`):** Standardized reusable UI components for consistent appearance across the app, including `Card.tsx`, `Button.tsx`, `EmptyState.tsx`, `ListItem.tsx`, `Badge.tsx`, and `Chip.tsx`.
- **Shared Layout Components:** Reusable `SectionHeader`, `AnimatedSection`, and `ScreenHeader` for consistent UI elements across screens.
- **Component Structure:** Screens are decomposed into modular components for better organization and reusability (e.g., `components/profile/`, `components/home/`).

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

**Maps & Location:**
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.

**Streaming:**
- **LiveKit Cloud:** Real-time video/audio conferencing via WebRTC.
- **react-native-webview:** Loads the LiveKit room HTML on native.

**Phase 4 — Launch Readiness:**
- **First-Run Onboarding (`app/onboarding.tsx`):** 4-screen onboarding flow (Welcome, Study pillars, Daily rhythm, CTA "Begin Your Journey"). Shown only once, stored in AsyncStorage `@grace-through-faith/onboarded`. Skippable.
- **Today's Path (`components/home/TodaysPath.tsx`):** Daily guidance section on home screen showing actionable items (Read, Pray, Continue Study, Sabbath School, Devotional) with completion indicators from spiritual-rings data. Inserted after greeting in both regular and Sabbath modes.
- **ContinueCard (`components/home/ContinueCard.tsx`):** Context-aware "continue" card that surfaces the most recent user activity — Bible reading, Sabbath School lesson, or devotional plan — replacing the static `ContinueReadingCard` on the home screen.
- **Analytics System (`lib/analytics.ts`):** Lightweight event tracking with offline queue (AsyncStorage persistence). Events batched and flushed every 30s or at 10-event threshold. Backend logs with `[Analytics]` prefix via `POST /api/analytics/events`. Tracked events: `onboarding_completed`, `prayer_journal_entry`, `prophecy_explorer_opened`. Privacy: no personal content logged.
- **Crash Reporting:** `ErrorBoundary` reports crashes to `POST /api/analytics/error` with stack traces. Global `unhandledrejection` handler in `_layout.tsx`. Backend logs with `[CrashReport]` prefix.
- **Empty State Polish:** Migrated church-connect, PrayerWall, and study-paths inline empty states to shared `EmptyState` component.
- **Analytics Route (`server/routes/analytics.ts`):** Receives event batches and error reports, logs to console for beta monitoring.

**Kids Mode Improvements:**
- **Story Animation Fallback (`app/kids/story/[id].tsx`):** `SceneIllustrationPlaceholder` shows mood-themed gradient + animated icon when images fail to load. `KenBurnsImage` catches load errors and falls back gracefully. Never shows a blank scene.
- **Micro Animations:** Star reward sparkle effects on quiz/story completion, "Great job!" bounce-in card, memory verse checkmark bounce animation. All use react-native-reanimated, under 300ms.
- **Kids Sabbath School (`app/kids/sabbath-school.tsx`):** Template-based weekly lesson with 4 cards: Story of the Week, Memory Verse, Think About It (discussion), Prayer. Backend at `GET /api/kids/sabbath-school/current?ageGroup=`. Content is age-adaptive: Little Lambs (simple), Young Disciples (intermediate), Young Adults (reflective). Rotates weekly.
- **Progress Visualization (`app/(tabs)/kids-stories.tsx`, `app/(tabs)/kids-stars.tsx`):** Collection cards show animated progress bars (completed/total). Badge unlock glow/starburst animation. Star count animated increment.
- **Duplicate Collections Fix (`server/routes/kids.ts`):** Backend deduplicates collections by title+ageGroup key. Recalculates actual story counts per collection.
- **Kids Home Layout (`app/(tabs)/index.tsx` KidsHomeScreen):** Enhanced layout: Greeting → Today's Verse → Streak → Stats → Today's Story → Sabbath School card → My Progress (stories/verses/badges counts) → Quick Actions.