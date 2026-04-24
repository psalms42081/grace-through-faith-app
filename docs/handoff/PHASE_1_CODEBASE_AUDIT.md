# Phase 1 Codebase Audit — v11 Main App

**Audience:** Mohd + frontend dev team
**Scope:** v11 Main App redesign only — 5 screens (Home, Bible Reader, Discover, Sabbath School Detail, Profile), light + dark
**Reference:** Canvas at y=0 → y=13,600; spec checklist in the audit brief
**Type:** READ-ONLY codebase audit (no edits, no migrations, no installs)
**Audited at:** April 24, 2026

---

## Section 1 — Executive Summary

**Roughly 65–70% of Phase 1 already exists in the codebase**, mostly at a "v10-finished" maturity level rather than at v11 polish. The core data plumbing (highlights, notes, bookmarks, reading streaks, Bible translations cache, Sabbath School quarter/lesson/day hierarchy, reflections) is all present. The Home screen has a fully-implemented three-tab hero card (`VotdHeroCard`) with the Verse/Signpost/Reflection structure and the Signpost bottom sheet that the v11 spec calls for. The Bible Reader has highlight colors in the exact yellow/green/blue/orange palette the spec names, plus long-press → action sheet, bookmarks, highlights, TTS, and a translation picker backed by a real `/api/translations` endpoint.

**Roughly 30–35% needs net-new build or significant rework.** The Discover surface in particular is a substantial gap: the current `explore.tsx` tab is titled "Study," renders a 6-card category grid, and has no search field and no topical chip rail. Sabbath School Detail exists but is split across two parallel implementations (`app/sabbath-school.tsx` and `app/lesson/[id].tsx`) with no clear "Ask the Study Tutor" gold CTA, no memory-verse card I could find, and no canonical quarter→lesson→day routing pattern. The Profile screen has the streak / badges / activity sections but no tabbed Saved/Notes/Highlights section, no visible Active Plans block with gold progress bars, and no Kids Mode or Dark Mode toggle on the screen itself (those live in Settings or are auto-from-system). The bottom nav has 14 registered routes, only 5 of which are visible — and the active state uses a gold tint, not the gold underline the spec calls for.

**Highest-risk items:**

1. **Tab bar architecture mismatch (HIGH).** Current visible tabs are Home / Read / Connect / Study / You. The spec implies a 5-tab arrangement that almost certainly does not include a "Connect" tab and probably exposes Discover (currently hidden behind the renamed Study tab). Touching `app/(tabs)/_layout.tsx` will affect 14 sibling routes — `family`, `plans`, `search`, `study`, `kids-*` — and breaking `href` semantics will silently 404 in Expo Router. This needs a single coordinated change with route-level QA.
2. **`RotatingPanel` vs `VotdHeroCard` duplication (MEDIUM).** Both exist. `VotdHeroCard` is the v11-aligned implementation (3 tabs, signpost bottom sheet). `RotatingPanel` is an older 2-card carousel (Signpost + Reflection only) that is still in the components tree and may still be referenced from older Home variants. Need to confirm `RotatingPanel` is dead code before deleting.
3. **Two Sabbath School Detail implementations (MEDIUM).** `app/sabbath-school.tsx` (835 lines) and `app/lesson/[id].tsx` (1,939 lines) both render lesson detail surfaces, with `lesson/[id].tsx` being the heavier, more recently-touched one and integrating `StudyDepthSelector`. Building "the v11 Sabbath School Detail screen" against the wrong file will cause divergence.
4. **Discover tab functional gap (MEDIUM).** Search field, topical chip rail, hero featured plan, and plan cards are all missing or scattered across the hidden `plans.tsx` tab and the renamed `explore.tsx` tab. This is a redesign, not a polish pass.
5. **Notification scheduling is client-only (MEDIUM).** `lib/notifications.ts` schedules local notifications via expo-notifications. There is no backend scheduling, no server-side reminder cadence, and Android in Expo Go has known limitations (the code already detects `isAndroidExpoGo`). If v11 expects server-driven reminders, that is net-new.
6. **EGW commentary amber ⓘ affordance is not implemented in the chapter view (LOW–MEDIUM).** `RelatedContent` in the reader exposes chapter navigation and tools, and `ContextPanel` (15k) exists, but no per-verse amber ⓘ that opens an EGW commentary bottom sheet was found. The backend has a `/api/commentary` route and EGW Writings API integration, so the data layer is ready — the affordance itself is missing.

---

## Section 2 — Component-by-Component Audit

Legend: ✅ exists and matches spec · 🟡 exists but needs update · 🔴 does not exist · ⚠️ conflict

### Screen 1 — Home

| Spec component | Status | Evidence | Notes |
|---|---|---|---|
| Three-tab hero card (Verse / Signpost / Reflection) | ✅ | `components/home/VotdHeroCard.tsx`, lines 86, 213–270 | Tab keys are `"verse" \| "signpost" \| "reflection"`; matches spec exactly. |
| VOTD card with bottom sheet for Signpost scripture | ✅ | `VotdHeroCard.tsx` lines 290–380, `showSignpostSheet` state | Sheet has handle bar, topic-color header, scripture scroll. |
| Daily Reflection static card | ✅ | `VotdHeroCard.tsx`, REFLECTION tab | Implemented as the third hero tab, not as a separate card; spec is ambiguous on whether it should be standalone — flag for Mohd. |
| Sabbath School row card | ✅ | `components/home/SabbathSchoolCard.tsx` | Uses real `/api/sabbath-school/current` data, image-bg with progress and "Day N · Title". Renders only when lesson exists. |
| EGW Devotion row | 🟡 | `components/home/DevotionalCard.tsx` (4.7k, 180px tall, full-image card) | Component exists; needs visual cross-check against v11 mock to confirm it matches the "EGW Devotion row" treatment specifically vs generic devotional. |
| Category chip rail (on Home) | 🔴 | — | No horizontal chip rail on Home. Categories live on the `explore.tsx` tab as a 2-col image-card grid. |
| Bottom nav with 5 tabs | 🟡 | `app/(tabs)/_layout.tsx` lines 96–215 | 5 visible tabs (index, read, connect, explore, profile) but: (a) "Connect" probably isn't in v11; (b) "Study" is the renamed `explore` route, not Discover; (c) 9 additional `href: null` tabs are registered. |
| Bottom nav gold underline active state | 🟡 | `_layout.tsx` line 53 (`tabBarActiveTintColor: theme.accent`) | Active state is gold tint on the icon + label, not a gold underline bar. Underline is net-new. |
| `RotatingPanel` (legacy 2-card carousel) | ⚠️ | `components/home/RotatingPanel.tsx` | Older Signpost+Reflection swiper. v11 superseded by `VotdHeroCard`. Need to confirm it is dead code before removal. |

### Screen 2 — Bible Reader

| Spec component | Status | Evidence | Notes |
|---|---|---|---|
| Bible Reader chapter view | ✅ | `app/read/[bookId]/[chapter].tsx` (1,450 lines) | Full chapter renderer. |
| Bible Reader book/chapter picker entry | ✅ | `app/(tabs)/read.tsx` (343 lines), `app/read/[bookId]/index.tsx` (186 lines) | OT/NT split, books from `/api/books`. |
| Translation picker chevron | ✅ | `app/(tabs)/read.tsx` lines 35–48, `showPicker`/`Modal` state | Backed by real `/api/translations` endpoint (see `server/routes/bible.ts` line 431). Falls back to KJV/ASV/WEB if API empty. |
| Translation picker chevron *inside* chapter view | 🟡 | `app/read/[bookId]/[chapter].tsx` (`useTranslation` context wired) | Chapter view is translation-aware via `TranslationContext`, but I did not confirm a chevron control on the chapter screen itself — likely need a small UI add. |
| Reader-controls strip (Listen / Bookmark / Highlight) | 🟡 | `components/reader/TTSPlayerBar.tsx` (17k, Listen), `handleBookmark` and `handleHighlight` in `[chapter].tsx` (lines 184–210) | All three behaviors exist, but as separate surfaces (TTS player bar + per-verse action sheet), not as a single persistent reader-controls strip. Probably needs a small new bar component. |
| Long-press verse → action sheet | ✅ | `[chapter].tsx` line 883 (`handleVerseLongPress`), 1100 (`onLongPress` with 400ms delay) | Triggers haptic + opens action sheet via `setToolbarVerse`. |
| EGW commentary amber ⓘ affordance + bottom sheet | 🔴 | — | Not present on a per-verse basis. Backend has `server/routes/commentary.ts` and `server/routes/egw.ts`; `RelatedContent` and `ContextPanel` exist but not as the per-verse amber ⓘ the spec describes. Net-new affordance. |
| Highlight colors (yellow / green / blue / orange) | ✅ | `[chapter].tsx` lines 47–55 (`HIGHLIGHT_COLORS`) | Exact 4-color palette match: blue #90CAF9, yellow #FFF176, green #A5D6A7, orange #FFCC80. |
| Highlight persistence | ✅ | `POST /api/highlights`, `GET /api/highlights/:uid`, `userHighlights` table (schema line 709) | Cache-invalidated via React Query on save. |

### Screen 3 — Discover

| Spec component | Status | Evidence | Notes |
|---|---|---|---|
| Discover screen entry | 🟡 | `app/(tabs)/explore.tsx` (12.3k) | Exists but titled "Study" with subtitle "Scripture, Sabbath School, and tools for deeper growth." Not labeled or structured as v11 Discover. |
| Discover search field | 🔴 | — | No `TextInput` in `explore.tsx`. Search is a separate hidden tab (`app/(tabs)/search.tsx`, 21k, `href: null`). |
| Discover topical chip rail (distinct from Home) | 🔴 | — | No chip rail. Current explore renders a fixed 6-card image-tile category grid (CATEGORIES const lines 33–67). |
| Reading Plans list | 🟡 | `app/(tabs)/plans.tsx` (55k, hidden via `href: null`) | Full Plans tab exists with Devotional Plans, Reading Plans, ODB sections — but it is detached from the Discover surface and not in the visible nav. |
| Hero featured plan | 🟡 | `plans.tsx` likely contains a hero block (file references Animated, gradients, theme colors) | Need to confirm visual structure matches v11 hero treatment — flag for Mohd. |
| Plan card (color tile + icon, no photos) | 🟡 | `plans.tsx` `DEVOTIONAL_THEME_GRADIENTS` (10 themed gradient pairs) | Matches the "color tile + icon, no photos" rule conceptually (LinearGradient backgrounds). Need visual diff against v11 mock. |

### Screen 4 — Sabbath School Detail

| Spec component | Status | Evidence | Notes |
|---|---|---|---|
| Sabbath School Detail screen | ⚠️ | Two implementations: `app/sabbath-school.tsx` (835 lines) + `app/lesson/[id].tsx` (1,939 lines) | Divergent surfaces. `lesson/[id].tsx` is the larger and uses `StudyDepthSelector`; `sabbath-school.tsx` is the entry point reached from `SabbathSchoolCard`. Need to choose the canonical v11 surface before building. |
| Quarter / lesson / day hierarchy | ✅ | Schema: `sabbathSchoolQuarterlies` (line 1689), `sabbathSchoolLessons` (1707), `sabbathSchoolDays` (1722); routes: `app/sabbath-school-quarter.tsx`, `app/sabbath-school-day.tsx` | Full 3-level hierarchy in DB, real Adventech sync (`server/services/sabbath-school-sync.ts` BASE_URL `sabbath-school.adventech.io/api/v2`). |
| Memory verse card | 🔴 | — | Not found in any of the four sabbath-school files. Spec calls it out explicitly; needs net-new component. |
| "Ask the Study Tutor" gold CTA | 🔴 | Only matches: `app/settings.tsx` line 359 (a row label) | No CTA on lesson day screens. Net-new component + decision on what it routes to (existing AI study guide or new tutor surface). |
| Day reflection journal | ✅ | `app/sabbath-school-day.tsx` (811 lines) — `journalEntry`, `REFLECTION_PROMPTS`, mutation hooks | Functional. |
| Discussion prep | ✅ | `app/sabbath-school-discussion.tsx` (404 lines), `sabbathSchoolDiscussionPrep` table (schema line 1750), `/api/sabbath-school/discussion-prep` | Full surface. |

### Screen 5 — Profile

| Spec component | Status | Evidence | Notes |
|---|---|---|---|
| Profile entry | ✅ | `app/(tabs)/profile.tsx` (48k, redesigned v10) | Full screen with avatar, name (Lora_700Bold), share-profile, settings gear. |
| Stats (streak / verses / plans) — Lora display | 🟡 | `profile.tsx` lines 240, 311, 691 (`streak` rendered Inter_700Bold, name Lora_700Bold) | Streak count uses Inter_700Bold, not Lora as the spec implies for "display" stats. Section headers do use Lora_700Bold. Cosmetic update. |
| Active plans with gold progress bars | 🔴 | — | I did not find an active-plans block with gold progress bars in `profile.tsx`. Plans data lives in `plans.tsx`. Net-new section on Profile. |
| Saved / Notes / Highlights tabs | 🟡 | Queries exist: `/api/bookmarks/{uid}`, `/api/highlights/{uid}`, `/api/notes?userId={uid}` (lines 158–170); recent items shown but not in a tabbed UI | Data is loaded into the screen but rendered as flat "Activity" rows, not as a tabbed Saved/Notes/Highlights section. Tab UI is net-new; backend ready. |
| Kids Mode toggle (visible on Profile) | 🔴 | `KidsModeContext` exists in `context/`, used in `_layout.tsx` | Toggle is not surfaced on the Profile screen. May exist in Settings; needs to be promoted to Profile per spec. |
| Dark Mode toggle (visible on Profile) | 🔴 | `useTheme` hook reads system theme; no manual toggle UI | Theme is auto-from-system. Manual override toggle is net-new. |
| Streak bottom sheet | ✅ | `profile.tsx` lines 99, 677–720 (`streakSheetOpen`, modal with weekly grid) | Full sheet with stats and weekly visualization. |
| Badges grid | ✅ | `profile.tsx` lines 71–80 (`BADGES`), 344–360, plus `components/profile/BadgesGrid.tsx` | 8 badges: First Steps, Week Warrior, Perfect Week, Month Strong, Deep Diver, Explorer, Scholar, Centurion. |
| Activity section | ✅ | `components/profile/ActivitySections.tsx` | Existing v10 component. |

### Cross-cutting — Design tokens

| Spec token | Status | Evidence | Notes |
|---|---|---|---|
| Gold accent `#C9933A` | ✅ | `constants/colors.ts` line 1 | Exact match across all themes. |
| Gold dark `#A87828` | ✅ | `constants/colors.ts` line 17 | Used in CTA gradients. |
| Parchment light bg | ✅ | `constants/colors.ts` line 3 (`#F5EFE0`) | |
| Ink text `#2C1810` | ✅ | `constants/colors.ts` line 4 | |
| Dark bg `#050507` (per `replit.md` v10 spec) | ⚠️ | `constants/colors.ts` line 36 uses `#13141C` for `dark.background` | Discrepancy. `replit.md` line 51 documents "Deep dark mode (`#050507`)" but `colors.ts` ships `#13141C`. v11 needs to pick one and update both. |
| Sabbath theme | ✅ | `constants/colors.ts` lines 145–172 (`getSabbathTheme`) | Both light and dark Sabbath palettes with `#D4A245` warm-gold variant. |
| Kids palette | ✅ | `constants/colors.ts` lines 65–143 (`KidsColors`) | Full light + dark Kids palette. |
| Lora display font | ✅ | `_layout.tsx` font loader, used as `Lora_400Regular_Italic`, `Lora_600SemiBold`, `Lora_700Bold` throughout | |
| Inter UI font | ✅ | `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` | |

---

## Section 3 — Functional Gaps

Items that look visual on the canvas but actually require backend or state work:

1. **Three-tab hero card state management — DONE.** `VotdHeroCard.tsx` already manages `activeTab` local state, `showSignpostSheet`, `showReflect`, optimistic save state. No backend gap.

2. **Translation picker switching logic — DONE.** `TranslationContext` exists in `context/TranslationContext`, `/api/translations` endpoint live, `bible_translation` and `bible_cache` tables ready, `users.preferredBibleTranslation` column persists choice. The chapter renderer reads via `useTranslation()`. Real switch works; UI may need polish per Section 2.

3. **EGW commentary content delivery — PARTIAL.** Backend is ready: `server/routes/egw.ts` (EGW Writings API integration) plus `server/routes/commentary.ts` plus HelloAO commentaries. The verse-level amber ⓘ affordance and the bottom-sheet renderer are net-new frontend work. No new backend needed unless the spec requires per-verse commentary indexing (currently chapter/passage-level).

4. **Daily reading time notification scheduling — CLIENT-ONLY.** `lib/notifications.ts` (referenced by `components/profile/NotificationSettings.tsx`) schedules local notifications via expo-notifications: `setReminderEnabled`, `setReminderTime`. There is no server-side scheduling, no FCM/APNS push from backend, and Android Expo Go is explicitly degraded. If v11 expects server-driven reminders that survive uninstall/reinstall, this is net-new server work + push token storage.

5. **Saved verses / notes / highlights data model — DONE.** `userNotes` (schema 687), `userHighlights` (709), `userBookmarks` (734) tables all exist with full CRUD endpoints. Frontend tabs UI is the only gap.

6. **Active plans + gold progress bars on Profile — PARTIAL.** Schema: `userPlanEnrollments` (638), `userPlanProgress` (662), `readingPlans` (2116), `userPlans` (2156). Backend endpoints exist via `server/routes/plans.ts`. The Profile screen does not query these for an active-plans block; net-new UI section + a `/api/users/:id/active-plans` aggregation (or compose existing endpoints client-side).

7. **Sabbath School "Ask the Study Tutor" CTA — UNRESOLVED.** No backend route or AI persona is named "Study Tutor." The 4-Layer Study Model + 3 AI personas (Scholarly / Pastoral / Ellen White, per `replit.md` line 58) exist via `server/services/ai-engine.ts`. Decision needed: does "Study Tutor" map to the existing Pastoral persona, or is it a new fourth persona?

8. **Memory verse card on Sabbath School Detail — DATA QUESTION.** Adventech lessons include a memory text. Need to confirm the field is being captured into `sabbathSchoolLessons` (current schema columns not enumerated in this audit — flag for verification).

9. **Dark Mode toggle on Profile — UNRESOLVED.** The app currently follows system theme via `useTheme(isKidsMode)`. A manual toggle requires new persisted state (AsyncStorage + a `themeMode: 'light' | 'dark' | 'system'` setting), modification to `useTheme` to honor an override, and propagation through `_layout.tsx`. Small but real change.

10. **Kids Mode toggle on Profile — PARTIAL.** `KidsModeContext` is wired and `_layout.tsx` already conditionally renders Kids tabs. Just need to surface the toggle on Profile (Kids Mode itself stays Phase 2).

---

## Section 4 — Infrastructure Observations

**AWS migration — caveat.** The brief references "the recent AWS migration" but `replit.md`, `app.json`, `package.json`, `railway.json` (yes, Railway is still present at root), and `.replit` give no indication AWS is the current host. `server/index.ts` is a plain Express server. If the AWS migration has happened, none of the in-repo config reflects it; if it hasn't, the brief may be premature. **Flag for Mohd.**

**Environment variables already wired** (per `server/env.ts` references, `.env.example`, and code grep):
- `OPENAI_API_KEY` (gpt-4o-mini)
- `ELEVENLABS_API_KEY` (TTS, 5 pioneer voices)
- ODB endpoint (no key — public WordPress REST)
- EGW Writings API (`a.egwwritings.org`, key in env)
- HeyGen API (avatar video)
- Cloudinary (video storage)
- LiveKit (live fellowship)
- Luma AI, Runway Gen-4.5 (image/video pipeline)
- Adventech Sabbath School (`sabbath-school.adventech.io/api/v2`, no key — open source)
- API.Bible, NLT, getbible.net (Bible translations)
- HelloAO (commentaries)
- YouTube Data API v3 (key in env)
- nodemailer (SMTP — likely SendGrid-compatible, not SendGrid SDK specifically)

**Third-party services the v11 spec might require but are NOT yet wired:**
- **Mapbox** — no Mapbox in `package.json`, no Mapbox routes. Bible maps are custom (`components/BibleMap.tsx`, `components/AtlasPlate.tsx`). If v11 Discover or Sabbath School needs interactive geographic maps, this is net-new.
- **SendGrid (specifically)** — current setup uses generic nodemailer SMTP. If v11 mandates SendGrid for templated transactional emails, swap is small but needs the API key.
- **Push notification service** — `expo-notifications` is local-only; no server-side push registration / token storage / FCM project setup is visible. Required for any v11 server-driven reminder.

**Existing infra strengths:**
- Drizzle ORM + PostgreSQL with 90+ tables, migrations folder live
- React Query with AsyncStorage offline persistence (`@/lib/query-client`)
- JWT auth + bcrypt + rate-limited endpoints
- Guest device-UUID identity (lets unauthenticated users save)
- i18next 6-language UI + 9-translation Bible cache
- Translation cache + per-chapter API caching
- Admin worker runner, demo seed system, role-gated middleware

**Notable bloat / cleanup candidates** (relevant to Phase 1 risk surface):
- 14 tab routes registered, only 5 visible — `family.tsx`, `kids-stories.tsx`, `kids-learn.tsx`, `kids-stars.tsx`, `plans.tsx`, `search.tsx`, `study.tsx`, `connect.tsx` all need a deliberate keep/move/remove decision.
- `app/(tabs)/index.tsx` is 67k bytes / 2,000 lines and `replit.md` line 82 says "do NOT restructure" — this constrains how Phase 1 Home edits can be made.
- `components/home/RotatingPanel.tsx` superseded by `VotdHeroCard.tsx`.
- `app/sabbath-school.tsx` vs `app/lesson/[id].tsx` divergence.

---

## Section 5 — Recommended Build Order

Based on observed dependencies and risk:

1. **Design-token reconciliation (½ day).** Pick `#050507` or `#13141C` for the dark background; update `constants/colors.ts` and `replit.md` together so Phase 1 work doesn't drift. Confirm Lora-vs-Inter assignments in v11 mocks. Block downstream UI work until tokens are settled.

2. **Tab bar rationalization (1 day).** Decide the 5 visible Phase 1 tabs (almost certainly Home / Read / Discover / one of {Sabbath, Plans, Connect} / Profile). Add the gold-underline active state. Mark non-Phase-1 tabs as `href: null` deliberately. One coordinated edit to `app/(tabs)/_layout.tsx`.

3. **Discover rebuild (3–4 days).** New top-level screen: search input + topical chip rail + categories grid + featured plan hero + plan cards. Pulls from existing `plans.tsx` content but with v11 layout. This is the biggest visible delta and unblocks Profile linking to active plans.

4. **Profile v11 polish (2 days).** Add Active Plans section (gold progress bars), Saved/Notes/Highlights tabs (data already loaded), Kids Mode toggle, Dark Mode toggle. Tweak streak typography to Lora if spec confirms. Promote toggles up from Settings.

5. **Bible Reader polish (2 days).** Add the persistent reader-controls strip (Listen / Bookmark / Highlight). Add the per-verse EGW commentary amber ⓘ + bottom sheet (backend already serves commentary). Confirm the chapter-view translation picker chevron exists/lands gracefully.

6. **Sabbath School Detail consolidation (3 days).** Decide canonical surface (`sabbath-school.tsx` vs `lesson/[id].tsx`). Add the Memory Verse card (verify Adventech field is captured in `sabbathSchoolLessons`). Add the "Ask the Study Tutor" gold CTA — first decide what AI persona it routes to. Migrate the loser to a redirect or remove.

7. **Home polish + cleanup (1 day).** Confirm `RotatingPanel` is dead and remove. Cross-check `DevotionalCard` against the v11 EGW Devotion row. Decide whether Daily Reflection should remain the third hero tab or split out as a standalone card.

8. **Notification scheduling decision (½ day investigation, then either 1 day or 5 days build).** Confirm with Mohd whether v11 wants server-driven push or is fine with the existing client-only local notifications. If server-driven: add push token registration, server scheduler, FCM/APNS project config.

**Why this order:** tokens and tab structure are foundational and cheap to get wrong; Discover is the largest visible gap and its absence is most likely to be caught in QA; Profile and Reader are polish on already-working systems; Sabbath School consolidation is risky but can run in parallel with Profile; notifications is decision-dependent and shouldn't block visible UI.

---

## Section 6 — Open Questions for Mohd

1. **Is the AWS migration actually done?** I see Railway config still in the repo and no AWS-specific env or build artifacts. The brief references "post-AWS migration" — confirm hosting state so I don't recommend infra changes against the wrong target.

2. **What are the 5 Phase-1 tab labels?** Current visible nav is Home / Read / Connect / Study / You. The audit spec lists 5 *screens* (Home / Bible Reader / Discover / Sabbath School Detail / Profile) but doesn't say all 5 are tabs. Sabbath School is currently reached from a Home card — is that the v11 intent, or is it a fifth tab now?

3. **`RotatingPanel` removal — can I delete it?** It is the older 2-card carousel and `VotdHeroCard` clearly supersedes it. But `replit.md` line 82 says "do NOT restructure" the Home monolith. Need explicit go-ahead.

4. **Sabbath School Detail canonical surface — `sabbath-school.tsx` or `lesson/[id].tsx`?** Both render lesson detail. `lesson/[id].tsx` is bigger and uses `StudyDepthSelector`; `sabbath-school.tsx` is the entry from the Home card. Which is the v11 surface?

5. **"Ask the Study Tutor" — is this a new AI persona or an alias for an existing one?** Existing personas per `replit.md` are Scholarly, Pastoral, Ellen White, plus the 5 Adventist Pioneers. If "Study Tutor" is a new fourth persona, that's a content decision (system prompt, voice, etc.) before any UI work.

6. **Dark Mode override toggle — do you want manual override, or stay system-driven?** Currently the app follows the OS theme. A manual toggle requires a small but real refactor of `useTheme` and AsyncStorage persistence. The spec says "Dark Mode toggle (visible on Profile)" but doesn't specify whether it should override or just mirror system.

7. **Gold underline active tab state — exact shape?** Current implementation uses gold tint on the icon + label. v11 spec says "gold underline." Confirm: thin bar under the active label, full-width or label-width, with what radius?

8. **Daily Reflection — third hero tab or standalone card?** It currently lives as the third tab inside `VotdHeroCard`. The audit checklist lists it as a separate item ("Daily Reflection static card"), implying maybe it should be a standalone Home row. Confirm intent.

9. **Notification cadence — client-local or server-driven?** Existing implementation is client-only via expo-notifications. Server-driven push is significant net-new work; needs explicit confirmation before estimating.

10. **Memory verse data — does Adventech sync capture the memory text into `sabbathSchoolLessons`?** I did not enumerate every column on that table; the field may be there or not. A 30-second column check by anyone with DB access answers this.

11. **`#050507` vs `#13141C` for dark background — which is canonical?** `replit.md` documents `#050507`; `constants/colors.ts` ships `#13141C`. Pick one for v11.

12. **Is `connect.tsx` (currently a visible tab) part of v11 or should it be retired/hidden?** It is 6k bytes and not referenced in the Phase 1 spec checklist.

---

**End of audit.** No code was modified; no migrations were run; no packages were installed. The single output file is this document at `docs/handoff/PHASE_1_CODEBASE_AUDIT.md`.
