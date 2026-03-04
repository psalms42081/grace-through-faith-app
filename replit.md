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
- **Broadcasts:** Non-hosted streaming hub for SDA ministry broadcasts (`app/broadcasts.tsx`). Accessible from Connect tab > Community section. Shows two large cards for 3ABN (Live) and Amazing Facts TV (Live), each with "Watch Live" (opens in-app WebView) and "Open Website" buttons. WebView error state falls back to external browser. Config array `broadcastSources` in the screen file. No re-hosting, no social/share mechanics. Disclaimer banner clarifies Grace through Faith does not host broadcast content.
- **Sabbath Mode (Lesson Screen):** UI-only mode toggle on the lesson screen (`app/lesson/[id].tsx`). A pill toggle ("Study" / "Sabbath") in the header right corner. Persisted via AsyncStorage (`@lesson_sabbath_mode`). When active: hides progress dots, hides per-section "Mark Complete" buttons and checkmarks, hides bottom "Complete Lesson" bar, adds "Sabbath Reading" banner with subtext "Slow down. Read prayerfully.", increases body font to 17px/28 line-height with extra padding, shows a floating action button (ellipsis icon) that opens a bottom sheet with: Complete Lesson (if all sections done), Mark Section Complete (for incomplete sections), Jump to Section, Copy Anchor Verse, Explain Passage. Does not affect backend progress tracking. Loading state gates on AsyncStorage read to prevent UI flash.

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

### Wave 2 — 28 Beliefs Deep Dive (Beliefs 8-11)

**Status: Complete and Fully Seeded**

Wave 2 covers the soteriological and experiential core of Adventist theology — the cosmic conflict, Christ's atoning work, the experience of salvation, and spiritual growth.

**Scope Delivered**

Beliefs Included:
8. The Great Controversy
9. The Life, Death, and Resurrection of Christ
10. The Experience of Salvation
11. Growing in Christ

Each belief module contains:
- 4 structured lessons: Biblical Foundations, Doctrinal Formulation, Practical Implications, Misunderstandings & Challenges
- 6 section types per lesson: Anchor, Explain, Integrate, Practice, Reflection, Assessment
- 5 assessment items per lesson (3 recall, 2 conceptual clarity)

**Totals:** 16 lessons, 96 lesson sections, 16 assessments, 80 assessment items

All Wave 2 records use the `w2` ID prefix scheme (`w2l-*`, `w2s-*`, `w2a-*`, `w2i-*`).

Content standards identical to Wave 1. Seed files: `server/seed-beliefs-wave2.ts` (orchestrator), `server/seeds/wave2-belief-8.ts`, `server/seeds/wave2-belief-9.ts`, `server/seeds/wave2-belief-10.ts`, `server/seeds/wave2-belief-11.ts`.

### Wave 3 — 28 Beliefs Deep Dive (Beliefs 12-18)

**Status: Complete and Fully Seeded**

Wave 3 covers the ecclesiological and missional core — the church, its remnant identity, unity, ordinances, spiritual gifts, and the prophetic gift.

**Scope Delivered**

Beliefs Included:
12. The Church
13. The Remnant and Its Mission
14. Unity in the Body of Christ
15. Baptism
16. The Lord's Supper
17. Spiritual Gifts and Ministries
18. The Gift of Prophecy

Each belief module contains:
- 4 structured lessons: Biblical Foundations, Doctrinal Formulation, Practical Implications, Misunderstandings & Challenges
- 6 section types per lesson: Anchor, Explain, Integrate, Practice, Reflection, Assessment
- 5 assessment items per lesson (3 recall, 1 conceptual, 1 scenario-based)

**Totals:** 28 lessons, 168 lesson sections, 28 assessments, 140 assessment items

All Wave 3 records use the `w3` ID prefix scheme (`w3l-*`, `w3s-*`, `w3a-*`, `w3i-*`).

**Special Guardrails Applied:**
- Remnant (Belief 13): Presented with humility and mission focus; avoids triumphalism
- Ordinances (Beliefs 15-16): Affirm physical church practice; app is supportive, not a replacement
- Gift of Prophecy (Belief 18): EGW subordinate to Scripture; external links only; emphasizes biblical tests

Content standards identical to Wave 1. Seed files: `server/seed-beliefs-wave3.ts` (orchestrator), `server/seeds/wave3-beliefs-12-13.ts`, `server/seeds/wave3-beliefs-14-15.ts`, `server/seeds/wave3-belief-16.ts`, `server/seeds/wave3-belief-17.ts`, `server/seeds/wave3-belief-18.ts`.

### Wave 4 — 28 Beliefs Deep Dive (Beliefs 19-28)

**Status: Complete and Fully Seeded**

Wave 4 completes the 28 Beliefs Deep Dive, covering the law and lifestyle cluster, the sanctuary, and the full eschatological arc from second coming through new earth.

**Scope Delivered**

Beliefs Included:
19. The Law of God
20. The Sabbath
21. Stewardship
22. Christian Behavior
23. Marriage and the Family
24. Christ's Ministry in the Heavenly Sanctuary
25. The Second Coming of Christ
26. Death and Resurrection
27. The Millennium and the End of Sin
28. The New Earth

Each belief module contains:
- 4 structured lessons: Biblical Foundations, Doctrinal Formulation, Practical Implications, Misunderstandings & Challenges
- 6 section types per lesson: Anchor, Explain, Integrate, Practice, Reflection, Assessment
- 5 assessment items per lesson (3 recall, 1 conceptual, 1 scenario-based)

**Totals:** 40 lessons, 240 lesson sections, 40 assessments, 200 assessment items

All Wave 4 records use the `w4` ID prefix scheme (`w4l-*`, `w4s-*`, `w4a-*`, `w4i-*`).

**Special Guardrails Applied:**
- Law of God (Belief 19): Anchored in covenant relationship; harmony of law and grace; no legalism tone
- Sabbath (Belief 20): Creation/redemption/rest emphasis; calm sacred tone; no culture-war framing
- Stewardship (Belief 21): Whole-life scope (time, health, influence, resources); no guilt-based tone
- Christian Behavior (Belief 22): Fruit of salvation, not ladder to it; no moral checklist framing
- Marriage & Family (Belief 23): Faithful to Adventist teaching; pastoral, not combative; no political framing
- Heavenly Sanctuary (Belief 24): High precision; calm articulation of investigative judgment; no inflammatory language
- Eschatology (Beliefs 25-28): Hope-centered, Christ-centered; no speculative timelines; no sensationalism; systematic and biblical; restorationist vision

Content standards identical to Wave 1. Seed files: `server/seed-beliefs-wave4.ts` (orchestrator), `server/seeds/wave4-beliefs-19-20.ts`, `server/seeds/wave4-beliefs-21-22.ts`, `server/seeds/wave4-beliefs-23-24.ts`, `server/seeds/wave4-beliefs-25-26.ts`, `server/seeds/wave4-beliefs-27-28.ts`.

### 28 Beliefs Deep Dive — Complete Track Summary

**All 28 fundamental beliefs are now fully seeded across 4 waves.**

| Wave | Beliefs | Lessons | Sections | Assessments | Items |
|------|---------|---------|----------|-------------|-------|
| 1    | 1-7     | 25*     | 150      | 25          | 125   |
| 2    | 8-11    | 16      | 96       | 16          | 80    |
| 3    | 12-18   | 28      | 168      | 28          | 140   |
| 4    | 19-28   | 40      | 240      | 40          | 200   |
| **Total** | **1-28** | **109** | **654** | **109** | **545** |

*Wave 1 includes 3 lessons from initial seed (bl-001/002/003) plus 22 wave-1 lessons.

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

### Internationalization (i18n)

**Status: Implemented**

Full i18n system using `i18next` + `react-i18next` + `expo-localization`.

**Supported Locales:** English (en), Spanish (es), French (fr), Portuguese (pt), Filipino (fil), Chinese (zh).

**Architecture:**
- `lib/i18n/index.ts` — i18n initialization, language change helpers, device locale detection
- `lib/i18n/locales/{en,es,fr,pt,fil,zh}.json` — locale string files with namespaced keys (tabs, home, connect, broadcasts, profile, study, common)
- `components/BroadcastCard.tsx` — extracted broadcast card component (uses i18n internally)
- AsyncStorage key: `@grace-through-faith/preferredLanguage` — persists user's language choice
- `initI18n()` called in root layout before splash screen hides
- `SUPPORTED_LANGUAGES` exported from `lib/i18n` for language picker UI

**Scope:**
- UI strings only — Scripture text and theological lesson content are NOT translated
- Tab labels (ClassicTabLayout), Connect tab, Broadcasts screen, Profile/You tab (stats, growth, badges, Quick Links)
- Language Selector in Profile > Quick Links — expandable picker with all 6 languages + "Use device language" option
- Device locale auto-detection via `expo-localization` `getLocales()` with fallback to English
- **First-launch auto-detection:** On first app launch, detects device language. If supported, automatically sets BOTH UI language AND content language to match. Uses `FIRST_LAUNCH_KEY` (`@grace-through-faith/firstLaunchDone`) to avoid overriding user choices on subsequent launches. Flow: install → detect device locale → if supported, set app + content language → mark first launch done.
- NativeTabs labels use SF Symbols (not translatable); only ClassicTabLayout titles are translated

**Key Functions:**
- `setLanguage(code)` — sets language + persists to AsyncStorage
- `useDeviceLanguage()` — clears stored preference, reverts to device locale
- `getSavedLanguage()` — returns stored preference or null

### Content Translation Architecture (Phase 3A-3E)

**Status: Implemented (infrastructure ready, no translations loaded yet)**

Scalable multi-language overlay system for lesson/module/section/assessment content. English remains canonical in base tables; localized content stored in overlay tables keyed by (entityId, language).

**Database Tables (Phase 3A):**
- `formation_module_i18n` — (id, module_id FK, language, title, description) UNIQUE(module_id, language)
- `formation_lesson_i18n` — (id, lesson_id FK, language, title, summary) UNIQUE(lesson_id, language)
- `lesson_section_i18n` — (id, section_id FK, language, heading, content) UNIQUE(section_id, language)
- `assessment_item_i18n` — (id, item_id FK, language, question, options jsonb, explanation) UNIQUE(item_id, language)
- Schema definitions in `shared/schema.ts` (CONTENT_LANGUAGES const, all 4 i18n table exports + types)

**Backend Resolution (Phase 3B):**
- `resolveContentLang(req)` helper in routes.ts — extracts `?lang=` param, normalizes, validates against CONTENT_LANGUAGES
- GET /api/tracks/:id — resolves module titles, lesson titles, section content via left-join pattern
- GET /api/lessons/:id — resolves lesson title, section content, assessment items
- Fallback: if no i18n row found for requested language, returns canonical English content
- No i18n applied to GET /api/tracks (list view uses track titles, not module content)

**Frontend Integration (Phase 3C):**
- `lib/content-language.ts` — content language persistence (AsyncStorage key: `@grace-through-faith/contentLanguage`)
- `contexts/ContentLanguageContext.tsx` — React context providing `resolvedLang`, `contentLangOption`, `setContentLang`
- ContentLanguageProvider wraps app in `_layout.tsx`
- Content Language picker in Profile > Quick Links (below UI Language picker)
- Options: "Same as App Language" (default), English, Espanol, Francais, Portugues, Filipino, Chinese
- `app/lesson/[id].tsx` and `app/study-path/[id].tsx` append `&lang={resolvedLang}` to queryKeys when not English
- i18n keys added to all 6 locale files: `profile.contentLanguage`, `profile.sameAsApp`, `profile.contentLangNote`

**Content Pipeline (Phase 3D):**
- `scripts/generate-i18n-stubs.ts` — generates JSON stub files per language for translation review
  - Usage: `npx tsx scripts/generate-i18n-stubs.ts --beliefs 19-28` or `npx tsx scripts/generate-i18n-stubs.ts bmod-019`
  - Output: `i18n-content/{lang}/{moduleId}.json` with all lessons, sections, assessment items
  - Each file has `_meta.reviewed: false` flag
- `scripts/import-content-translations.ts` — upserts reviewed translations into i18n tables
  - Usage: `npx tsx scripts/import-content-translations.ts i18n-content/es/bmod-019.json`
  - Skips files not marked `_meta.reviewed: true`
  - Uses `onConflictDoNothing()` for safe re-runs

**Design Decisions:**
- Scripture text is NOT translated via this system — it stays tied to the Bible translation selector
- Progress tracking unaffected — still keyed to canonical lesson/section IDs
- No duplication of formation tracks/modules per language — localization is overlays only
- Gradual rollout: start English-only, add languages module-by-module as translations are reviewed

## Upcoming Features (Placeholders in UI)
- **Additional Study Paths:** More formation tracks planned (Sabbath School, Prophecy Academy extended, Sabbath Formation, Character & Disciplines).
