# Scripture Study — Hybrid Bible Study App

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

## Project Structure
```
app/                    # Expo Router screens
  _layout.tsx           # Root layout with providers, fonts, themed Stack headers
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
      [chapter].tsx     # Verse reader (scripture text, prev/next navigation)
  verse-actions.tsx     # FormSheet — verse actions (copy, highlight, bookmark, study)
  passage-context.tsx   # Passage study screen (context cards + commentary)
assets/                 # App icon, splash screen
components/             # Reusable components (ErrorBoundary, ErrorFallback, etc.)
constants/colors.ts     # Theme colors (warm parchment/navy/gold palette)
lib/query-client.ts     # TanStack Query setup with API fetch helpers
server/
  index.ts              # Express server entry point
  routes.ts             # API routes (passage, search, strong, context, commentary, etc.)
  db.ts                 # Drizzle ORM database connection
  storage.ts            # Legacy in-memory storage (users only)
shared/schema.ts        # Drizzle ORM schema (all database tables)
scripts/
  seed-books.ts         # Seeds 66 Bible books + KJV translation metadata
  download-kjv.ts       # Downloads public domain KJV JSON from GitHub
  import-kjv.ts         # Imports KJV verse text into bible_verse table
  seed-context.ts       # Seeds 9 context cards + 4 commentators + 6 commentary entries
  seed-strongs.ts       # Seeds 17 Strong's entries + 16 verse-word mappings
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
- `GET /api/timeline` — All timeline events
- `GET /api/devotionals/plans` — Published devotional plans
- `POST /api/devotionals/enroll` — Enroll in a plan
- `GET /api/devotionals/today?userId=` — Get today's devotional
- `POST /api/devotionals/complete` — Mark day complete
- `GET/POST /api/notes/:userId` — User notes
- `GET/POST /api/highlights/:userId` — User highlights
- `GET/POST/DELETE /api/bookmarks/:userId` — User bookmarks

## Build Milestones
- [x] **Milestone 1:** Foundation — App shell, DB schema, tab navigation, API skeleton
- [x] **Milestone 2:** Core Bible Data & Reader UI — KJV import, book/chapter/verse navigation
- [x] **Milestone 3:** Search Engine — keyword search with highlighting, reference parsing (John 3:16)
- [x] **Milestone 4:** Bottom Sheet UX & Context Layer — verse action sheet, passage context/commentary
- [x] **Milestone 5:** Word Study & Historic Voices — Strong's concordance, word analysis, commentary browsing
- [ ] **Milestone 6:** Application Layer & Journaling
- [ ] **Milestone 7:** Maps & Timeline
- [ ] **Milestone 8:** Devotionals MVP
- [ ] **Milestone 9:** Offline PWA Support
- [ ] **Milestone 10:** Polish & Deploy

## Color Theme
- Primary (deep navy): #1A1F3C
- Accent (warm gold): #C9933A
- Background (parchment): #F5EFE0
- Text (ink): #2C1810
- Supports light/dark mode

## Navigation Flow
- Read tab shows all 66 books grouped by OT/NT as pill buttons
- Tapping a book navigates to chapter picker with book info card + numbered grid
- Tapping a chapter opens the verse reader with full KJV text
- Verse reader has prev/next chapter navigation at bottom

## Workflows
- `Start Backend` — Runs Express server on port 5000
- `Start Frontend` — Runs Expo dev server on port 8081
