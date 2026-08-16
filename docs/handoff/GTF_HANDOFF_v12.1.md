# GRACE THROUGH FAITH — Master Handoff Document v12.1

**Date:** August 17, 2026
**Prepared for:** New Agent / Developer Onboarding
**Supersedes:** v12.0 (August 15, 2026) — this revision corrects v12.0 against a live codebase verification run on August 17, 2026. Every technical claim below was checked against source, not carried forward on trust.

**What changed from v12.0:** corrected counts (screens/components/routes/migrations/topics), corrected tab-label status (decided but NOT yet implemented in code), moved 9 "active bugs" to fixed (verified in source), removed 3 stale Tier-2 items that are already resolved (YouTube route, bare /api/notes, kids-scenes, coach-mark colors), flagged the pending v10 cache bump as now due.

---

## 1. Project Overview

- **App Name:** Grace Through Faith (GTF)
- **Mission:** SDA spiritual formation and teen evangelism mobile app
- **Domain:** gracethroughfaith.app
- **Admin Email:** joehuber0881@gmail.com
- **Stack:** React Native / Expo, Express/TypeScript, PostgreSQL/Drizzle ORM
- **Revenue Model:** B2B — Conference and Union bulk licensing subscriptions
- **Founder:** Joe Huber — solo non-developer founder, Gippsland, Victoria, Australia
- **Developer Status:** Mohd (previous developer) quit August 2026. No active developer as of August 2026.

## 2. Environment & Repositories

**Code Locations**
- GitHub: https://github.com/psalms42081/grace-through-faith-app
- Replit (live backend): https://grace-through-faith.replit.app
- Local (Cursor/VS Code): `C:\Users\joehu\OneDrive\Desktop\GTF APP\grace-through-faith-app`

**⚠️ Critical — Two Folder Problem**
There are TWO local folders. ALWAYS use the OneDrive Desktop path above. The folder at `C:\Users\joehu\grace-through-faith-app` is outdated and must be deleted.

**⚠️ Critical — Sole Deploy Target**
Replit is the only backend deploy target. A Railway experiment was run and abandoned — it caused significant debugging loss. Railway config has been fully removed (`railway.json` deleted, CORS allowances removed from `server/index.ts`) — **verified absent August 17, 2026**. Do not re-introduce Railway under any circumstances.

**Environment Variables**
- Frontend: `EXPO_PUBLIC_DOMAIN=grace-through-faith.replit.app` in `.env`
- Backend: All secrets live in the Replit Secrets panel only — never share `.env` with anyone
- Key services: OpenAI, ElevenLabs, Cloudinary, Google Translate, YouTube Data API v3

**Git Sync Workflow**
1. Make changes in Cursor (local) or Replit Agent
2. `git add -A` → `git commit -m "message"` → `git push` (from OneDrive Desktop folder)
3. In Replit shell: `git pull --rebase origin main`
4. Restart Replit backend (Stop → Run)
- Conflict on `CODE_REVIEW_REPORT_2026-04.md`: `git checkout --theirs CODE_REVIEW_REPORT_2026-04.md` → `git add` → `git rebase --continue`

## 3. Design Language (Non-Negotiable)

- **Background:** `#050507` (near black) — ✅ verified set in `constants/colors.ts`
- **Gold Accent:** `#C9933A` — use sparingly, max 3–4 appearances per screen
- **Headings:** Lora serif font · **Body:** Inter font
- **Aesthetic:** Emmanuel Lubezki meets A24 — cinematic, dark, warm gold
- **UX Benchmark:** YouVersion (design and navigation patterns)

## 4. Architecture *(counts verified Aug 17, 2026)*

**Frontend**
- React Native / Expo SDK, Expo Router (file-based routing), TanStack React Query, React Native Reanimated
- **98** screen files in `app/` *(v12.0 said 96)*
- **76** component files in `components/` *(v12.0 said 74)*
- Cache key: `grace-through-faith-cache-v9` in `lib/query-client.ts` (line 166) — ✅ verified
- **Next cache bump: v10 — NOW DUE.** The coach-mark gold restyling it was waiting on is complete in source (see §9).

**Backend**
- Node.js / Express / TypeScript, Drizzle ORM, PostgreSQL (hosted on Replit)
- **40** route modules in `server/routes/` *(v12.0 said 38)*
- **3** migrations in `migrations/` (`0000_sharp_slyde`, `0001_sabbath_curriculum_tracks`, `0002_sabbath_media_columns`) *(v12.0 said 1 — wrong)*

**Tab Labels — decided, NOT yet implemented**
- **Decision (Aug 2026):** Home / Bible / Discover / Study / Profile
- **Current code** (`app/(tabs)/_layout.tsx`): still Home / Read / Connect / Study / You
- v12.0 presented the new labels as "finalised" without noting the rename is still an open build task. It is part of the v11 net-new work.

**Key File Paths** *(all verified to exist)*
- `app/(tabs)/index.tsx` — Home screen monolith, 1,952 lines (DO NOT RESTRUCTURE)
- `app/(tabs)/study.tsx` — Study tab monolith, **5,462** lines *(v12.0 said 5,446)* (do not restructure — post-launch)
- `app/settings.tsx` — Settings screen
- `app/(tabs)/profile.tsx` — You/Profile tab
- `app/conference-portal.tsx` — Conference Bulk Licensing Portal
- `app/leader-analytics.tsx` — Church Hierarchy Analytics Dashboard
- `app/touchpoints.tsx` — Signpost grid (**44** topics in `server/data/touchpoints.ts`, not 42)
- `app/touchpoint-topic.tsx` — Individual Signpost topic screen
- `app/historic-voices.tsx` — Historic Voices screen
- `components/EllenWhiteHologram.tsx` — Pioneer hologram component
- `components/CoachMark.tsx` / `components/InlineCoachTip.tsx` — **already restyled to gold** (`COACH_GOLD = "#C9933A"`; blue `#1E88E5` only referenced in comments)
- `contexts/PioneerContext.tsx` — Pioneer selection and hologram state
- `contexts/AuthContext.tsx` — Authentication state
- `constants/pioneers.ts` — 5 pioneer definitions with ElevenLabs voice IDs
- `constants/colors.ts` — Design tokens (dark bg `#050507` ✅)
- `server/data/touchpoints.ts` — 44 Signpost topics with full content
- `server/data/bibleProjectVideos.ts` — YouTube video assignments per topic
- `server/routes/community.ts` — Church search (fixed with ILIKE)
- `lib/query-client.ts` — React Query config and cache version

## 5. Golden Rules for All Agents and Developers

1. Diagnose before fixing — always show root cause before writing any code
2. One fix at a time — never batch changes, confirm each before moving on
3. Never restructure `index.tsx` — monolith, targeted edits only
4. Never restructure `study.tsx` — 5,462-line monolith, post-launch work only
5. Show me code before applying — always present changes for approval first
6. Push back and discuss — do not blindly execute, suggest better approaches
7. Never share `.env` or API keys with anyone
8. Never give database access to external developers
9. Always bump cache version when adding new server data (currently v9; v10 bump now due)
10. Always push to GitHub and pull into Replit after local changes
11. Replit is the SOLE deploy target — do not introduce Railway or any other backend host

## 6. Sabbath School — Major Update (August 2026) ✅ verified accurate

The Sabbath School module migrated from GitHub scraping to the official Adventech API (v2).

**SS Sync Bug — FIXED August 2026** *(verified in source and database)*
- Root cause: Adventech publishes the quarterlies index before a future quarter's lessons exist. An empty lessons fetch silently created an orphan quarterly row that `shouldSync` treated as fresh, suppressing resync.
- Fixes (all present in `server/services/sabbath-school-sync.ts`): lessons index validated before quarterly write; forced resync on zero-lesson quarterlies; adjacent-quarter sync retries them; silent failures now log; empty `catch {}` blocks in `server/routes/sabbath-school.ts` now log.
- Orphan 2026-04 row deleted; database verified: 12 quarters × 13 lessons each.

**Canonical SS File Chain** *(verified)*
`app/sabbath-school.tsx` → `app/sabbath-school-quarter.tsx` → `app/sabbath-school-day.tsx`
via `server/services/sabbath-school-sync.ts` → `sabbathSchool*` tables → `server/routes/sabbath-school.ts`
**DEPRECATED (do not modify for SS):** `app/lesson/[id].tsx` (general learning system) and `app/kids/sabbath-school.tsx` (hardcoded kids lessons). No GitHub-scraping code remains in the wired path.

Also added: official Adventech API integration, official MP3 audio, official video, HTML sanitization fixes.

## 7. v11 Redesign Package ✅ verified accurate

- 5 core screens: Home, Bible Reader, Discover, Sabbath School Detail, Profile. Design canvas is source of truth.
- Package: `docs/handoff/` (cover brief `00_README.md`, component spec, DB schema proposal, API contract, plus `PHASE_1_CODEBASE_AUDIT.md`)
- Audit: ~65–70% of the 5 screens already exists; ~30–35% net-new
- **5 Open Questions — All Resolved Aug 2026** (recorded in audit Section 6): Railway deleted; dark bg `#050507`; Study Tutor is net-new (phase decision open); tab labels Home/Bible/Discover/Study/Profile (rename not yet coded — see §4); canonical SS chain as in §6.
- Hero card: 3 tabs (Verse / Signpost / Reflection), Signpost bottom sheet — ✅ built

**Pending Decisions**
- Task #13: gpt-4o-mini → gpt-5-mini (~1.7× input / 3.3× output cost) — undecided; option to narrow to user-facing calls only
- Study Tutor Phase 1 vs parked — open
- Signpost pill redesign + 200+ topics expansion

## 8. Multi-Pioneer Guide System ✅ verified accurate

- 5 pioneers (Ellen G. White, James White, Uriah Smith, J.N. Andrews, Joseph Bates) with ElevenLabs voice IDs in `constants/pioneers.ts`
- 6-step onboarding tour fires on first launch only — DO NOT CHANGE
- Per-screen feature guides: Sabbath School and Study Guide only; all other guidance uses `InlineCoachTip`
- **Correction:** coach mark / inline tip restyling to gold is **COMPLETE** in source, not "in progress" as v12.0 stated. The v10 cache bump tied to it is now due.
- User selects pioneer in Settings — persists via `PioneerContext`

## 9. Current Build Status (verified August 17, 2026)

**Completed since v11** — all v12.0 claims verified ✅, plus these items v12.0 listed as bugs that are actually FIXED in current source:

| v12.0 claimed bug | Verified status |
|---|---|
| Chapter marked complete on open | ✅ **Fixed** — 60-second `setTimeout` with cleanup (`app/read/[bookId]/[chapter].tsx` ~798–835) |
| Note save silent-fail with green success | ✅ **Fixed** — catch shows red "Failed to save note" |
| Save verse same silent-fail | ✅ **Fixed** — same red error path |
| Guest users hitting requireAuth routes | ✅ **Fixed** — reader gates on `isAuthenticated`; server middleware rejects invalid JWT with 401 |
| RelatedContent broken plan links | ✅ **Resolved by removal** — `RelatedContent.tsx` no longer contains any devotional-plan links (Word Study / Application / Continue Reading / Study This Chapter only) |
| Old blue coach marks on Quick Read / Guided Study / Deep Dive | ✅ **Fixed** — no `#1E88E5` in `study.tsx` or coach components |
| Hologram yellow dot drifts off screen | ✅ **Fixed** — positions clamped to viewport (`EllenWhiteHologram.tsx` ~43–79) |
| ON CONFLICT bug in analyticsRollupWorker.ts | ✅ **Appears fixed** — all conflict targets match unique keys |
| kids-scenes ENOENT | ✅ **Fixed** — `assets/kids-scenes` exists and is served |

**Still-open bugs (confirmed present in source):**
- 🔧 Sabbath window timer logs to console every 60s during active Sabbath window (`lib/sabbath.ts` ~299–317, dev-mode only)
- 🔧 "Today's Reading" hardwired to VOTD chapter, not the user's reading position (`components/home/TodaysPath.tsx` ~60–72 fed by `getTodaysVerse()` from `app/(tabs)/index.tsx`)
- ⚠️ Devotional/reading plans "fail to start" — could not be reproduced from `RelatedContent` (links removed); if still occurring it is inside `app/(tabs)/plans.tsx` resume flow (~930–984) and needs a live repro

## 10. Known Open Issues (Priority Order — cleaned)

**Tier 1 — Fix Before Demo**
1. Verify reading/devotional plans start correctly end-to-end (see §9 note — may already be fixed)
2. Bump cache to v10 and deploy (coach-mark restyling that gated it is done)
3. Onboarding flow — account creation too early (Life.Church pattern needed)
4. Implement decided tab rename: Home / Bible / Discover / Study / Profile

**Tier 2 — Fix Before Launch**
1. Pre-deploy build script hardening (note: `scripts/deploy-build.sh` exists and is wired into `.replit` deploy — v12.0's "missing" claim is outdated; review rather than create)
2. `expo-av` still installed alongside `expo-audio` — finish migration and remove `expo-av` (confirmed both in `package.json`)
3. `google-services.json` missing
4. Sabbath window timer console flooding (confirmed, see §9)
5. Life Application video pipeline cost controls
6. Today's Reading → follow user reading position (confirmed, see §9)
7. No versioned migration history beyond the 3 baseline migrations
8. `study.tsx` monolith split (XL effort — post-launch)

**Removed from v12.0's Tier 2 (verified already resolved):**
- ~~YouTube route orphaned~~ — it IS registered (`server/routes.ts:53` import, `:180` `app.use`)
- ~~Notes route needs bare `/api/notes`~~ — `POST /api/notes` and `GET /api/notes/:userId` both exist (`server/routes/user.ts`)
- ~~ON CONFLICT bug~~ and ~~kids-scenes ENOENT~~ — see §9 table

**Tier 3 — Post-Launch** *(unchanged from v12.0)*
Pioneer Voice Narration for Inductive Study · Prophecy Study Section (Daniel/Revelation) · HeyGen Talking Avatar Clips · Adventist Health Message (3-layer) · Full hologram screen coverage · Redis for horizontal scaling · Push notification triggers · Study Tutor Phase 1 (decision pending) · Signpost pill redesign + 200+ topics

## 11. Feature Completeness Map (corrected rows only)

All v12.0 rows stand except:

| Feature | v12.0 said | Corrected status |
|---|---|---|
| Coach Marks | ⚠️ In Progress | ✅ Complete (gold restyle in source; bump cache v10) |
| RelatedContent (Bible Reader) | ⚠️ Partial, hide plans | ✅ Plan links already removed; remaining sections work |
| Devotional / Reading Plans | ⚠️ Broken | ⚠️ Unverified — needs live repro; reader-side breakage is gone |
| Signpost / Touchpoints | ✅ 42 topics | ✅ 44 topics |
| Bible Reader | ✅ w/ bugs in progress | ✅ Complete — the 4 listed reader bugs are fixed |

## 12. Developer & Hiring Status *(carried forward from v12.0 — not code-verifiable)*

Mohd quit August 2026, leaving handover notes. No active developer as of August 15, 2026. Joe is working through the handover notes independently with Claude for strategy and Cursor for implementation.

| Developer | Status | Rate | Notes |
|---|---|---|---|
| Mohd | ❌ Quit Aug 2026 | Fiverr milestones | Left handover notes |
| Suneel Kumar | ❌ Pulled out | — | Values misalignment |
| Umair | ❌ Stalled | — | Could not access Replit |
| Ali | 🟡 Pending | $20/hr | Awaiting milestone breakdown |
| Methodical Developer | 🟡 Pending | $12/hr | Scope misunderstanding — 30–40wk quote |

**Rules for All Developers:** milestone-only payment; test task before access; no `.env`/API keys shared; Replit collaborator access only (no database access); all changes reviewed before merge.

## 13. Strategic Notes *(carried forward from v12.0 — not code-verifiable)*

- **Revenue:** B2B conference subscriptions (Hallow parish playbook); targets SDA Conferences/Unions; Conference Portal with pricing tiers + bulk enrollment calculator; Analytics GC → Division → Union → Conference → Church; differentiator: verified outcome data (baptisms, memberships)
- **Competitors/Partners:** Advent AI (most dangerous near-term); YouVersion (UX benchmark, Content Partner application — **do NOT integrate YouVersion Platform API**, ToS competition clause)
- **Opportunities:** GAiN Auckland (July 9–12, 2026 — note: this date has passed; update outcome); Vision Christian Media outreach pending; Luke Farrugia / Blue Vineyard Group follow-up pending
- **Content pipeline:** Luma Dream Machine Ray3, ElevenLabs (multilingual v2), Abdul Hafeez (MAK Studio), BibleWorld.ai
- **AI content policy:** human review before publishing; AI plan generator disabled/gated (theological risk); AI reflection chat acceptable; required disclaimer: "This content was generated by AI. Please compare with Scripture."

## 14. Cache Version History

| Version | Reason |
|---|---|
| v5 | Original |
| v6 | Great Controversy videos added |
| v7 | (skipped) |
| v8 | Various fixes |
| **v9 (current)** | Church search fix — stale data cleared |
| **v10 (due now)** | Coach mark restyling is complete — bump on next deploy |

## 15. Toolchain *(unchanged)*

Cursor IDE (local dev) · VS Code (browsing/git) · Replit (live backend, DB, agent work) · Expo Go (device testing) · GitHub (sync) · Claude (strategy)

Workflow: Claude (strategy) → Cursor (implementation) → GitHub (sync) → Replit (deploy) → Expo Go (test)

---

*End of Handoff Document v12.1 — Grace Through Faith. Next update after the plans-start verification and first developer hire.*
