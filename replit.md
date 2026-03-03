# Grace through Faith — SDA Spiritual Formation App

## Overview
A mobile-first Seventh-day Adventist spiritual formation app, offering an immersive and comprehensive study experience. It features a unique "4-Layer Study Model" (Text, Context, Historic Voices, Application) powered by AI, along with offline capabilities. The app includes a Kids Club, devotional plans, prayer journaling, and a premium dark mode. Its vision is to be the definitive SDA hub — building mature disciples through structured Adventist identity formation, Bible study, prophecy, and daily spiritual disciplines.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application adopts a mobile-first architecture utilizing **Expo (React Native)** for the frontend, **Express.js** for the backend, and **PostgreSQL** with **Drizzle ORM** for data persistence. **TanStack Query** handles server state management with offline persistence, while React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`, and `server/routes.ts` manages API routing, database operations, and caching.

**SDA-First Architecture:**
- The app is fully SDA-dedicated. There is no multi-denomination framework, no tradition filtering, and no interdenominational positioning.
- All devotional plans (core + SDA-specific) are shown everywhere without tradition-based filtering.
- The `devotional_plan.tradition_key` column still exists in the schema for data categorization but the API defaults to `traditionKey=all`.
- The following files were removed during the SDA rebranding: `components/TraditionDisclaimer.tsx`, `app/christian-traditions.tsx`, `app/tradition/[id].tsx`, `lib/content-filter.ts`.
- `constants/traditions.ts` was simplified to SDA-only exports.

**UI/UX Decisions:**
- **Color Scheme:** Deep dark mode (`#050507`) with a warm gold accent (`#C9933A`). Kids Mode uses a distinct color palette. During Sabbath hours, `getSabbathTheme()` from `constants/colors.ts` shifts to warmer tones (dark: `#080806` bg, light: `#F7F0E0` bg, brighter gold `#D4A245` accent). Home screen reorders sections during Sabbath: Banner → Worship Pathways → Continue Formation → Verse → Analytics last (streak reduced prominence with lower opacity, smaller icon, muted color). SDA Hub heading becomes "Worship Pathways" during Sabbath.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Borderless design, immersive dark theme, focusing on readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant UI with custom tab bar, animated entrance effects, bouncy press effects, larger touch targets, and dynamic animations.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content. Includes segmented progress bar, per-layer completion tracking, journal prompts, study depth indicators, and deep study session mode.
- **AI Integration:** OpenAI's `gpt-4o-mini` generates on-demand context, commentary, application, and word study data, with all content cached.
- **Text-to-Speech (TTS):** Utilizes OpenAI's `gpt-audio model` via a server-side API, with `expo-speech` as a device fallback.
- **Offline Support & Proactive Prefetch:** React Query persistence via AsyncStorage provides an offline-first experience.
- **Search:** Keyword search with highlighting and reference parsing.
- **Socratic AI Study Guide:** Interactive guided study using the Inductive Method with AI tutor personas.
- **Visual Verse Mapper:** Interactive breakdown of verses into original language words (Strong's Concordance).
- **Strong's Concordance:** Comprehensive Greek/Hebrew entries accessible via the Word Study tab.
- **Pro/Paywall System:** Guards premium features with a 7-day trial.
- **Family Dashboard:** Premium feature for parents to track children's spiritual progress.
- **User Features:** Notes, highlights, bookmarks, prayer journal, and reading history with streak tracking.
- **Devotionals:** Browsing, enrollment, progress tracking, and interactive AI reflection discussions.
- **SDA Doctrinal Studies:** Dedicated screen for the 28 Fundamental Beliefs with external EGW Writings links.
- **Home Screen:** Verse of the Day, streak calendar, Continue Reading, guided tool cards (4-Layer Study, Prayer Journal), devotional plan progress, and SDA Hub cards (Church Connect, Small Groups, Study Paths).
- **Formation System (Study Paths):** Curriculum-based formation engine separate from devotional plans. 8 new DB tables: `formation_track`, `formation_module`, `formation_lesson`, `lesson_section`, `formation_assessment`, `assessment_item`, `progress_track`, `progress_lesson`. Each lesson has 6 sections: Anchor Text, Explain, Integrate (SDA theology), Practice, Reflection, Assessment. API routes: GET /api/tracks, GET /api/tracks/:id, GET /api/tracks/progress, GET /api/lessons/:id, POST /api/tracks/enroll, POST /api/lessons/:id/complete, POST /api/assessments/:id/submit, POST /api/modules/:id/confidence. Frontend screens: `app/study-paths.tsx` (browser), `app/study-path/[id].tsx` (track detail with module accordion + learning objectives), `app/lesson/[id].tsx` (full lesson view with section completion, inline assessment, and module completion summary modal). Modules have `learningObjective` column. Module completion triggers a summary modal showing module title, learning objective, avg assessment score, and 1-5 confidence self-check. Confidence ratings stored in `progress_track.module_confidence` (jsonb). Seeded with 3 tracks: 28 Beliefs Deep Dive, New Believer Path, Prophecy Foundations. Seed data in `server/seed-formation.ts`.

### Wave 1 — 28 Beliefs Deep Dive (Beliefs 1-7)

**Status: Complete and Fully Seeded**

Wave 1 delivers the foundational worldview core of the Adventist theological system. Beliefs 1-7 are now implemented as a structured theological course for lay members, using the existing formation engine.

**Scope Delivered**

Beliefs Included:
1. The Holy Scriptures
2. The Trinity
3. The Father
4. The Son
5. The Holy Spirit
6. Creation
7. The Nature of Humanity

Each belief module contains:
- 4 structured lessons: Biblical Foundations, Doctrinal Formulation, Practical Implications, Misunderstandings & Challenges
- 6 section types per lesson: Anchor, Explain, Integrate, Practice, Reflection, Assessment
- 5 assessment items per lesson (3 recall, 2 conceptual clarity)

**Totals:** 28 lessons, 168 lesson sections, 28 assessments, 140 assessment items

Beliefs 1-3 Lesson 1 retain original IDs (bl-001/002/003 from seed-formation.ts). All new Wave 1 records use the following ID scheme:
- Lessons: `w1l-*`
- Sections: `w1s-*`
- Assessments: `w1a-*`
- Assessment items: `w1i-*`

**Content Standards**

All content is:
- Original writing (no General Conference quarterly material used or paraphrased)
- Scripture-first in reasoning and structure
- Theologically aligned with the official 28 Fundamental Beliefs
- Written for intelligent lay believers (clear, reverent, non-academic tone)
- Linked externally to egwwritings.org where appropriate (no copyrighted embedding)

Wave 1 establishes the doctrinal core of the platform. Future waves will extend the same structured theological model to the remaining beliefs.

Seed files: `server/seed-beliefs-wave1.ts` (orchestrator), `server/seeds/wave1-beliefs-1-2.ts`, `server/seeds/wave1-beliefs-3-4.ts`, `server/seeds/wave1-beliefs-5-6.ts`, `server/seeds/wave1-belief-7.ts`.
- **Study Tab (formerly Discover):** Adventist Studies (28 Beliefs, Devotional Plans, Guided Study, Study Paths with enrolled track previews), Study Resources (Historic Voices), Study Tools (Bible Maps, Timeline), Popular Passages, Topics, and Adventist Resources (Worship Music).
- **Connect Tab (new):** Church Connect (map + list view), Small Groups (links to prayer groups), Live Streams (Jitsi Meet via WebView), Family Dashboard access.
- **About Page (`app/how-it-works.tsx`):** Feature overview + SDA mission statement + link to 28 Fundamental Beliefs.
- **Navigation:** 5-tab layout in adult mode (Home, Read, Connect, Study, You) and a distinct Kids mode tab navigation (Home, Stories, Learn, My Stars). Family and Plans tabs are hidden but accessible via routes.
- **Kids Story Engine:** Immersive scene-based storybook reader with AI-generated scenes and watercolor illustrations.
- **Small Groups 2.0:** Upgraded from Prayer Groups to a full SDA Small Groups system. Supports Bible Study, Prayer, Prophecy, Youth, and Sabbath School group types. Added columns to `prayer_groups`: `group_type`, `is_public`, `church_id`, `assigned_track_id`. Added `role` column to `prayer_group_member` (leader/moderator/member). New tables: `group_discussion`, `group_discussion_reply`, `group_announcement`. New API routes: GET /api/groups/public (browse with type/search filters), POST /api/groups/:id/assign-track, POST /api/groups/:id/promote, POST/GET /api/groups/:id/discussion(s), POST/GET /api/groups/:id/discussions/:id/reply/replies, POST/GET /api/groups/:id/announcement(s). Frontend: `app/groups.tsx` has My Groups + Browse tabs with search/filter; `app/group/[id].tsx` has 3 content tabs (Discussion, Prayer, Study Plan) with group role badges, member promotion, formation track assignment, and group progress display.
- **Family Groups:** Family units with invite codes, Prayer Wall and Kingdom Map.
- **Parent-Controlled Kids Mode:** PIN protection, child profiles with age tiers, per-child session tracking.

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

- **Live Streaming (Phase 5):** Jitsi Meet integration via WebView (native) and iframe (web). DB table: `live_session` with id, title, groupId, churchId, hostUserId, hostDisplayName, roomUrl, status (live/ended), participantCount, startedAt, endedAt. API routes: POST /api/streams/create (leader-only for group streams), GET /api/streams/active, GET /api/streams/:id, POST /api/streams/:id/end (host-only). Frontend: `app/stream/[id].tsx` renders Jitsi room. Group detail (`app/group/[id].tsx`) has "Go Live" button for leaders/moderators and "LIVE NOW" join banner. Home screen (`app/(tabs)/index.tsx`) has LiveNowSection showing active streams above the SDA Hub. Room names auto-generated as `gtf-{random12chars}` on `meet.jit.si`.
- **Church Connect:** SDA church finder with geo-radius search, map + list view. `app/church-connect.tsx` + `app/church/[id].tsx`. Uses `sda_church` table with geolocation data.

## External Dependencies (continued)
- **Jitsi Meet (meet.jit.si):** Free video conferencing for live streaming sessions.
- **react-native-webview:** WebView for embedding Jitsi Meet on native platforms.

- **Sabbath Experience Mode:** Astronomical sunset-based Sabbath detection with NOAA solar calculator (no external API). `lib/sabbath.ts` provides `getSunsetTime()`, `getSabbathWindow()`, and `useSabbath()` hook (location via expo-location with fallback). DB table: `sabbath_reflection` (id, userId, date, prompt, response, createdAt; unique on userId+date+prompt). API routes: GET /api/sabbath/reflections?userId&date, POST /api/sabbath/reflections (upsert). Home screen shows gold Sabbath banner during Sabbath hours ("Enter sacred time" CTA). `app/sabbath-experience.tsx` has 4 sections: Theological Framing (rotating Creation/Redemption/Identity/Mission themes), Reflection Prompts (3 journal questions with save), Worship Pathways (links to Sabbath School, Study Paths, Live Streams, Church Connect, Family Altar), and Closing Reflection (visible only within 2 hours of Saturday sunset).

## Upcoming Features (Placeholders in UI)
- **Additional Study Paths:** More formation tracks planned (Sabbath School, Prophecy Academy extended, Sabbath Formation, Character & Disciplines).
