# Grace through Faith — Bible Study App

## Overview
A mobile-first Bible study app for all Christian ministries, featuring a "4-Layer Study Model" (Text, Context, Historic Voices, Application). The project aims to provide an immersive and comprehensive Bible study experience with AI-powered content generation and offline capabilities. It incorporates features like a Kids Club, devotional plans, prayer journaling, and a deep, YouVersion-inspired dark mode.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application is built with a mobile-first approach using **Expo (React Native)** for the frontend, **Express.js** for the backend, and **PostgreSQL** with **Drizzle ORM** for the database. **TanStack Query** manages server state with offline persistence via AsyncStorage, and React context handles shared UI state.

**UI/UX Decisions:**
- **Color Scheme:** Deep dark mode (`#050507` near-black) for an immersive experience, with a warm gold accent (`#C9933A`). Kids Mode uses a distinct palette.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI text.
- **Icons:** Ionicons from `@expo/vector-icons`.
- **Design Philosophy:** Borderless design, YouVersion-inspired immersive dark theme, with a focus on readability and clear information hierarchy. The Bible reader features a centered book name, large chapter number, and continuous prose with inline superscript verse numbers.
- **Onboarding:** A 4-page swipeable welcome flow for first-time users.
- **Kids Club:** A dedicated section with KidsModeContext for age-appropriate content and progress tracking, including quizzes and stories.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB), historical context, classic commentaries, and application-focused content (reflection questions, prayer prompts, journaling).
- **AI Integration:** OpenAI's gpt-4o-mini generates on-demand context, commentary, and application data for any Bible chapter, which is then cached to the database.
- **Text-to-Speech (TTS):** Uses OpenAI's gpt-audio model via a server-side API (`/api/tts`) with multiple voice options (Nova, Shimmer, Alloy, Echo, Onyx). `expo-speech` serves as a device fallback. Playback is handled by `expo-av`.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience with a 30-day garbage collection time.
- **Search:** Keyword search with highlighting and reference parsing (e.g., "John 3:16").
- **User Features:** Notes, highlights, bookmarks, prayer journal (CRUD), and reading history with streak tracking.
- **Devotionals:** Browser for various devotional plans, enrollment, daily reading, and progress tracking.
- **Maps & Timeline:** Interactive maps with locations linked to verses and a timeline of biblical events.
- **Christian Music:** Dedicated music section with Worship & Praise, Classic Hymns, Gospel, Instrumental, Contemporary Christian, and Kids categories with external links. Content shuffles each session for freshness.
- **Family & Faith:** Family-focused Christian content from diverse voices (Joel Osteen, Joyce Meyer, Tony Evans, Charles Stanley, T.D. Jakes, Priscilla Shirer, Rick Warren, Lysa TerKeurst, Doug Batchelor, 3ABN, and more). Content shuffles each session.
- **Enhanced Topics:** 12 topic pages with curated media from diverse Christian speakers/artists. Speaker avatars (colored initials) identify each source. Content order shuffles each session.
- **Speaker Avatars:** Colored circular avatars with initials (constants/speakers.ts) used across Topic, Family, and Music screens for visual speaker identification.
- **Navigation:** 4-tab layout (Home, Read, Search, Discover). Study tools accessible from within the chapter reader. Search tab topics link directly to full topic pages with media content.
- **Illustrations:** AI-generated watercolor illustrations enhance visual content.

## External Dependencies
- **OpenAI API:**
    - `gpt-4o-mini`: For on-demand AI generation of context, commentary, and application content.
    - `gpt-audio model`: For Text-to-Speech functionality via the `/api/tts` endpoint.
- **PostgreSQL:** Primary database for all application data, managed by Drizzle ORM.
- **Expo & React Native Ecosystem:**
    - `expo-router`: For navigation.
    - `@expo/vector-icons`: For UI icons.
    - `expo-speech`: Device TTS fallback.
    - `expo-av`: For audio playback.
- **AsyncStorage:** For client-side data persistence and offline caching.
- **egwwritings.org:** External link for Ellen G. White commentary references.
- **Wikimedia Commons:** Source for historical images used in locations.