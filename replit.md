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