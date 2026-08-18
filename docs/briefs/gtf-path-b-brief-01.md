# GTF Path B — Implementation Brief 01: Foundation + Home Screen
August 2026 · For Replit Agent / Cursor · Build one phase at a time, approval between each

---

## How to use this brief
This is the first build brief of the Path B revamp (light-mode YouVersion-style redesign). It covers Phase 0 (foundation) and Phase 1 (Home screen) only. Bible Reader, Plans, Discover, Profile, and dark mode get their own briefs later.

Standing rules (non-negotiable, from the project's golden rules):
- Diagnose before fixing — show root cause / current state before writing code
- One phase at a time — complete, show, get approval, then proceed
- Show code before applying
- Never share .env or API keys; Replit is the sole deploy target
- Push to GitHub → pull into Replit after approved changes

---

## Phase 0 — Foundation (no visual change yet)

### 0.1 Design tokens → `constants/colors.ts`
Add the Path B palette alongside the existing tokens (do not delete old tokens yet — 90+ screens still reference them):

```ts
// Path B (light) tokens
surface:      '#FBF7EE',  // app background, light default
surfaceCard:  '#FFFFFF',  // card surfaces
ink:          '#1F1A12',  // primary text
inkMuted:     '#8A8A8A',  // secondary text, metadata
coral:        '#E8604C',  // brand accent: primary buttons, active tab, streak, progress
coralInk:     '#C24431',  // small coral text (eyebrows, active tab labels) — WCAG-safe
gold:         '#C9933A',  // heritage: streak flame + analytics only
// Category tokens
catSabbath:   '#2A8C82',  // teal — Sabbath School
catEGW:       '#C77A2B',  // amber — EGW / devotionals
catPlans:     '#6E4FB8',  // violet — Reading Plans
catBible:     '#5B6B7A',  // blue-grey — Bible
catSignpost:  '#3A6FA8',  // blue — Signposts/topics
catHealth:    '#7A9B76',  // sage
catSun:       '#E8C25C',  // soft yellow
// SS gradient
ssGradient:   ['#1F7A70', '#4CAF8E'],  // deep teal → sea-green
```

⚠️ Canvas blue warning: some canvas frames drew light-mode body text and nav icons in a blue token purely as a canvas rendering workaround. Production ink is `#1F1A12`. Never port that blue.

### 0.2 Illustration assets
Create `assets/illustrations/` and add the 26-piece set with these names:
- Tiles: `plan-prayer.png`, `plan-prophecy.png`, `plan-youth.png`, `plan-new-believers.png`, `plan-sabbath.png`, `plan-health.png`, `plan-family.png`, `plan-doctrine.png`, `plan-end-times.png`, `plan-forgiveness.png`
- Rhythm icons: `rhythm-plan.png`, `rhythm-sabbath-school.png`, `rhythm-reflection.png`, `rhythm-morning.png`, `rhythm-listen.png`
- Covers: `cover-steps-to-christ.png`, `cover-desire-of-ages.png`, `cover-joshua.png`, `cover-daniel.png`, `cover-bible-in-a-year.png`
- Avatars: `avatar-coral.png`, `avatar-amber.png`, `avatar-sage.png`, `avatar-sky.png`, `avatar-violet.png`, `avatar-sand.png`

> Source note (added by agent): the finals live in `artifacts/mockup-sandbox/public/images/gtf-art/` under working names. Rename on export: `plan-prayer-v3.png` → `plan-prayer.png`, `cover-joshua-v2.png` → `cover-joshua.png`, `cover-bible-year.png` → `cover-bible-in-a-year.png`, `rhythm-ss.png` → `rhythm-sabbath-school.png`, `rhythm-reflection-candle.png` → `rhythm-reflection.png`.

### 0.3 Tab rename + icons — `app/(tabs)/_layout.tsx`
Current tabs: Home / Read / Connect / Study / You.
New tabs: Home / Bible / Plans / Discover / Profile.
This phase changes labels, icons, and route mapping only — screens behind the tabs are untouched for now.

Mapping: Read → Bible (same screen), You → Profile (same screen), Study tab removed from nav (study.tsx stays in the codebase, reachable from existing links — do not delete), Connect tab removed from nav (its screens remain routable), Plans → points at the existing plans screen, Discover → points at the existing discover/touchpoints surface (confirm best existing target before wiring; state your choice).

Icons: line icons from Lucide (already available via lucide-react-native or add it): house, book-open, calendar-days (Plans), compass (Discover), user (Profile).
Active state: coral icon + coral label. Inactive: inkMuted.

**STOP after Phase 0. Show the diff. Wait for approval.**

---

## Phase 1 — Home Screen (the visible revamp)

### 1.1 Build strategy — protect the monolith
`app/(tabs)/index.tsx` is a ~2,000-line monolith with a standing "do not restructure" rule. For a full visual rebuild, do not edit it in place. Instead:
- Create `app/(tabs)/home-v2.tsx` + new components under `components/home-v2/`
- Build the new Home there, reusing existing data hooks/queries from index.tsx (VOTD, SS lesson state, plan progress, streak) — import the logic, redesign the presentation
- When approved on device, swap: the Home tab route points at home-v2, and index.tsx is kept in the tree (renamed `index-legacy.tsx` or left unrouted) for one release as the rollback path
- Delete legacy only after the new Home has survived a full test pass

This honours "never restructure the monolith" by replacing rather than rewriting it, with a one-step rollback at all times.

### 1.2 Screen spec (top to bottom, per approved canvas frame)
- **Header** — date line (Inter, inkMuted, e.g. "Tuesday, August 18"), greeting "Good morning/afternoon/evening, {name}" (Lora, ink, ~28pt). Right side: Kids pill button, streak chip (gold flame 🔥 + count), avatar circle (coral gradient with initial, or chosen avatar asset)
- **Hero card** (white card, soft shadow, large radius) — segmented control: Verse / Signpost / Reflection. Verse tab: "VERSE OF THE DAY" eyebrow (coralInk, caps, Inter 12), verse text (Lora, ink, ~22pt), reference + translation (inkMuted). Actions row: coral primary button "Read {book} {ch}", bookmark icon button, share icon button. Signpost/Reflection tabs reuse existing hero-card tab logic from the current build
- **Sabbath School gradient card** — the screen's ONE gradient (locked rule: one gradient hero per screen, max). ssGradient background, white text: eyebrow "SABBATH SCHOOL · {quarter}", lesson badge chip ("Lesson {n} of 13"), lesson title (Lora, white, ~20pt), thin white progress bar, actions: white pill "Continue — {day}" + translucent "▶ Watch". Data from the canonical SS chain (sabbath-school sync tables) — no new data work
- **Daily Rhythm** — section title (Lora) + "{n} of 3 done" (inkMuted). Three white row cards: illustration tile (44px, from rhythm icons) + title (Inter semibold, ink) + meta line (inkMuted) + right-side completion circle (coral check when done). Rows: Today's Plan, Sabbath School, Evening Reflection
- **Explore Topics** — section title + horizontal chip rail. Chips in pastel category-token tints with token-coloured text. Tapping a chip deep-links to Discover pre-filtered to that topic (if Discover filtering isn't wired yet, link to the topic screen and note it as a TODO for the Discover brief)
- **Tab bar** — per Phase 0

### 1.3 Rules that apply on this screen
- Coral appears at most: primary CTA, active tab, streak/progress, completion checks. Nothing else
- Gold appears exactly once: the streak flame
- One gradient (the SS card). Every other card is flat white on cream
- No full-bleed photography anywhere
- Typography: Lora for greeting/verse/section titles, Inter for everything else
- Spacing on a 4pt grid; cards 16px side margin, 16–20px internal padding, 20–24px radius

### 1.4 WCAG pass (required before sign-off)
- White text on coral #E8604C: large text/buttons only. Small coral text uses coralInk #C24431 on light surfaces — verify ≥4.5:1
- White text on the SS gradient: verify ≥4.5:1 at both gradient ends; darken the light end if it fails
- inkMuted on surface: verify ≥4.5:1 for meta text sizes

**STOP after Phase 1. Provide screenshots in Expo Go. Wait for approval.**

---

## Explicitly OUT of scope for this brief
- Bible Reader, Plans, Discover, Profile redesigns (separate briefs)
- Dark mode (design exists; implemented after all five light screens ship)
- Kids Club / Juniors harmonisation (gold→coral on parent gate; separate brief)
- Restyling the other ~90 screens (they keep the old theme until their phase; mixed theming during rollout is accepted and temporary)
- Any backend/schema change
- Deleting study.tsx, Connect screens, or index.tsx

## Deploy notes
- Bump React Query cache key to v10 in `lib/query-client.ts` when Phase 1 ships (bump already due from the coach-mark work — fold it in here)
- Standard flow: local commit → push → Replit `git pull --rebase origin main` → Stop/Run
- Test on device in Expo Go before any deploy

## Acceptance checklist (Phase 1)
- [ ] App opens to light cream Home matching the approved canvas frame
- [ ] Tab bar reads Home / Bible / Plans / Discover / Profile with line icons, coral active state
- [ ] Hero card tabs (Verse/Signpost/Reflection) all function with existing data
- [ ] SS card shows live lesson + progress from the canonical SS chain
- [ ] Daily Rhythm completion states reflect real user data
- [ ] Topic chips render with category tints and navigate
- [ ] All 5 old tabs' screens still reachable and functional (nothing orphaned crashes)
- [ ] WCAG checks pass as specified
- [ ] Rollback path confirmed: repointing the route to index.tsx restores the old Home

End of Brief 01. Brief 02 (Bible Reader) follows after Home ships.
