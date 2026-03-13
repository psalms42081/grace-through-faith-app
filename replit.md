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
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer. It supports two presentation modes based on age group: **Cinematic Mode** (art-first animated storybook) and **Interactive Mode** (hotspot-based interactions). All kids progress/badge/streak routes use auth-derived identity, with server-side validation for data ownership.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text with historical context, classic commentaries, and AI-generated application content across three study depth levels. Passage state (book/chapter) is lifted to the StudyScreen parent and shared across all four layer tabs via props/callbacks, ensuring continuity when switching between Text, Context, Insight, and Transform layers. ScrollView resets to top on tab change.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, including a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs for high-quality voices, with fallback to `expo-speech` device voices.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history, and a unified "Saved" screen.
- **Semantic Search:** AI-powered natural language Bible search.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle with four distinct phases.
- **Church Connect:** A global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Supporter/Mission System:** Mission-driven donation model.
- **Small Groups 2.0:** Enhanced system for SDA small groups.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Belief cards with animated chevrons, scripture navigation, and authority hierarchy.
- **Great Controversy Timeline Engine:** An immersive vertical timeline tracing the cosmic conflict.
- **Content Engine & Study Resources:** A two-stage content pipeline (Source Packets and Generation) with a review workflow for AI-generated companions. Includes version-safe regeneration, rollback capabilities, and an Admin Pipeline API for content management.
- **Role System:** Supports "user," "editor," and "admin" roles with role-gated middleware for secure access.
- **Admin Review UI:** Internal content management screen for editors and admins with queue presets, smart filter chips, sorting, priority badges, and a review history feed.

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

## Production Hardening

### Pass 1 (Completed)
- **C1:** `POST /api/devotionals/reflect` requires auth (blocks API credit abuse).
- **C2:** `GET /api/devotionals/plans/:planId/days` uses `optionalAuth`.
- **H5:** Password minimum raised 4→8 chars (registration only; existing users unaffected).
- **H1:** Analytics routes wrapped in try-catch with 50-event cap.
- **H3:** `kids_progress` unique index `(userId, storyId)` was already in place.

### Pass 2 (Completed)
- **H3-upsert:** All `kids_progress` inserts (completion, quiz, memory verse, wonder answers) now use `onConflictDoUpdate` for race-condition safety.
- **C3:** TTS in-memory cache capped at 100 entries / 50MB with LRU eviction (prevents OOM under load).
- **H4:** `router.back()` calls in mutation callbacks replaced with `safeGoBack(router)` — falls back to `/(tabs)` when no history exists. Applied to: `stream/[id]`, `group/[id]`, `lesson/[id]`, `devotionals`, `devotional-day`, `verse-actions`.

### Navigation Safety
- `lib/safe-back.ts` exports `safeGoBack(router)` — use it instead of `router.back()` in programmatic navigation (mutation callbacks, timeouts).

### Onboarding/Tutorial Friction Reduction (Completed)
- **Onboarding slideshow:** Reduced from 4 pages to 2 (Welcome + Get Started). Removed Study Model and Experience pages.
- **Tutorial system:** Reduced from 9 tutorials (34 cards) to 3 contextual tutorials (1 card each):
  - **Kept (contextual, 1 card each):** bible-reader (on first Read tab visit), spiritual-rings (on first tap of rings card), prayer-journal (on first prayer journal visit)
  - **Removed entirely:** home (1), four-layer-study (6), connect (3), explore (3), profile (3), family-dashboard (4)
- **First-run experience:** Zero automatic interruptions after onboarding. User goes from 2-page onboarding straight to a fully usable home screen.
- Tutorial infrastructure (`TutorialContext`, `FeatureTutorial`, profile "Reset Tutorials") preserved for future use.

### Beta Hardening Pass 1 (Completed)
- **Error messaging:** Replaced all "Failed to..." user-facing error messages with human-friendly language ("Could not save...", "Please try again"). Removed raw `error.message` display from read.tsx.
- **Auth error guidance:** Verse bookmark/highlight errors now detect auth failures and show "Sign in to save..." guidance.
- **Supporter wording consistency:** ProGateModal title changed from "Supporter Features" to "Beta Preview". All "enjoy the full experience on us" and "contribute any amount" copy replaced with clear "Everything is free during beta. Donation support is coming soon." messaging across ProGateModal, MissionInviteModal, and family.tsx gate.
- **Family dashboard gate:** Changed from "Available to Supporters" / "Support the Mission" to "Free During Beta" / "Unlock Free Preview" with lock-open icon.
- **Server-side pro gate message:** Updated `checkProStatus` middleware message to "This feature requires an active account. All features are free during beta."
- **Live features de-emphasized:** Removed LiveNowSection from home screen (both Sabbath and weekday layouts). Removed Go Live button and related dead code from group pages. Live Streams in Connect tab already had "Soon" badge and non-clickable state.
- **Kids story art dominance:** Illustration aspect ratio increased (0.65 → 0.85) for art-first presentation. Placeholder icon sizes enlarged (48→56 loading, 56→64 failed). Interaction container uses shared `ILLUSTRATION_HEIGHT` constant.
- **Home/Study primary action hierarchy:** TodaysPath Daily Rhythm shows Read → Study → Pray; Study links to 4-layer study with passage params when available, falls back to explore tab. Explore tab has a prominent "4-Layer Bible Study" CTA card at the top routing to study with intro. Removed misplaced "Pick a passage" banner from study.tsx.

### Beta Hardening Pass 2 — Hierarchy + Clarity (Completed)
- **Home hierarchy:** Reordered sections: TodaysPath → Verse → ContinueCard → GuidedTools → Divider → SpiritualRings → Feedback. Rings moved to secondary position below gold divider in both regular and Sabbath layouts.
- **Study hierarchy:** Enrolled tracks moved up (right after 4-Layer CTA). Reference section, Beloved Passages, and Spiritual Themes given smaller `sectionSubhead` styling. Bible Maps and Timeline consolidated into single ListItem.
- **Connect consolidation:** Four sections merged to two: "Find & Connect" (Church, Groups, Family) and "Watch & Listen" (Broadcasts, Radio, Live Streams). Live Streams moved last. i18n keys added for new section headers.
- **Read loading skeleton:** Replaced bare centered ActivityIndicator with 10-row skeleton placeholder during book list loading.
- **Study loading text:** Added descriptive labels to all bare spinner states in 4-layer study tabs (verses, historical context, commentaries, application guide).

### Story Art Performance Pass (Completed)
- **expo-image migration:** `CinematicScene.tsx` and `LivingScene.tsx` switched from RN `Image` to `expo-image` with `cachePolicy="disk"`, `recyclingKey`, and 200ms `transition` for smooth reveal.
- **SceneIllustration** in `story/[id].tsx` also uses `expo-image` with disk caching.
- **Smart prefetch:** Changed from prefetching all 6 scenes simultaneously (~10MB) to prefetching first 2 immediately, then remaining 4 after a 3-second delay. Uses `expo-image`'s `prefetch` for disk-cached downloads.
- **Immutable cache headers:** `/assets/kids-scenes/` served with `maxAge: 7d, immutable: true` (scene art never changes after generation).
- **Image specs:** Scene art is 1280x896 PNG, ~1.5-2MB each. Generated by AI and stored in `assets/kids-scenes/`.

### Study Product Clarity (Completed)
- **4-Layer completion enriched:** StudyCompletionScreen now shows study depth (Emerging/Developing/Established), journal reflections (expandable), copyable/shareable study summary text, and prayer save CTA — matching the Guided Mode summary in richness.
- **Mode distinction:** "Guided Deep Study" renamed to "Guided Mode" everywhere (DeepStudyIntro, DeepSessionBar, DeepStudyEntryButton, options dropdown, resume bar, completion screen). Subtitles clarify it as "Step-by-step walkthrough with prompts" — clearly a mode of the same 4-Layer Study, not a separate product.
- **Smart entry behavior:** When returning to study with `showIntro=true` and a passage with layers in progress, the intro is auto-skipped. When all layers are already complete, the completion screen is auto-shown. Loading gate prevents flash of intro while book/completion data resolves.
- **CTA priority fix:** "View Study Summary" button appears on ALL tabs when all layers done (not just the last tab).
- **Resume bar:** Persistent "Resume Guided Mode" bar appears below session bar when guided session is paused. Resume at layer 0 now works correctly.
- **Layer naming:** Internal codes word/context/voices/application display as Observe/Context/Insight/Respond. Summary text header changed from "DEEP STUDY SUMMARY" to "STUDY SUMMARY".

### Study Screen Architecture (Completed)
- **Explore (Study tab) reorganized:** Sections restructured from flat "Adventist Reference & Formation" + "Study Tools" into clear semantic groups: "Study with Guidance" (Study Guide, Devotionals), "Learning Paths" (Study Paths, 28 Beliefs, Resources), "Prophecy & End Times" (Explorer, Great Controversy), "Reference" (Historic Voices, Maps).
- **Product naming clarity:** "Guided Study" renamed to "Study Guide" everywhere it refers to the AI Socratic tutor at `/study-guide` (explore.tsx, verse-actions.tsx, study-guide.tsx header, ProGateModal, useResumeJourney hook, all i18n locale files). This prevents confusion with "Guided Mode" (the structured session inside 4-Layer Study).
- **Prophecy section clarity:** Prophecy Explorer and Great Controversy Timeline grouped under dedicated "Prophecy & End Times" section with more descriptive subtitles.