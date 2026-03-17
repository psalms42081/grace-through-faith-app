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
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer with Cinematic and Interactive modes.
- **Visual Design System:** Premium image-based cards replace icons throughout the app, utilizing specific image assets and AI-generated classical Renaissance-style paintings for Bible book covers.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text with historical context, classic commentaries, and AI-generated application content across three study depth levels.
- **AI Integration:** Uses OpenAI's `gpt-4o-mini` for on-demand content generation (Socratic AI Study Guide, Dynamic AI Reading Plans) with an AI Ethics & Transparency Layer.
- **Text-to-Speech (TTS):** Employs ElevenLabs for high-quality voices, with fallback to `expo-speech`.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Notes, highlights, bookmarks, prayer journal, reading history, and a unified "Saved" screen.
- **Semantic Search:** AI-powered natural language Bible search.
- **Formation System:** Curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle.
- **Church Connect:** Global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`.
- **Contextual Tutorial System:** Full-screen walkthroughs for major features.
- **Supporter/Mission System:** Mission-driven donation model.
- **Live Fellowship:** Community feature for structured group experiences with real-time video/audio powered by LiveKit Cloud.
- **SDA Speakers Experience:** In-app browsing of curated SDA speakers/ministries with embedded YouTube playback.
- **Broadcasts:** 5 SDA broadcast networks with live streaming.
- **Kids Star Shop & Daily Quests:** Cosmetic rewards store and daily quests for children.
- **Feedback System:** Dedicated in-app feedback screen.
- **In-App Sermon Player:** Dedicated screen for playing YouTube sermons.
- **Prophecy Explorer:** Interactive Daniel & Revelation study with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** AI-generated daily reflections and shuffled verses/media for 14 topics.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Interactive belief cards with scripture navigation.
- **Great Controversy Timeline Engine:** Immersive vertical timeline.
- **Study Screen Architecture:** Structured Study tab with hero sections, learning paths, prophecy, and reference sections.
- **Bible Maps System:** Curated biblical atlas experience with 9 Bible Mapper maps (biblemapper.com). Maps: All = The World of the Bible, Patriarchs = The World of the Patriarchs, Exodus = The Route of the Exodus, Kingdom = The Kingdoms of Saul David and Solomon, Exile = Judah Is Exiled to Babylon, Early Church = The World of the Bible, Paul 1/2/3 = Paul's First/Second/Third Missionary Journey. Optimized JPGs (1600px max dimension, 230-530KB each) in `assets/plates/`. Plate definitions with per-map aspect ratios in `constants/atlas-plates.ts`. Single-mode design — always shows atlas plates. Supports era filtering (All, Patriarchs, Exodus, Kingdom, Exile, Early Church) and contextual journey chips (Exodus Route for Exodus era; Paul's Journeys for Early Church). Each era state includes a contextual description and curated location cards with 2-line descriptions. Search spans locations, people groups, prophecy, journeys, kingdoms, and tribes. Location data from curated constants in `constants/biblical-locations.ts` (not DB-dependent). Attribution: "Bible Mapper".
- **Related Studies Integration Layer:** Reusable component (`RelatedStudiesSection`) for contextual study actions (e.g., Read Passages, Start Guided Study, Open Historic Voices) across all Bible Maps detail screens.
- **Guided Study Passage Picker:** Inline book/chapter picker for AI tutor sessions.
- **Content Engine & Study Resources:** Two-stage content pipeline with review workflow and versioning.
- **Role System:** Supports "member," "student," "church_leader_pending," "church_leader," "editor," and "admin" roles with role-gated middleware. Pipeline read access available to church_leader, editor, and admin. Write/approve actions restricted to editor and admin. Registration collects a `profileType` (member/student/church_leader/exploring) as metadata — student gets the student role immediately, church_leader selections start as `church_leader_pending` requiring admin approval, all others default to member.
- **Auth:** JWT-based (90-day tokens), bcrypt passwords (6-char minimum). Password reset requires authentication (available from profile settings). Rate-limited auth endpoints. Forgot Password on login screen directs users to create a new account or reset after signing in.
- **Sabbath School Archive:** Past quarters browsable via "Browse Past Quarters" toggle in Sabbath School screen.
- **Internationalization (i18n):** 6 languages (EN, ES, FR, PT, FIL, ZH). Covers tabs, home greetings, auth screens, read tab, Sabbath School, connect, broadcasts, profile, study, and common strings.

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
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.
- **LiveKit Cloud:** Real-time video/audio conferencing.
- **react-native-webview:** Loads LiveKit room HTML on native.
- **react-native-maps@1.18.0:** Available for native map views (currently unused by Bible Maps, which uses atlas plates).
- **sharp:** SVG-to-PNG conversion for custom atlas map plate generation.