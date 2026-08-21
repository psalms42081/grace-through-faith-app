# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed as the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. It aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth through an immersive "4-Layer Study Model" powered by AI, offline functionality, a Kids Club, devotional plans, and prayer journaling. The project's ambition is to create a market-leading app for spiritual formation within the SDA community, offering unparalleled depth and engagement.

## User Preferences
- **YouVersion is the permanent UX and navigation blueprint for GTF.** All design decisions — tab structure, reading plans, Bible reader, daily habits, discovery, profile — are benchmarked against YouVersion as the gold standard. This is not a one-time reference; it applies to every screen, every redesign, and every new feature.

## Current Status — Conference Beta Preparation (v10.0)
Full handoff document: `GraceThroughFaith_Handoff_v10.md`

### Recent Completed Work (v10.0)
- **You Tab Redesigned:** Initials avatar, Share Profile pill, quick action tiles, streak bottom sheet, badges scroll
- **Settings Screen Rebuilt:** 6 sections, YouVersion-style, gold toggles, lock icons for unbuilt rows
- **Terms of Service & Privacy Policy:** Both complete at app/terms.tsx and app/privacy.tsx
- **Signpost Topic Grid Rebuilt:** 42 topics, two-column coloured tile grid, YouVersion Discover style
- **Conference Bulk Licensing Portal:** app/conference-portal.tsx — 4 sections, full B2B demo screen
- **YouTube API v3 Integrated:** Curated video resources on all 42 Signpost topics

### Hologram Onboarding Fixes (Completed)
- **Tap-to-advance portrait:** Removed Back/Next buttons; tapping the portrait advances steps
- **Spring repositioning:** Portrait moves between positions using spring physics (damping: 18, stiffness: 120)
- **Coach mark suppression:** CoachMark.tsx checks `usePioneer().isVisible` and hides when hologram is active
- **Gold pulsing tap-hint dot:** Animated gold dot on portrait pulses when speech finishes, signaling user to tap
- **HeyGen talking-head clips:** All 6 onboarding step videos generated and stored in Cloudinary/pioneerVideos DB table
- **Server-side onboarding sync:** `hologram_onboarding_seen` column on users table; PioneerContext syncs with server via `syncOnboardingFromServer()` in tabs layout so the flag persists across devices/sessions. Endpoints: `POST /api/pioneer/onboarding-complete`, `POST /api/pioneer/onboarding-reset`. Settings "Pioneer Guide" row resets server flag then replays tour.

### Demo Data System
- **Seed/Clear/Status endpoints** at `/api/demo` (admin-only via JWT auth middleware)
- **51 hierarchy nodes** (GC, 3 Divisions, 5 Unions, 12 Conferences, 30 Churches), 200 demo users, 90 days engagement, 8 pastoral alerts
- **Analytics dashboard** supports `?demo=true` query param — admin users get GC-level scope over all demo data
- **Key files:** `server/seeds/seed-demo.ts`, `server/routes/demo.ts`, `server/routes/analytics.ts` (getDemoScope + sqlArray helper)
- **Admin panel tab:** DemoDataTab in `app/admin-review.tsx` — seed/clear buttons with status indicator

### Recent Fixes (v10.1)
- **Our Daily Bread Integration:** Full ODB devotionals pulled from odb.org WordPress API. Backend: `server/routes/odb.ts` with 15-min cache, 10s fetch timeout, HTML stripping. Three endpoints: `/api/odb/today`, `/api/odb/recent?count=N`, `/api/odb/post/:id`. Frontend: `app/odb-devotional.tsx` detail screen with verse card, prayer, insights, reflection, share, and link to odb.org. Last 7 ODB devotionals displayed in Plans Discover tab under "OUR DAILY BREAD" section
- **Plans Tab Unified:** `app/(tabs)/plans.tsx` now shows three sections in Discover: Reading Plans, Devotional Plans, and Our Daily Bread devotionals
- **EGW Search API Fix:** `searchWritings` now maps `snippet` and `pub_name` fields correctly from the EGW API — searches return actual prose quotes instead of empty text
- **EGW Devotional Excerpts Seeded:** 140 devotional days now have `historicVoiceExcerpt` populated from real EGW books (Steps to Christ, Desire of Ages, Patriarchs & Prophets, etc.) via `server/seed-egw-excerpts.ts`. Concordance/dictionary entries filtered out
- **YouTube Route Registered:** `server/routes/youtube.ts` was an orphaned route file never registered in `server/routes.ts` — now registered and returning SDA speaker videos
- **Sabbath Window Log Spam Fixed:** Console log that fired every 60s now only logs when Sabbath is active and in dev mode
- **EGW Seed Admin Worker:** Added `egw_excerpts` to admin workers list for re-running EGW excerpt seeding via `/api/admin/workers/run`

### Known Issues
- Port conflicts occasionally occur on workflow restart

### Database schema and devotional catalog recovery

`npm run db:push` reconciles the database schema only. It does **not** execute
numbered SQL migrations, including
`migrations/0005_restore_approved_devotional_catalog.sql`, which promotes the
21 editorially approved devotional series from `legacy_unclassified` to
`human_curated`.

After a database reset or fresh schema push, seed the devotional plans first,
then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0004_devotional_human_authorship.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0005_restore_approved_devotional_catalog.sql
npm run test:devotional-catalog
```

The deployment build runs this catalog check before starting its temporary
server. The server also logs a critical, non-fatal warning at startup when no
human-curated devotional series exist.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application employs a mobile-first architecture utilizing Expo (React Native) for the frontend and Express.js for the backend. Data persistence is managed with PostgreSQL and Drizzle ORM. Server state is handled by TanStack Query with offline persistence, while React context manages shared UI state. AI generation functions are centrally located.

**UI/UX Design System:**
- **Color Scheme:** Deep dark mode (`#050507`) with warm gold accent (`#C9933A` — never orange), distinct palettes for Kids Mode and Sabbath theme
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements
- **Design Philosophy:** Borderless, immersive dark theme. Premium image-based cards with visible imagery (25-35% opacity) and layered gradient overlays. Bottom-anchored content with `justify-content: flex-end`. Consistent gold CTA buttons (`LinearGradient #C9933A → #A87828`). Uppercase accent labels with gold dot pattern across all card types
- **Visual Design System:** Premium image-based cards replace traditional icons, using specific image assets and AI-generated classical Renaissance-style paintings for Bible book covers
- **Home Card Images:** `pray.png`, `read.png`, `study.png`, `study-guide.png`, `ring-engage.png`, `ring-prayer.png`, `ring-study.png` (in `assets/home-cards/`)

**Technical Implementations & Feature Specifications:**
- **AI Integration:** Uses OpenAI's `gpt-4o-mini` for on-demand content generation (e.g., Socratic AI Study Guide, Dynamic AI Reading Plans) with an AI Ethics & Transparency Layer. Includes three AI personas for Inductive Bible Study: Scholarly, Pastoral, and Ellen White.
- **Text-to-Speech (TTS):** Utilizes ElevenLabs for high-quality narration.
- **Offline Support:** Achieved through React Query persistence via AsyncStorage for an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, prayer journal, reading history, and a unified "Saved" screen.
- **Multilingual Support:** Comprehensive UI internationalization (`i18next`) for 6 languages and 9 Bible translations stored in PostgreSQL, with language-aware content generation and translation selection.
- **Live Fellowship:** Real-time video/audio conferencing using LiveKit, supporting group experiences with leader roles and screen sharing.
- **Formation System:** A curriculum-based engine for spiritual formation, including a Sabbath Mode UI toggle.
- **Kids Club:** Features playful UI, Kids Star Shop, Daily Quests, and pre-generated story scene images.
- **Content & Study Resources:** Features Deep Dive study with AI-generated application content, Semantic Search, Prophecy Explorer, Spiritual Growth Map, Christian Radio, Dynamic Topic Content, and Sabbath School Mode. Includes "Signposts" for topical Bible study and "Essentials" for core Adventist doctrines.
- **Insight & Voices:** Commentary screen with "Adventist Pioneers" (AI-generated summaries) and "Classic Commentators".
- **Admin & Leader Management:** Admin dashboard for user management, role changes, and leader approval workflow. A robust role system supports various user roles with role-gated middleware. Admin user: `joehuber0881@gmail.com` (role=admin, hierarchy_membership=gc_admin).
- **Auth:** JWT-based with bcrypt password hashing and rate-limited endpoints.
- **Guest Identity:** Persistent device UUID for unauthenticated users to store data.
- **Cinematic Video Pipeline:** Advanced pipeline for generating cinematic narrative videos for evangelism content, including AI scene direction, character consistency, and ElevenLabs voiceovers. Supports Teen Testimonial and Bible Story Video scripts.
- **Biblical Series:** Curated video series page with featured series cards, episode lists, and inline/YouTube video player.
- **Organization/Church Accounts:** Functionality for churches and conferences to register and manage members with join codes and role-based access.
- **Bible Reader:** Premium reading experience with split-screen, rich text notes (markdown support), dynamic toolbar for highlights and actions, and comprehensive verse actions.
- **Rotating Home Panel:** Three-card carousel (Verse of the Day, Signpost of the Day, Daily Reflection) with auto-rotation and swipe functionality.
- **Reading Plans System:** Enables creation and enrollment in ready-made and custom reading plans, tracking user progress and daily assignments.
- **Biblical Sabbaths Deep Dive:** Interactive module detailing all biblical Sabbaths.
- **Multi-Pioneer Guide System:** Users choose from 5 Adventist pioneers (Ellen White, James White, Joseph Bates, Uriah Smith, J.N. Andrews) as their app-wide narrator/guide. Selected pioneer is used for all TTS reading (Bible, devotionals) and hologram guide tours. Pioneer selection persists via AsyncStorage. Pioneer voice IDs: Ellen White=XrExE9yKIg1WjnnlVkGX, James White=6sFKzaJr574YWVu4UuJF, Joseph Bates=HAvvFKatz0uu0Fv55Riy, Uriah Smith=jXkeB46JcPXXUSxzn3MD, J.N. Andrews=zlTgutz4OiRUmJHbkQju. Key files: `constants/pioneers.ts`, `contexts/PioneerContext.tsx`, `components/PioneerPortrait.tsx`, `components/EllenWhiteHologram.tsx` (supports any pioneer), `server/services/pioneerService.ts`, `server/routes/pioneers.ts`. Schema: `pioneerVideos` table for caching pre-generated HeyGen talking-photo clips.
- **Bible Translation Cache (Local-First Architecture):** Permanent chapter-level caching system for API-fetched translations (NLT, NIV, AMP, NASB) in the `bible_cache` table.

## Key Files
- `app/(tabs)/index.tsx` — Home screen (2000-line monolith; do NOT restructure)
- `app/(tabs)/profile.tsx` — You tab, redesigned v10
- `app/settings.tsx` — Settings screen, rebuilt v10
- `app/conference-portal.tsx` — Conference Bulk Licensing Portal, NEW v10
- `components/SpiritualRings.tsx` — Daily Formation rings with ImageBackground + glow wrap
- `components/home/ContinueCard.tsx` — Continue Your Journey card (bottom-anchored overlay)
- `components/home/DevotionalCard.tsx` — Devotional Plans card (180px, full image)
- `components/home/GoldDivider.tsx` — Section divider (gradient lines + dots)
- `components/EllenWhiteHologram.tsx` — Hologram onboarding overlay
- `components/CoachMark.tsx` — Coach mark tooltip system
- `server/index.ts` — Backend server (graceful shutdown added)
- `contexts/PioneerContext.tsx` — Pioneer selection + TTS sync
- `contexts/AuthContext.tsx` — Auth with logout clearing onboarding flag
- `constants/colors.ts` — Color system
- `constants/pioneers.ts` — Pioneer data and voice IDs

## External Dependencies

-   **OpenAI API:** For AI content generation (`gpt-4o-mini`).
-   **PostgreSQL:** Primary database, managed with Drizzle ORM.
-   **Expo & React Native Ecosystem:** Core framework, navigation, and device features.
-   **AsyncStorage:** Client-side data persistence and offline caching.
-   **i18next + react-i18next:** UI internationalization.
-   **ElevenLabs API:** For high-quality Text-to-Speech.
-   **EGW Writings API (a.egwwritings.org):** REST API for Ellen G. White's writings.
-   **ANN RSS Feed (feeds.feedburner.com/ann-en):** Adventist News Network feed.
-   **LiveKit Cloud:** Real-time video/audio conferencing.
-   **Cloudinary:** Permanent video storage.
-   **HeyGen API:** Avatar video generation.
-   **Runway Gen-4.5 API:** Cinematic B-roll generation.
-   **Luma AI API (ray-2/photon-1):** Primary image + video generation engine.
-   **Adventech/sabbath-school-lessons (GitHub):** Open-source quarterly content for Sabbath School.
-   **getbible.net API:** Source for multilingual Bible translations.
-   **NLT API (api.nlt.to):** New Living Translation content.
-   **API.Bible (rest.api.bible):** Provides NIV, AMP, and NASB translations.
-   **HelloAO Bible API:** Provides public domain commentaries.
