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
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, with all generated content cached in PostgreSQL. Features include a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs (`eleven_turbo_v2_5` model) for high-quality cinematic voices, with fallback to `expo-speech` device voices when offline. Audio served via `GET /api/tts/stream?text=...&voice=...` endpoint with in-memory caching (10-min TTL). Client uses `createAudioPlayer({uri})` with remote URL (avoids Android local-file bug). Includes background audio playback with a persistent MiniPlayer.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history with streak tracking, and a unified "My Library" screen.
- **Semantic Search:** AI-powered natural language Bible search using OpenAI, also searching user's notes/highlights/bookmarks, with results cached.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking. Includes a Sabbath Mode UI toggle for lessons.
- **Sabbath Experience Mode:** Detects Sabbath hours using astronomical sunset calculations, providing specialized home screen content and prompts.
- **Church Connect:** A global SDA church finder with geo-radius and text search capabilities, supporting map and list views.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines (Study, Prayer, Engage).
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`, with content translation architecture using overlay tables.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features with persistence via AsyncStorage.
- **Pro/Paywall System:** Guards premium features with a trial period, including a Family Dashboard.
- **Small Groups 2.0:** Enhanced system for SDA small groups with member roles, discussions, and announcements.
- **Live Streaming:** Integrates Jitsi Meet via WebView for live streaming.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Guest User Identity:** Each device receives a unique UUID for API calls and data isolation.

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
- **Jitsi Meet (meet.jit.si):** Live video conferencing sessions.
- **react-native-webview:** Embedding Jitsi Meet on native platforms.