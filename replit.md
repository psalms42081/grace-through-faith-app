# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed as the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. It provides an immersive study experience through a "4-Layer Study Model" powered by AI, offering offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture with a frontend built using Expo (React Native) and a backend using Express.js. Data persistence is handled by PostgreSQL with Drizzle ORM. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized. Devotional content is presented without tradition-based filtering, specifically designed for Seventh-day Adventists.

**UI/UX Decisions:**
- **Color Scheme:** Deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer.
- **Visual Design System:** Premium image-based cards replace icons, utilizing specific image assets and AI-generated classical Renaissance-style paintings for Bible book covers.

**Technical Implementations & Feature Specifications:**
- **Deep Dive:** Integrates Bible text with historical context, classic commentaries, and AI-generated application content across three study depth levels, supporting various study focus options.
- **AI Integration:** Uses OpenAI's `gpt-4o-mini` for on-demand content generation (Socratic AI Study Guide, Dynamic AI Reading Plans) with an AI Ethics & Transparency Layer.
- **Text-to-Speech (TTS):** Two narrator voices via ElevenLabs — George (male, `JBFqnCBsd6RMkjVDRZzb`) and Sarah (female, `EXAVITQu4vr4xnSDxMaL`). Default is George. Preference persists in AsyncStorage and syncs to `preferred_narrator` column via `PUT /api/user/preferences`. Fallback to `expo-speech` when ElevenLabs fails.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Notes, highlights, bookmarks, prayer journal, reading history, and a unified "Saved" screen.
- **Semantic Search:** AI-powered natural language Bible search.
- **Formation System:** Curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle.
- **Church Connect:** Global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next` for 6 languages (en, es, fr, pt, fil, zh).
- **Multilingual Bible:** 9 Bible translations stored in PostgreSQL covering 5 of 6 app languages: KJV/ASV/WEB/BBE/YLT (English), RV1909 (Spanish), LSG (French), ARC (Portuguese), TAGV (Filipino). Translation map in `lib/bibleTranslationMap.ts`, language-aware content helpers in `server/services/languageAwareContent.ts`. Download scripts: `scripts/download-multilingual-translations.ts` (non-English), `scripts/download-english-translations.ts` (BBE/YLT from scrollmapper repo). Import scripts: `scripts/import-multilingual-translations.ts`, `scripts/import-english-translations.ts`. Reader UI dynamically shows all available translations via `/api/translations`. **Language-aware wiring:** TranslationContext auto-selects the right Bible translation based on user's content language (reactive to i18n language changes); manual picker overrides persist until language is changed again. `X-Content-Language` header sent with all API requests via query-client. Server-side `normalizeLanguageCode()` validates language headers. `generateScripturalEncouragement` generates AI responses in the user's language with appropriate Bible translation. User preferences (language + Bible translation) stored in `users` table via `GET/PUT /api/user/preferences`.
- **Contextual Tutorial System:** Full-screen walkthroughs for major features.
- **Supporter/Mission System:** Mission-driven donation model.
- **Live Fellowship:** Community feature for structured group experiences with real-time video/audio via LiveKit. Group creators are automatically assigned the "leader" role. Leaders can promote/demote members and remove them via an action sheet UI. Auto-repair ensures creators missing from the membership table are re-added as leaders on group detail fetch.
- **SDA Speakers Experience:** In-app browsing of curated SDA speakers/ministries with embedded YouTube playback.
- **Broadcasts:** 5 SDA broadcast networks with live streaming.
- **Kids Star Shop & Daily Quests:** Cosmetic rewards store and daily quests for children.
- **Kids Story Scene Images:** 176 pre-generated illustrations stored in `assets/kids-scenes/` covering all three age groups: Little Lambs creation stories (watercolor style), Young Disciples Bible stories (storybook style, 10 stories), and Teen/YD+ deep-dive stories (cinematic painterly style, 7 stories). Two backfill scripts run at deploy: `scripts/backfill-creation-images.ts` (creation stories) and `scripts/backfill-yd-teen-images.ts` (YD + Teen stories with curated narration, illustrations, and moods).
- **Prophecy Explorer:** Interactive Daniel & Revelation study with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** AI-generated daily reflections and shuffled verses/media for 14 topics.
- **Insight & Voices:** Commentary screen with grouped sections — "Adventist Pioneers" (Ellen G. White, Uriah Smith, J.N. Andrews, John Loughborough, Joseph Bates, James White) and "Classic Commentators" (Matthew Henry, etc.). All Adventist pioneers use AI-generated thematic summaries based on each pioneer's known theological emphases. Backfill logic ensures pioneers are generated even for chapters with existing commentary.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content, including companion lessons.
- **28 Fundamental Beliefs UX:** Interactive belief cards with scripture navigation.
- **Great Controversy Timeline Engine:** Immersive vertical timeline.
- **Bible Maps System:** Curated biblical atlas experience with 9 Bible Mapper maps, supporting era filtering and contextual location data.
- **Content Engine & Study Resources:** Two-stage content pipeline with review workflow and versioning.
- **Role System:** Supports various user roles (`member`, `student`, `church_leader_pending`, `church_leader`, `editor`, `admin`) with role-gated middleware for content access and modification.
- **Auth:** JWT-based (90-day tokens), bcrypt passwords, with rate-limited endpoints and guest-to-user data migration on login/registration.
- **Guest Identity:** Unauthenticated users get a persistent device UUID for data storage and migration.
- **Cache Warmup:** Background job for pre-generating context cards and templates for popular chapters.
- **Sabbath Overlay:** Full-screen welcome and closing overlays displayed automatically around Sabbath times.
- **Devotional Onboarding:** A 3-step first-visit modal for new users on the devotionals screen.
- **Daily Reading Reminders:** Local push notifications via `expo-notifications` with configurable times.
- **Web Desktop Layout:** Production web build constrained to 480px max-width, centered on a dark background.
- **Sabbath School Archive:** Browsable past quarters for Sabbath School lessons.
- **Organization/Church Accounts:** Churches and conferences can register as organizations with join codes. Tables: `organizations` and `organization_members` in `shared/schema.ts`. Backend routes in `server/routes/organizations.ts` (9 endpoints: create, join, my-org, get, members, update role, remove member, add/list churches). Roles: `pastor` (owner, sees join code), `elder` (can remove members), `member`. Post-registration org onboarding (`app/org-onboarding.tsx`). "My Church" section in profile with join code copy for pastors/elders. Members list screen (`app/org-members.tsx`). Security: 45/45 regression checks pass.

## External Dependencies

- **OpenAI API:** For AI content generation (`gpt-4o-mini`).
- **PostgreSQL:** Primary database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework, navigation, icons, speech, audio/video, and localization.
- **AsyncStorage:** Client-side data persistence and offline caching.
- **i18next + react-i18next:** UI internationalization.
- **ElevenLabs API:** For high-quality Text-to-Speech.
- **egwwritings.org:** External source for Ellen G. White's writings.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides public domain commentaries.
- **Adventech/sabbath-school-lessons (GitHub):** Open-source quarterly content for Sabbath School.
- **getbible.net API:** Source for multilingual Bible translations (RV1909, LSG, ARC, TAGV).
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.
- **LiveKit Cloud:** Real-time video/audio conferencing.
- **react-native-webview:** Loads LiveKit room HTML on native.
- **sharp:** SVG-to-PNG conversion for custom atlas map plate generation.