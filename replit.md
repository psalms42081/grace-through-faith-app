# Grace through Faith — Bible Study App

## Overview
A mobile-first Bible study app for all Christian ministries featuring the "4-Layer Study Model":
- **Layer 1 — Text:** KJV Bible text, cross references, word study (Strong's)
- **Layer 2 — Context:** Historical notes, timeline anchors, geography & maps
- **Layer 3 — Historic Voices:** Classic commentaries (Matthew Henry, JFB, etc.)
- **Layer 4 — Application:** Then/Now bullets, reflection questions, prayer prompt, journaling

## Tech Stack
- **Frontend:** Expo (React Native) with Expo Router, TypeScript
- **Backend:** Express.js with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **State Management:** TanStack Query (server state), React context (shared UI state)
- **Fonts:** Lora (serif, for scripture/headings), Inter (sans-serif, for UI)
- **Icons:** @expo/vector-icons (Ionicons)
- **TTS:** OpenAI AI Integration (gpt-audio model) via `/api/tts` endpoint, with expo-speech fallback
- **Audio Playback:** expo-av for playing AI-generated audio
- **Offline:** React Query persistence via AsyncStorage (30-day gcTime, offlineFirst)

## Project Structure
```
app/                    # Expo Router screens
  _layout.tsx           # Root layout with providers, fonts, onboarding check
  onboarding.tsx        # 4-page swipeable welcome flow (first launch only)
  (tabs)/
    _layout.tsx         # Tab navigation (5 tabs: Home, Read, Search, Study, Explore)
    index.tsx           # Home screen (Verse of Day, Quick Actions, Devotional banner)
    read.tsx            # Bible Reader — Book selector (OT/NT grouped pills)
    search.tsx          # Search (keyword + reference parsing)
    study.tsx           # Study tools (Word Study, Context, Historic Voices, Application)
    explore.tsx         # Maps & Timeline
  read/
    [bookId]/
      index.tsx         # Chapter picker grid (book info card + chapter numbers)
      [chapter].tsx     # Verse reader (scripture text, TTS with voice selection)
  verse-actions.tsx     # FormSheet — verse actions (copy, highlight, bookmark, study)
  passage-context.tsx   # Passage study screen (context cards + commentary)
  devotionals.tsx       # Devotional plans browser & enrollment
  devotional-day.tsx    # Daily reading screen with journal & progress
assets/                 # App icon, splash screen
components/             # Reusable components (ErrorBoundary, ErrorFallback, etc.)
constants/colors.ts     # Theme colors (warm parchment/navy/gold palette)
lib/query-client.ts     # TanStack Query setup with API fetch helpers
server/
  index.ts              # Express server entry point
  routes.ts             # API routes (passage, search, strong, context, commentary, TTS)
  db.ts                 # Drizzle ORM database connection
  replit_integrations/  # OpenAI AI Integration (audio TTS, chat, image)
shared/schema.ts        # Drizzle ORM schema (all database tables)
scripts/                # Data import scripts (KJV, ASV, WEB, context, Strong's, etc.)
data/
  kjv.json              # Downloaded KJV Bible data (4.7 MB, 66 books, 31,102 verses)
```

## Database Tables (23 total)
- **Core:** bible_translation, bible_book, bible_verse
- **Word Study:** strong_entry, verse_strong_map
- **Context:** context_card
- **Commentary:** commentator, commentary_entry
- **Application:** application_template
- **Maps/Timeline:** location, location_verse_map, timeline_event, event_verse_map
- **Illustrations:** illustration, illustration_link
- **Devotionals:** devotional_plan, devotional_day, user_plan_enrollment, user_plan_progress
- **User:** users, user_note, user_highlight, user_bookmark

## Data Pipeline
- **KJV** (King James Version) — public domain, sourced from github.com/aruljohn/Bible-kjv
- **ASV** (American Standard Version, 1901) — public domain, sourced from github.com/bibleapi/bibleapi-bibles-json
- **WEB** (World English Bible) — public domain, sourced from github.com/TehShrike/world-english-bible
- 93,308 total verses (31,103 per translation x 3) across 66 books imported into PostgreSQL
- Scripts: `seed-books.ts` -> `download-kjv.ts` -> `import-kjv.ts` -> `download-translations.ts` -> `import-translations.ts`

## API Endpoints
- `GET /api/books` — List all Bible books
- `GET /api/passage?book=&chapter=&translation=` — Get verses for a chapter
- `GET /api/verse?book=&chapter=&verse=&translation=` — Get single verse
- `GET /api/search?q=&translation=` — Full-text search
- `GET /api/strong/:id` — Strong's entry
- `GET /api/strong/verse/:verseId` — Strong's mappings for a verse
- `GET /api/context?book=&chapter=` — Context cards
- `GET /api/commentary?book=&chapter=` — Commentary entries
- `GET /api/application?book=&chapter=` — Application templates
- `GET /api/location` — All locations
- `GET /api/location/:id` — Location detail
- `GET /api/location/:id/verses` — Verses linked to a location
- `GET /api/timeline` — All timeline events
- `GET /api/timeline/:id/verses` — Verses linked to a timeline event
- `GET /api/devotionals/plans` — Published devotional plans
- `GET /api/devotionals/plans/:planId/days` — Days in a plan
- `POST /api/devotionals/enroll` — Enroll in a plan
- `GET /api/devotionals/today?userId=` — Get today's devotional
- `POST /api/devotionals/complete` — Mark day complete
- `GET/POST /api/notes/:userId` — User notes
- `GET/POST /api/highlights/:userId` — User highlights
- `GET/POST/DELETE /api/bookmarks/:userId` — User bookmarks
- `POST /api/tts` — Text-to-speech (OpenAI gpt-audio, accepts `{text, voice}`)

## Build Milestones
- [x] **Milestone 1:** Foundation — App shell, DB schema, tab navigation, API skeleton
- [x] **Milestone 2:** Core Bible Data & Reader UI — KJV import, book/chapter/verse navigation
- [x] **Milestone 3:** Search Engine — keyword search with highlighting, reference parsing (John 3:16)
- [x] **Milestone 4:** Bottom Sheet UX & Context Layer — verse action sheet, passage context/commentary
- [x] **Milestone 5:** Word Study & Historic Voices — Strong's concordance, word analysis, commentary browsing
- [x] **Milestone 6:** Application Layer & Journaling — Application tab with book/chapter picker, Then/Now cards, reflection questions, prayer prompts; Highlight/Bookmark wired to real API with guest user auto-seed; 12 seeded templates
- [x] **Milestone 7:** Maps & Timeline — 28 biblical locations with detail views and linked verses; 36 timeline events across 10 periods with verse links; dynamic Explore tab
- [x] **Milestone 8:** Devotionals MVP — 3 seeded plans (19 days total), plan browser with enrollment, daily reading with scripture/context/reflection/prayer/journal, progress tracking
- [x] **Milestone 9:** Text-to-Speech & Offline Support — expo-speech TTS with play/pause/stop controls and speed selector; React Query persistence via AsyncStorage for offline-first data caching
- [x] **Milestone 10:** Polish & Deploy — dynamic time-of-day greeting, rotating daily verse, deployment configured (autoscale)
- [x] **Milestone 11:** Rebrand, Onboarding & AI TTS — Rebranded to "Grace through Faith"; 4-page onboarding welcome flow (AsyncStorage tracked); OpenAI AI Integration TTS with 5 voice options (nova/shimmer/alloy/echo/onyx), expo-av playback, expo-speech fallback; new app icon

## Color Theme
- Primary (deep navy): #1A1F3C
- Accent (warm gold): #C9933A
- Background (parchment): #F5EFE0
- Text (ink): #2C1810
- Supports light/dark mode

## Key Design Rules
- No emojis anywhere in the app
- Use @expo/vector-icons (Ionicons) for all icons
- Ellen G. White: always external link to egwwritings.org, never embed text
- Lora serif for headings/scripture, Inter sans-serif for UI text

## Navigation Flow
- First launch: 4-page onboarding → "Get Started" → Home
- Read tab shows all 66 books grouped by OT/NT as pill buttons
- Tapping a book navigates to chapter picker with book info card + numbered grid
- Tapping a chapter opens the verse reader with full KJV text
- Verse reader has prev/next chapter navigation at bottom
- Verse reader has audio playback bar with voice selection and speed controls
- All data cached offline via AsyncStorage (offlineFirst strategy)

## TTS Architecture
- **Primary:** OpenAI gpt-audio model via Replit AI Integration (server-side `/api/tts`)
- **Voices:** Nova (female), Shimmer (female), Alloy (neutral), Echo (male), Onyx (male)
- **Playback:** expo-av Sound for both web and native
- **Fallback:** expo-speech (device TTS) when API unavailable or offline
- **Persistence:** Selected voice stored in AsyncStorage (`@grace-through-faith/tts-voice`)

## Workflows
- `Start Backend` — Runs Express server on port 5000
- `Start Frontend` — Runs Expo dev server on port 8081
