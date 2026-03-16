# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed as the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. It provides an immersive study experience through a "4-Layer Study Model" powered by AI, offering offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture. The frontend uses Expo (React Native), the backend uses Express.js, and PostgreSQL with Drizzle ORM handles data persistence. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`. All devotional content is presented without tradition-based filtering, specifically designed for Seventh-day Adventists.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer with Cinematic and Interactive modes.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text with historical context, classic commentaries, and AI-generated application content across three study depth levels, ensuring continuity between layers.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, including a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs for high-quality voices, with fallback to `expo-speech` device voices.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history, and a unified "Saved" screen.
- **Semantic Search:** AI-powered natural language Bible search.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle with four distinct phases.
- **Church Connect:** A global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines. Ring labels use tiny thumbnail images (`assets/home-cards/ring-study.png`, `ring-prayer.png`, `ring-engage.png`) instead of vector icons.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Supporter/Mission System:** Mission-driven donation model.
- **Live Fellowship:** Community feature (formerly Small Groups) with structured group experience — Discussion, Prayer, Devotional, Study, and Live tabs. "Live Now" section surfaces active sessions at the top of the groups list. LiveKit Cloud powers real-time video/audio via WebView. Leaders can start sessions; members can join from the group's Live tab or the Live Now section.
- **Visual Design System:** Premium image-based cards replacing icons across the entire app. Home screen "Your Daily Rhythm" (Read/Study/Pray) uses full-width image banner cards with LinearGradient overlays (`assets/home-cards/`). DevotionalCard uses `study-guide.png` background. Connect page uses atmospheric image cards (`assets/connect-cards/`). Study tab reorganized into 3 sections (Spiritual Themes, Bible Study Tools, Adventist Studies) with 15 full-width image cards (`assets/topic-cards/`). All imagery follows warm lighting, natural colors, shallow depth of field, calm/reverent tone. No colored gradient tiles remain.
- **Bible Book Cover Art:** 66 AI-generated classical Renaissance-style paintings, one per Bible book (`assets/bible-books/`). Mapped via `constants/bible-books.ts` with `getBookImage(bookName)` lookup. Used in Verse of the Day, Beloved Passages carousel, and study cards.
- **SDA Speakers Experience:** In-app browsing of 15 curated SDA speakers/ministries (`constants/sda-speakers.ts`). Speakers screen at `/speakers` with topic filtering (includes Three Angels, Health). Speaker detail at `/speaker/[id]` with embedded YouTube playback via WebView. Real speaker photos in `assets/speakers/` for 14 of 15 speakers sourced from official ministry websites (amazingfacts.org, 3abn.org, itiswritten.com, NAD Adventist, arise.online, jesus101.tv, sumtv.org, gmitv.org, revelationofhope.com); Walter Veith uses colored initials fallback. `getSpeakerImage(id)` returns require() source. Accessed from Connect tab "Watch and Listen" section.
- **Broadcasts:** 5 SDA broadcast networks with real ministry logos (`assets/ministry-logos/`): Hope Channel (official SDA network), 3ABN, Amazing Facts, It Is Written, Breath of Life. Cards show logo images, Watch Live (WebView), and Open Website buttons. Hope Channel listed first as the official denominational network.
- **Kids Star Shop:** Cosmetic rewards store (`app/kids/shop.tsx`) with 16 items across 3 categories (avatar frames, themes, celebration effects). Prices 8-25 stars. Purchase/equip API at `/api/kids/shop/*`. Catalog in `constants/kids-shop.ts`. Accessed from My Stars tab.
- **Kids Daily Quests:** 3 daily quests (Read Story, Practice Verse, Take Quiz) shown on Kids home screen. Auto-completed via existing progress endpoints. Daily Champion bonus for completing all 3. API at `/api/kids/quests/*`. DB tables: `kids_purchases`, `kids_daily_quests`.
- **AI Ethics & Transparency Layer:** Comprehensive AI disclosure system following SDA Church guidelines. Reusable `AIDisclosure` component (`components/AIDisclosure.tsx`) with inline, banner, and notice variants. "AI-assisted" labels on all AI-generated content surfaces (study guide, devotional reflections, Great Controversy insights, Chapter Insights panel, reading plan generator, Sabbath School discussions). Dedicated "AI Use & Ethics" screen (`app/ai-guidelines.tsx`) covering Scripture-first principle, theological integrity, transparency, human connection, privacy, and limitations. Accessible from Profile > Help section. AI prompts already enforce strict SDA doctrinal guardrails (Sabbath, state of the dead, health message, no speculative theology).
- **Feedback System:** Dedicated feedback screen (`app/feedback.tsx`) with full form — feedback type selector (Bug, Suggestion, Content Issue, Performance, Other), message field, context field, email field. Submits to `POST /api/feedback` with `context`, `email`, `appVersion`, `platform` columns. DB table: `user_feedback`. FeedbackWidget card on Home navigates to `/feedback`.
- **In-App Sermon Player:** Dedicated sermon player screen (`app/sermon-player.tsx`) with embedded YouTube iframe (web) / WebView (native). Shows sermon title, speaker name, "Open in YouTube" secondary button. Proper back navigation: player → speaker detail → speakers → connect. Speaker detail video cards route to in-app player instead of opening YouTube externally.
- **Skeleton Loading States:** Reusable skeleton components (`components/ui/Skeleton.tsx`) — VerseCardSkeleton, BannerCardSkeleton, SpeakerCardSkeleton, SermonCardSkeleton, ContentLoadingMessage, LoadingTimeout. Integrated in resources screen, groups screen. Contextual loading text added to devotionals, resources screens.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media. 14 topics total including SDA-distinctive: Health Message (body temple, NEWSTART, Daniel's diet) and Three Angels' Messages (Revelation 14, mark of the beast, remnant, loud cry).
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Belief cards with animated chevrons, scripture navigation, and authority hierarchy.
- **Great Controversy Timeline Engine:** An immersive vertical timeline tracing the cosmic conflict.
- **Study Screen Architecture:** Finalized Study tab with "Study Scripture" hero section containing three inline study mode cards (Quick Read → reader, Guided Study → AI Socratic tutor at `/study-guide`, Deep Study → 4-Layer study with state-aware subtitle showing resume/progress). Below the hero: "Continue Your Journey" (active 4-layer progress + enrolled non-hub-owned paths), then demoted secondary sections — "Learning Paths" (Study Paths, Devotional Plans, Study Resources), single "Prophecy & End Times" entry → prophecy hub, "Reference" (Historic Voices, Fundamental Beliefs, Bible Maps & Timeline), and bottom browse sections (Beloved Passages, Spiritual Themes).
- **Prophecy Hub:** `/prophecy-hub` is the single top-level prophecy entry point. Contains three sub-modes: Prophecy Explorer (reference), Guided Prophecy Study (learning path → `/study-paths?filter=prophecy`), Great Controversy Timeline (narrative overview). No separate prophecy entries exist on the Study screen.
- **Beliefs Hub:** "Fundamental Beliefs" in Reference → `/sda-studies` is the single beliefs entry. Contains browse (28 belief cards) and "Deep Dive Study Path" banner → `/study-paths?filter=beliefs`. No separate beliefs entries exist in Study Paths default view.
- **Study Paths Filtering:** `/study-paths` hides `beliefs` and `prophecy` categories in default view (accessed from Study screen). When accessed with `?filter=beliefs` or `?filter=prophecy`, shows only that category with contextual title. Enrolled tracks from hub-owned categories are also filtered from the Study screen's enrolled tracks preview.
- **Guided Study Passage Picker:** study-guide.tsx hub now has an inline book/chapter picker (NT first, OT below) instead of redirecting to the Bible reader. Selecting a book shows chapter grid; selecting a chapter fetches verse 1 from `/api/passage` and auto-launches the AI tutor session with passage params.
- **Content Engine & Study Resources:** A two-stage content pipeline (Source Packets and Generation) with a review workflow, version-safe regeneration, and rollback capabilities.
- **Role System:** Supports "user," "editor," and "admin" roles with role-gated middleware.
- **Admin Review UI:** Internal content management screen for editors and admins with review workflow features.

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
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.