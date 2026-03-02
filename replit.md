# Grace through Faith — Bible Study App

## Overview
A mobile-first Bible study app designed for Christian ministries, offering an immersive and comprehensive study experience. It features a unique "4-Layer Study Model" (Text, Context, Historic Voices, Application) powered by AI, along with offline capabilities. The app includes a Kids Club, devotional plans, prayer journaling, and a YouVersion-inspired dark mode. Its vision is to deliver rich, AI-generated biblical insights and foster spiritual growth across all age groups.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application adopts a mobile-first architecture utilizing **Expo (React Native)** for the frontend, **Express.js** for the backend, and **PostgreSQL** with **Drizzle ORM** for data persistence. **TanStack Query** handles server state management with offline persistence, while React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`, and `server/routes.ts` manages API routing, database operations, and caching.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`). Kids Mode uses a distinct color palette.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Borderless design, YouVersion-inspired immersive dark theme, focusing on readability and clear information hierarchy. The Bible reader features premium typography (Lora, fontSize 21, lineHeight 34) and "Smart Selection" for focused verse reading.
- **Onboarding:** A 4-page swipeable welcome flow for new users.
- **Kids Club:** A dedicated section with age-appropriate content, quizzes, and stories, tracked via `KidsModeContext`.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content (reflection questions, prayer prompts).
- **AI Integration:** OpenAI's gpt-4o-mini generates on-demand context, commentary, application, and word study data for any Bible chapter/verse, with all content cached. Study tools auto-generate on first view.
- **Text-to-Speech (TTS):** Utilizes OpenAI's gpt-audio model via a server-side API, with `expo-speech` as a device fallback.
- **Offline Support & Proactive Prefetch:** React Query persistence via AsyncStorage provides an offline-first experience. The app proactively prefetches study layers (chapter context, commentary, verse maps, Strong's data) to ensure instant rendering.
- **Search:** Keyword search with highlighting and reference parsing.
- **Real Commentary API:** Uses HelloAO Bible API for public domain commentaries (Matthew Henry, Adam Clarke, Jamieson-Fausset-Brown, John Gill).
- **Socratic AI Study Guide:** Interactive guided study using the Inductive Method, with AI acting as a seminary tutor. Users can select different tutor personas (Scholarly, Pastoral, Ancient). Sessions are persistent and resumable.
- **Visual Verse Mapper:** Interactive breakdown of verses into original language words (Strong's Concordance), AI-generated cross-references, and historical context.
- **Strong's Concordance:** Comprehensive Greek/Hebrew entries with definitions, transliterations, and KJV usage, searchable via the Word Study tab.
- **Share Insight Cards:** Allows users to share premium dark-themed insight cards (PNG capture on mobile, Web Share API/clipboard on web) from study guides or verse maps.
- **Verse Actions:** A sheet for verse-specific actions: Copy, Highlight, Bookmark, Words, Context, Voices, Verse Map, and Guided Study.
- **Pro/Paywall System:** Guards premium features (Verse Map, Guided Study, Family Dashboard) with a `isPro` flag on user accounts, offering a 7-day trial.
- **Family Dashboard:** A premium tab for parents to track children's spiritual progress, including AI-generated conversation starters.
- **User Features:** Notes, highlights, bookmarks, a CRUD-enabled prayer journal, and reading history with streak tracking.
- **Devotionals:** Browsing, enrollment, and progress tracking for various devotional plans.
- **4D Scripture Context Panel:** A floating button in the chapter reader that expands to show AI-generated contextual data (locations, timeline, figures, cultural insights) for the current chapter, with haptics and animations.
- **SDA Doctrinal Studies:** Dedicated screen for the 28 Fundamental Beliefs with summaries, key scriptures, and external EGW Writings links.
- **Young Adults Section:** An age group in the Kids Club (13-17) with longer narratives, discussion questions, and teen-relevant themes.
- **Interactive AI Storyteller (Pause & Wonder):** Kids stories are now interactive "Choose Your Own Adventure" experiences. Every 3 paragraphs, an AI-generated "Pause & Wonder" card appears inline with a warm, imaginative question and 3 emoji-based multiple-choice answers. Answering triggers `expo-haptics` `notificationAsync(Success)` and awards +10 points to child profile. Wonder moments are cached per story+ageGroup in `kids_wonder_cache` table. Answer state stored in `kidsProgress.wonderAnswers` (jsonb array of moment indices). Points only awarded once per unique moment (prevents double-counting). UI hydrates answered state from server on revisit. AI prompt adapts to age group (little_lambs=4-7 simple, young_disciples=8-12 moderate, young_disciples_plus=13-17 deeper). Screen: `app/kids-story/[id].tsx`. Story text rendered in large Lora serif font paragraph-by-paragraph. Endpoints: `GET /api/kids/stories/:id/wonder?ageGroup=`, `POST /api/kids/wonder/answer`. AI function: `generatePauseAndWonder` in `server/services/ai-engine.ts`.
- **Home Screen Redesign:** Features an immersive photo-backed Verse of the Day card, weekly streak calendar, "Continue Reading" card, guided content cards, and featured devotional plans.
- **Growth Analytics Dashboard:** Profile section with Deep Study minutes, Greek/Hebrew words mastered, Socratic session count, and a "Bible Knowledge Map" heatmap visualizing reading depth across all Bible books.
- **Parent Bridge (Dinner Table Topics):** When a child completes a quiz, a background function generates an AI-powered "Dinner Table Topic" with a push notification (mocked via console.log), a dinner question connecting the Bible story to the child's daily life, and 3 follow-up questions. Topics appear as premium cards in the Family tab with a "Mark as Discussed" button that awards +25 bonus points to the child's profile (duplicate-protected). Schema: `dinner_table_topic` table with parentId, childProfileId, storyId, notificationText, dinnerQuestion, followUpQuestions, discussed flag. AI function: `generateDinnerTableTopic` in `server/services/ai-engine.ts`. Endpoints: `GET /api/family/dinner-topics`, `POST /api/family/dinner-topics/:id/discussed`. Trigger: `triggerParentBridge()` called from `POST /api/kids/progress/quiz` when `childProfileId` is provided.
- **Premium Kids Mode UI:** Kids Mode has a distinctly playful, vibrant UI vs the scholarly Adult Mode. Includes: (1) Custom tab bar with rounded top corners (borderRadius 20), taller height (90px web), vibrant background, bolder labels. (2) Animated entrance effects via react-native-reanimated FadeInDown with staggered delays across all kids screens. (3) Bouncy spring press effects on all interactive cards (scale 0.96). (4) Larger touch targets (18-20px padding, 18-24px borderRadius). (5) Pulsing star card glow, wobbling flame icon, breathing badge animations. (6) Circular collection icons, sparkle stars, star-burst quiz celebrations. (7) Haptic feedback on quiz answers. (8) Story reader with floating circular back button, bouncy Wonder cards, multi-star completion burst, spacious paragraph layout. Supplementary palette: coral, mint, lavender, peach in KidsColors. All reanimated hooks properly extracted into standalone components (no hooks-in-map).
- **Navigation:** A 6-tab layout (Home, Read, Family, Discover, You/Profile) in adult mode. Kids mode tabs: Home, Stories, Learn, My Stars. Family tab hidden in kids mode.

## External Dependencies
- **OpenAI API:**
    - `gpt-4o-mini`: AI content generation (context, commentary, application, word study).
    - `gpt-audio model`: Text-to-Speech functionality.
- **PostgreSQL:** Main database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework and UI components (e.g., `expo-router`, `@expo/vector-icons`, `expo-speech`, `expo-av`).
- **AsyncStorage:** Client-side data persistence for offline caching.
- **egwwritings.org:** External source for Ellen G. White's writings links.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides real public domain commentaries.