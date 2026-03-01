# Grace through Faith — Technical Project Summary
**Prepared for External Code Review**

---

## 1. Core Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Expo (React Native) + React Native Web | Cross-platform mobile-first app (iOS, Android, Web) |
| **Backend** | Express.js (TypeScript) | RESTful API server on port 5000 |
| **Database** | PostgreSQL + Drizzle ORM | Relational data store with type-safe schema |
| **State Management** | TanStack React Query + AsyncStorage | Server state caching with offline persistence (30-day GC) |
| **AI** | OpenAI gpt-4o-mini | On-demand content generation (context, cross-references, study guides) |
| **TTS** | OpenAI gpt-audio + expo-speech | Dual-engine text-to-speech with 6 voice options |
| **External API** | HelloAO Bible API | Public domain commentary (Matthew Henry, Adam Clarke, JFB, John Gill) |
| **Routing** | Expo Router (file-based) | 30 screen files, 5-tab layout |
| **Typography** | Lora (serif) + Inter (sans-serif) | Google Fonts via @expo-google-fonts |

### Project Size

- **65 TypeScript files**, ~19,870 lines of code
- **30 screen files** in `app/` directory
- **738 lines** of database schema (28 tables)
- **2,114 lines** of API routes (67 endpoints)
- **18 seed scripts** for data population

### Component Interaction Flow

```
[Expo Frontend (port 8081)]
    |
    |-- TanStack Query (default fetcher in lib/query-client.ts)
    |       |-- Queries: GET requests via queryKey string
    |       |-- Mutations: POST/PATCH/DELETE via apiRequest()
    |       |-- Cache: AsyncStorage persistence for offline
    |
    v
[Express Backend (port 5000)]
    |
    |-- /api/* routes (server/routes.ts)
    |       |-- Bible text: /api/passage, /api/books, /api/verse, /api/search
    |       |-- Study tools: /api/context, /api/commentary, /api/application, /api/strong/*
    |       |-- AI features: /api/study-guide/*, /api/verse-map/*, /api/chapter-context/*
    |       |-- User data: /api/notes, /api/highlights, /api/bookmarks, /api/prayers
    |       |-- Devotionals: /api/devotionals/*
    |       |-- Kids: /api/kids/*
    |       |-- Stats: /api/reading-history, /api/reading-streaks/*
    |       |-- TTS: /api/tts
    |
    v
[PostgreSQL Database]
    |-- 28 tables via Drizzle ORM
    |-- Bible data: translations, books, verses (31,102 KJV verses + ASV + WEB)
    |-- Strong's Concordance: 14,220 entries (8,673 Hebrew + 5,547 Greek)
    |-- AI cache tables: context_card, verse_map_cache, chapter_context_cache, study_guide_sessions
    |-- User tables: notes, highlights, bookmarks, prayers, reading_history, streaks
    |-- Kids tables: collections, stories, quiz_questions, progress, badges, streaks
    |-- Content tables: devotional_plan, devotional_day, locations, timeline_events
    |
    v
[External Services]
    |-- OpenAI API (gpt-4o-mini): AI content generation
    |-- HelloAO Bible API: Public domain commentary
    |-- egwwritings.org: External link target for EGW references
    |-- Unsplash: Verse of the Day background photos (via static URLs)
```

### Shared State Architecture

| State Type | Technology | Scope |
|-----------|-----------|-------|
| Server state | TanStack React Query | All API data, offline-persisted |
| Translation preference | `TranslationContext` (React Context + AsyncStorage) | Global Bible translation setting |
| Kids mode | `KidsModeContext` (React Context + AsyncStorage) | Kids mode toggle, age group, PIN gate |
| Local UI state | `useState` | Per-component (pickers, expanded states, etc.) |

---

## 2. Feature Mapping

### Core Bible Features

| Feature | Frontend File(s) | Backend Endpoint(s) | Database Table(s) |
|---------|-----------------|---------------------|-------------------|
| Bible Reader | `app/read/[bookId]/[chapter].tsx` | `GET /api/passage` | `bible_verse`, `bible_book`, `bible_translation` |
| Book/Chapter Selection | `app/(tabs)/read.tsx`, `app/read/[bookId]/index.tsx` | `GET /api/books` | `bible_book` |
| Verse Actions (tap any verse) | `app/verse-actions.tsx` | — | — |
| Search (keyword + reference) | `app/(tabs)/search.tsx` | `GET /api/search`, `GET /api/search/reference` | `bible_verse` |
| Multi-translation (KJV, ASV, WEB) | `context/TranslationContext.tsx` | `GET /api/passage?translation=` | `bible_translation`, `bible_verse` |

### 4-Layer Study Model

| Layer | Frontend | Backend | Database |
|-------|----------|---------|----------|
| **Text** | Chapter reader with inline verse numbers | `GET /api/passage` | `bible_verse` |
| **Context** | `app/passage-context.tsx`, `app/(tabs)/study.tsx` (Context tab) | `GET /api/context`, `POST /api/context/generate` | `context_card` |
| **Historic Voices** | `app/(tabs)/study.tsx` (Voices tab) | `GET /api/commentary`, `POST /api/commentary/generate` | `commentary_entry`, `commentator` |
| **Application** | `app/(tabs)/study.tsx` (Application tab) | `GET /api/application`, `POST /api/application/generate` | `application_template` |

### AI-Powered Features

| Feature | Frontend | Backend | AI Model | Cache Table |
|---------|----------|---------|----------|-------------|
| Socratic Study Guide | `app/study-guide.tsx` | `POST /api/study-guide/start`, `POST /api/study-guide/respond` | gpt-4o-mini | `study_guide_sessions` |
| Visual Verse Mapper | `app/verse-map.tsx` | `GET /api/verse-map/:verseId`, `POST /api/verse-map/generate` | gpt-4o-mini | `verse_map_cache` |
| 4D Scripture Context Panel | Inline in `app/read/[bookId]/[chapter].tsx` | `GET /api/chapter-context/:bookId/:chapter` | gpt-4o-mini | `chapter_context_cache` |
| Word Study (Strong's) | `app/(tabs)/study.tsx` (Word tab), `app/word-study.tsx` | `POST /api/strong/generate`, `GET /api/strong/search` | gpt-4o-mini | `strong_entry`, `verse_strong_map` |
| Context Generation | `app/passage-context.tsx` | `POST /api/context/generate` | gpt-4o-mini | `context_card` |
| Application Generation | `app/(tabs)/study.tsx` | `POST /api/application/generate` | gpt-4o-mini | `application_template` |
| Text-to-Speech | `app/read/[bookId]/[chapter].tsx` | `POST /api/tts` | gpt-audio | — (streamed) |

### User Features

| Feature | Frontend | Backend | Database |
|---------|----------|---------|----------|
| Prayer Journal | `app/prayer-journal.tsx` | `GET/POST/PATCH/DELETE /api/prayers` | `prayer_request` |
| Notes | — (via study tab) | `GET/POST /api/notes/:userId` | `user_note` |
| Highlights | — (via verse actions) | `GET/POST /api/highlights/:userId` | `user_highlight` |
| Bookmarks | — (via verse actions) | `GET/POST/DELETE /api/bookmarks` | `user_bookmark` |
| Reading History | Automatic on chapter load | `POST /api/reading-history` | `reading_history` |
| Reading Streaks | Home screen, Profile tab | `GET /api/reading-streaks`, `GET /api/reading-streaks/weekly` | `reading_streak` |
| Devotional Plans | `app/(tabs)/plans.tsx`, `app/devotionals.tsx`, `app/devotional-day.tsx` | `GET/POST /api/devotionals/*` | `devotional_plan`, `devotional_day`, `user_plan_enrollment`, `user_plan_progress` |

### Content Sections

| Feature | Frontend | Data Source |
|---------|----------|------------|
| 12 Topic Pages | `app/topic/[id].tsx` | Hardcoded curated content in `constants/speakers.ts` |
| Christian Music | `app/music.tsx` | Hardcoded categories with external links |
| Family & Faith | `app/family.tsx` | Hardcoded with speaker avatars |
| Maps & Timeline | `app/maps-timeline.tsx` | `location`, `timeline_event` tables + seed data |
| SDA 28 Beliefs | `app/sda-studies.tsx` | Hardcoded beliefs with EGW external links |

### Kids Club

| Feature | Frontend | Backend | Database |
|---------|----------|---------|----------|
| Stories (3 age groups) | `app/(tabs)/kids-stories.tsx`, `app/kids-story/[id].tsx` | `GET /api/kids/collections`, `GET /api/kids/stories/:id` | `kids_collection`, `kids_story` |
| Quizzes | `app/(tabs)/kids-learn.tsx` | `GET /api/kids/stories/:id/quiz`, `POST /api/kids/progress/quiz` | `kids_quiz_question`, `kids_progress` |
| Memory Verses | `app/(tabs)/kids-learn.tsx` | `POST /api/kids/progress/memorize` | `kids_progress` |
| Badges & Stars | `app/(tabs)/kids-stars.tsx` | `GET /api/kids/badges`, `GET /api/kids/badges/:userId` | `kids_badge`, `kids_user_badge` |
| Parental PIN gate | `context/KidsModeContext.tsx` | — (client-side) | — (AsyncStorage) |
| Age Groups | Little Lambs, Young Disciples, Young Adults | Filtered by `ageGroup` query param | `age_group` field on collections/stories |

---

## 3. User Flow

### Primary Reading Flow

```
1. App Launch -> Onboarding (first time) OR Home Tab
2. Home Tab: Verse of the Day, streak calendar, continue reading card, featured plans
3. Read Tab: Book grid (66 books) -> Chapter list -> Chapter Reader
4. Chapter Reader:
   a. Continuous prose view with inline verse numbers
   b. Tap verse -> Verse Actions sheet:
      - Copy, Highlight, Bookmark
      - Words (Strong's), Context, Voices (commentary)
      - Verse Map (visual breakdown)
      - Guided Study (Socratic AI)
   c. Compass button -> 4D Scripture Panel (Places/Timeline/Figures/Culture)
   d. TTS playback bar (play/pause/stop, voice selection, speed control)
   e. Translation picker (KJV/ASV/WEB)
   f. Scroll past text -> Related Content section:
      - 4-Layer Study cards (Context, Voices, Word Study, Application)
      - Related topics
      - Devotional plans
      - Adjacent chapters
```

### Study Flow

```
1. From verse tap -> Verse Actions:
   a. "Verse Map" -> Visual Verse Mapper:
      - Original Language words (Strong's cards)
      - AI cross-references (8-10 related verses)
      - Historical context snippet
      - "Study This Verse" -> launches Socratic Guide
   b. "Guided Study" -> Socratic AI Study Guide:
      - Phase 1: Observe (2 exchanges)
      - Phase 2: Interpret (2 exchanges)
      - Phase 3: Apply (2 exchanges)
      - Completion summary
2. From Related Content -> Study Tab:
   - Word Study: Strong's Concordance search + verse analysis
   - Context: Historical/cultural cards
   - Historic Voices: Commentary from 4 scholars
   - Application: Reflection questions + prayer prompts
```

### Devotional Flow

```
1. Plans Tab: Browse available plans (category filters) OR "My Plans" sub-tab
2. Enroll in plan -> Daily reading view
3. Daily view: Scripture passage + reflection + mark complete
4. Progress tracked via streak system
```

### Kids Club Flow

```
1. Profile Tab -> "Kids Club" -> Set PIN (first time)
2. Tabs change to: Home, Stories, Learn, My Stars
3. Stories: Pick age group -> Pick collection -> Read story
4. Learn: Quizzes or Memory Verses
5. My Stars: Badges and streaks
6. Exit: PIN required to leave Kids Mode
```

---

## 4. Database & Logic

### Database Schema (28 Tables)

**Bible Data (5 tables)**
- `bible_translation` — KJV, ASV, WEB translation metadata
- `bible_book` — 66 books with abbreviation, testament, chapter count
- `bible_verse` — 31,102+ verses per translation (id, bookId, chapter, verse, text, translationId)
- `strong_entry` — 14,220 Strong's Concordance entries (number, language, lemma, transliteration, pronunciation, definition, kjvUsage, derivation)
- `verse_strong_map` — Many-to-many: verses to Strong's entries

**Study Content (6 tables)**
- `context_card` — AI-generated historical/cultural context cards
- `commentator` — Scholar metadata (4 commentators)
- `commentary_entry` — Fetched commentary text from HelloAO API
- `application_template` — AI-generated reflection/prayer content
- `verse_map_cache` — Cached cross-references + context for Visual Verse Mapper
- `chapter_context_cache` — Cached 4D Scripture data (locations, timeline, figures, insights)

**Study Sessions (1 table)**
- `study_guide_sessions` — Socratic study conversations (phase tracking, message history as JSON, verse reference)

**Geography & History (4 tables)**
- `location` — Biblical places with coordinates, era, modern name
- `location_verse_map` — Locations to verse references
- `timeline_event` — Historical events with approximate dates and periods
- `event_verse_map` — Events to verse references

**User Data (6 tables)**
- `user_note`, `user_highlight`, `user_bookmark` — Standard annotation features
- `prayer_request` — Journal entries with category, answered/active toggle
- `reading_history` — Chapter read log with timestamp
- `reading_streak` — Streak tracking (current, longest, last read date)

**Devotionals (4 tables)**
- `devotional_plan` — Plan metadata (title, description, total days, theme)
- `devotional_day` — Daily content with passage, reflection, optional location/event links
- `user_plan_enrollment` — User to plan enrollment
- `user_plan_progress` — Day-by-day completion tracking

**Kids Club (6 tables)**
- `kids_collection` — Story groupings by age group (6 collections across 3 age groups)
- `kids_story` — 28 stories with full narrative, scripture, discussion questions, prayer, activity
- `kids_quiz_question` — 84 multiple-choice questions linked to stories
- `kids_progress` — Story completion, quiz scores, memory verse tracking
- `kids_badge` — 5 achievement definitions
- `kids_user_badge`, `kids_streak` — Gamification tracking

### Key Algorithms & Logic

**Socratic Study Guide (Inductive Method)**
```
Phase progression: Observe -> Interpret -> Apply -> Complete
- Each phase: 2 user exchanges before advancement
- AI system prompt: Seminary tutor persona, never gives answers directly
- Asks probing questions, affirms good observations, gently redirects
- Message history stored as JSON array in study_guide_sessions
- Phase tracked server-side, advanced after counting user messages per phase
```

**Commentary Fetching (HelloAO API)**
```
1. Check local DB for cached commentary
2. If empty, fetch from HelloAO for each of 4 commentators:
   - matthew-henry, jamieson-fausset-brown, adam-clarke, john-gill
3. API response: chapter.content[] where each item has content (string or string[])
4. Join array content, trim to 3000 chars, store in DB
5. Return combined results
```

**4D Scripture Context (AI Generation + Caching)**
```
1. GET /api/chapter-context/:bookId/:chapter
2. Check chapter_context_cache table
3. If no cache: call OpenAI with structured JSON prompt
4. Returns: locations[], timelineEvents[], keyFigures[], culturalInsights, geographicalNotes
5. Cache result for instant retrieval on subsequent views
```

**Visual Verse Mapper (Multi-Source Aggregation)**
```
1. GET /api/verse-map/:verseId
2. Query verse_strong_map + strong_entry for original language words
3. Query verse_map_cache for AI-generated cross-references
4. If no cache: POST /api/verse-map/generate triggers AI to produce 8-10 cross-references
5. Returns combined: words[], crossReferences[], contextSnippet
```

**Reading Streak Tracking (SQL Aggregation)**
```
1. On chapter read: INSERT reading_history, UPDATE reading_streak
2. Weekly endpoint: SQL query groups by day-of-week for current week
3. Perfect Weeks: COUNT weeks where all 7 days have reads
4. Frontend renders S-M-T-W-T-F-S calendar with filled/empty dots
```

**TTS Dual-Engine System**
```
Mobile (iOS/Android): expo-speech with device voices
Web/Fallback: OpenAI gpt-audio model via /api/tts endpoint
- Server streams audio response
- Client uses expo-audio player
- Verse-by-verse highlighting synced with playback
- Speed control: 0.75x, 1x, 1.25x, 1.5x
```

---

## 5. Status Check

### Fully Implemented Features

- Bible reader with 3 translations, TTS, verse actions
- 4-Layer Study Model (all 4 layers functional with AI generation)
- Strong's Concordance (14,220 entries + search + verse analysis)
- Socratic AI Study Guide (3-phase Inductive Method)
- Visual Verse Mapper (original language + cross-references + context)
- 4D Scripture Context Panel (locations, timeline, figures, culture)
- SDA 28 Fundamental Beliefs with EGW external links
- Commentary from 4 public domain scholars
- Prayer Journal with categories and answered/active toggle
- Devotional Plans with enrollment and daily progress
- Reading streaks with weekly calendar and Perfect Weeks
- Maps & Timeline with verse linkages
- Kids Club with 3 age groups, 28 stories, 84 quizzes, badges
- Home screen (YouVersion-caliber) with Verse of the Day, streaks, featured plans
- 12 Topic exploration pages with curated media
- Christian Music and Family & Faith content sections
- Onboarding flow (4-page swipeable)
- Offline support via AsyncStorage persistence
- Cross-platform (iOS, Android, Web)

### Known Limitations & Missing Pieces

| Area | Status | Notes |
|------|--------|-------|
| **User Authentication** | Placeholder (`userId: "guest"`) | All user data uses hardcoded "guest" user. No login/signup system. Multi-user support requires auth implementation. |
| **Collaborative Study ("Bible GitHub")** | Not started | Planned feature for shared annotations, group studies, version-controlled study notes. |
| **Interactive Bible Maps** | Data-only | Locations stored with coordinates but no visual map rendering (no react-native-maps integration yet). Currently shows location cards with text descriptions. |
| **Push Notifications** | Not implemented | No daily reading reminders or devotional notifications. |
| **Bookmarks/Highlights UI** | Backend complete, frontend minimal | Endpoints exist but no dedicated "My Highlights" or "My Bookmarks" browsing screen. |
| **Notes Editor** | Backend complete, frontend basic | No rich text editing for study notes. |
| **Image Assets for Kids** | Placeholder icons | Collections and stories use icon fallbacks — no illustrated story images yet. |
| **Young Adults Stories** | Content seeded | 8 stories with teen themes, but no visual differentiation from younger age groups beyond longer text. |
| **Plan Discovery** | Basic | No personalized plan recommendations or "trending" plans. |
| **Performance Optimization** | Not profiled | Large chapters (Psalm 119) may have rendering overhead. No virtualized list for verse rendering. |
| **Error Boundaries** | Present but basic | ErrorBoundary.tsx exists with reload capability but no crash reporting service. |
| **Testing** | E2E via Playwright | No unit tests or integration test suite. Tested manually + E2E for major features. |
| **Accessibility** | Partial | testID attributes on interactive elements, but no screen reader labels (accessibilityLabel) or focus management. |
| **Internationalization** | Not implemented | English only. No i18n framework. |
| **Rate Limiting** | Not implemented | API endpoints have no rate limiting. AI generation endpoints could be abused. |
| **Data Validation** | Partial | Zod schemas defined for user insert but not all endpoints validate input with Zod. |

### Architecture Observations for Reviewers

1. **Single routes file**: All 67 API endpoints live in one 2,114-line server/routes.ts. Consider splitting into route modules (e.g., routes/bible.ts, routes/study.ts, routes/kids.ts).

2. **AI caching strategy**: Each AI feature has its own cache table. This is functional but means 5+ cache tables. A unified cache with type discriminator could simplify.

3. **Hardcoded content**: Topic pages, music, family content, SDA beliefs, and speaker data are hardcoded in frontend files. Good for performance but limits dynamic management.

4. **No middleware layer**: Auth, rate limiting, input validation, and error handling are per-endpoint rather than middleware-based.

5. **Frontend file sizes**: The chapter reader (1,761 lines) and study tab (1,926 lines) are large monolithic files. The reader includes TTS logic, verse rendering, voice picker, speed picker, translation picker, and the 4D context panel all in one file.

---

*Generated: March 2, 2026*
*Project: Grace through Faith — Bible Study App*
*Stack: Expo (React Native) + Express.js + PostgreSQL + OpenAI*
*Codebase: ~19,870 lines TypeScript across 65 files*
