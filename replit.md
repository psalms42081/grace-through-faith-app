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
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content. Includes a segmented progress bar (Text / Context / Insight / Transformation), per-layer completion tracking stored in `layer_completions` table (per user, book, chapter, layer), "Mark Layer Complete" / "Next Layer" CTA buttons, and per-book layer completion summary (% bars) in the Bible Knowledge Map tooltip on the Profile tab. Layer 3 (Insight) has structured journal prompts: Theological Themes, Revelation of God, Revelation of Humanity, Biblical Narrative Connection. Layer 4 (Transformation) has structured journal prompts: Belief Challenged, Habit Shaped, Conversation Impacted, Prayer Response (with Save to Prayer Journal link). All journal entries persisted in `study_journal_entries` table (per user, book, chapter, layer, sectionKey). Per-section gold checkmark completion indicators.
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
- **Kids Story Engine (Scene-Based Reader):** Immersive scene-based storybook reader with AI-generated scenes, narration, AI-generated watercolor illustrations (`assets/kids-scenes/`), and dynamic atmosphere audio. Scene images stored in `kids_story_scene.image_url` column, served via `/assets/kids-scenes/{sceneId}.png`.
- **Dynamic Atmosphere Audio Engine:** Plays mood-appropriate cinematic orchestral loops with cross-fade transitions based on story scene mood.
- **Home Screen (Action Dashboard):** Focused on today/now actions only — Verse of the Day, streak calendar, bigger Continue Reading card, guided tool cards (4-Layer Study, Prayer Journal), and devotional plan progress. No educational explainers or featured plan lists.
- **Discover Tab (Curated Library):** Organized into labeled sections: Popular Passages, Topics to Explore, Study Resources (Historic Voices, Christian Traditions), Study Tools (Bible Maps, Timeline), and Christian Content (Music). No progress widgets or personal items. "28 Fundamental Beliefs" accessible only via Christian Traditions > Adventist (not in core Study Resources).
- **You Tab (Personal Dashboard):** Quick Links: Prayer Journal, Prayer Groups, Parent Controls, How This App Works. Subtle section dividers between all dashboard sections.
- **How This App Works Page (`app/how-it-works.tsx`):** Feature overview cards + "Our Approach" interdenominational positioning statement + link to Christian Traditions.
- **Christian Traditions Page (`app/christian-traditions.tsx`):** Denominational collections hub — 6 traditions listed (Adventist, Baptist, Reformed enabled; Catholic, Methodist, Orthodox disabled with "Coming soon" badges). Content labeling note. Links to collection detail screens.
- **Collection Detail Page (`app/tradition/[id].tsx`):** Per-tradition detail screen with intro text, tradition badge, sample topics, and "View full study collection" link (Adventist → SDA Studies). Baptist/Reformed show topic previews + "Lessons coming soon." Disabled traditions show intro + coming soon.
- **Content Filtering (`lib/content-filter.ts`):** Core vs Tradition content separation. `devotional_plan.tradition_key` column (default "core"). API `/api/devotionals/plans?traditionKey=core` filters server-side. Core areas (Home, Plans tab, devotionals list, chapter view) request `traditionKey=core`. Denominational content only under Discover > Christian Traditions > [Collection]. "28 Fundamental Beliefs" removed from Discover Study Resources (accessible via Adventist collection). `filterCoreOnly()` and `filterByTradition()` helpers with `__DEV__` warnings for accidental leaks. Collections config in `constants/traditions.ts`.
- **Growth Analytics Dashboard:** Profile section with deep study minutes, words mastered, Socratic session count, and a "Bible Knowledge Map."
- **Parent Bridge (Dinner Table Topics):** AI-powered "Dinner Table Topic" generation for parents based on children's completed quizzes.
- **User Accounts & Authentication:** Full JWT-based auth system with `AuthContext.tsx` managing state, token persistence in AsyncStorage, and `bcryptjs` for password hashing.
- **Prayer Groups:** Community prayer groups with join codes, shared Prayer Walls.
- **Family Groups:** Family units with invite codes, sharing a Prayer Wall and Kingdom Map. Family tab shows state-dependent UI: guest sign-in prompt, create/join family form, or family info card with invite code (tap to copy) and member list.
- **Parent-Controlled Kids Mode:** PIN protection for Kids Mode exit/switch. Child profiles with age tiers (Little Lambs 3-5, Young Disciples 6-9, Young Disciples+ 10-12). Child picker modal on entry ("Who's reading today?"). Per-child session tracking with `activeChildProfileId` scoped to all progress/streak/badge APIs. Parent Controls screen accessible from Profile tab for PIN set/change/remove. KidsModeContext tracks `activeChildProfileId`, `activeChildName`, `lastActiveChildId` with AsyncStorage persistence. Kids Mode header shows "KIDS MODE" badge, active child name, Switch Child + Exit buttons.
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