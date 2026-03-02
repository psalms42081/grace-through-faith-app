# Grace through Faith — Bible Study App

## Overview
A mobile-first Bible study app for Christian ministries, offering an immersive and comprehensive study experience. It features a unique "4-Layer Study Model" (Text, Context, Historic Voices, Application) powered by AI, along with offline capabilities. The app includes a Kids Club, devotional plans, prayer journaling, and a YouVersion-inspired dark mode. Its vision is to deliver rich, AI-generated biblical insights and foster spiritual growth across all age groups.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application adopts a mobile-first architecture utilizing **Expo (React Native)** for the frontend, **Express.js** for the backend, and **PostgreSQL** with **Drizzle ORM** for data persistence. **TanStack Query** handles server state management with offline persistence, while React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`, and `server/routes.ts` manages API routing, database operations, and caching.

**UI/UX Decisions:**
- **Color Scheme:** Deep dark mode (`#050507`) with a warm gold accent (`#C9933A`). Kids Mode uses a distinct color palette.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Borderless design, YouVersion-inspired immersive dark theme, focusing on readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant UI with custom tab bar, animated entrance effects, bouncy press effects, larger touch targets, and dynamic animations.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content.
- **AI Integration:** OpenAI's `gpt-4o-mini` generates on-demand context, commentary, application, and word study data, with all content cached.
- **Text-to-Speech (TTS):** Utilizes OpenAI's `gpt-audio model` via a server-side API, with `expo-speech` as a device fallback.
- **Offline Support & Proactive Prefetch:** React Query persistence via AsyncStorage provides an offline-first experience, proactively prefetching study layers.
- **Search:** Keyword search with highlighting and reference parsing.
- **Socratic AI Study Guide:** Interactive guided study using the Inductive Method with AI tutor personas, persistent and resumable sessions.
- **Visual Verse Mapper:** Interactive breakdown of verses into original language words (Strong's Concordance), AI-generated cross-references, and historical context.
- **Strong's Concordance:** Comprehensive Greek/Hebrew entries accessible via the Word Study tab.
- **Share Insight Cards:** Allows sharing premium dark-themed insight cards.
- **Pro/Paywall System:** Guards premium features (Verse Map, Guided Study, Family Dashboard) with a 7-day trial.
- **Family Dashboard:** Premium tab for parents to track children's spiritual progress, including an AI-generated "Family Kingdom Map" heatmap and "Family Altar" Prayer Wall.
- **User Features:** Notes, highlights, bookmarks, prayer journal, and reading history with streak tracking.
- **Devotionals:** Browsing, enrollment, progress tracking, and **interactive AI reflection discussions** — each reflection question has an answer field; submitting an answer triggers an AI-powered discussion with follow-up questions for deeper engagement.
- **4D Scripture Context Panel:** Floating button in the chapter reader for AI-generated contextual data (locations, timeline, figures, cultural insights).
- **SDA Doctrinal Studies:** Dedicated screen for the 28 Fundamental Beliefs with external EGW Writings links.
- **Interactive AI Storyteller (Pause & Wonder):** Kids stories are "Choose Your Own Adventure" experiences with AI-generated "Pause & Wonder" cards for interactive learning.
- **Kids Story Engine (Scene-Based Reader):** Immersive scene-based storybook reader with AI-generated scenes, narration, illustration prompts, and dynamic atmosphere audio.
- **Dynamic Atmosphere Audio Engine:** Plays mood-appropriate cinematic orchestral loops with cross-fade transitions based on story scene mood.
- **Home Screen Redesign:** Features a Verse of the Day card, streak calendar, "Continue Reading," and guided content cards.
- **Growth Analytics Dashboard:** Profile section with deep study minutes, words mastered, Socratic session count, and a "Bible Knowledge Map."
- **Parent Bridge (Dinner Table Topics):** AI-powered "Dinner Table Topic" generation for parents based on children's completed quizzes.
- **User Accounts & Authentication:** Full JWT-based auth system with `AuthContext.tsx` managing state, token persistence in AsyncStorage, and `bcryptjs` for password hashing.
- **Prayer Groups:** Community prayer groups with join codes, shared Prayer Walls.
- **Family Groups:** Family units with invite codes, sharing a Prayer Wall and Kingdom Map. Family tab shows state-dependent UI: guest sign-in prompt, create/join family form, or family info card with invite code (tap to copy) and member list.
- **Navigation:** 6-tab layout in adult mode (Home, Read, Family, Discover, You/Profile) and a distinct Kids mode tab navigation (Home, Stories, Learn, My Stars).

## External Dependencies
- **OpenAI API:** `gpt-4o-mini` (AI content generation), `gpt-audio model` (Text-to-Speech).
- **PostgreSQL:** Main database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework and UI components (`expo-router`, `@expo/vector-icons`, `expo-speech`, `expo-av`).
- **AsyncStorage:** Client-side data persistence for offline caching.
- **egwwritings.org:** External source for Ellen G. White's writings links.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides public domain commentaries.
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.
- **react-native-maps@1.18.0:** Interactive maps for Bible Maps screen (native only; web uses OpenStreetMap iframe via `BibleMap.web.tsx`).
- **OpenStreetMap:** Embedded tile maps for web platform Bible Maps.