---
name: GTF light-mode redesign canon (v12)
description: Locked design decisions for the YouVersion-inspired light-first reskin (Aug 2026)
---

# Light-mode redesign — locked decisions (Aug 2026)

- **Direction:** light-mode-first replaces the dark #050507 + gold canon for the consumer app. Old gold survives only in the streak flame (reads amber naturally) and analytics/admin dashboards (institutional accent).
- **Accent: Coral #E8604C** — chosen over Amber (heritage) and Terracotta. **Why:** Amber = repainting the old identity; coral reads youthful for the teen evangelism mission.
- **Coral-ink rule:** #E8604C on white is ~3.3:1 — fails WCAG for small text. Use a darkened variant (#C24431 in mocks) for small text/labels; full coral only on large buttons. Implementers must run a WCAG check when this graduates to the app.
- **One gradient hero per screen, maximum.** Same rationing spirit as the old "gold = brand accent only" rule. Gradient = flagship signal; multiplying gradients is drift.
- **Category colour coding stays:** teal = Sabbath School (SS gradient card is teal-based), purple = Reading Plans. Do not swap tokens per-screen.
- Base tokens: bg #FAF9F7, card #FFF, ink #1A1A1A (never pure black), muted #75706A. Lora = large headings/verse only; Inter elsewhere.
- **Tab bar final: Home / Bible / Plans / Discover / Profile.** Study tab retired — chapter study tools (Context, Word Study, Historic Voices, Application) move to the Bible reader's passage surface ("Study this chapter"); guided study methods (Guided Study, Deep Dive, Inductive) surface via Discover. **Why:** plans are the engagement loop and deserve a front door; dropping the tab must not orphan the Study monolith's features.
- Per-screen rules: Bible reader = zero gradient, near-zero coral (Listen only) — "scripture is the feature, the reader disappears". SS detail = teal family, gradient hero is the lesson card, today's row tinted. Discover = topics/search/featured, tiles flat token colours never gradients. Profile = quiet, coral only on streak + one CTA. Avatar gradient (coral 135deg #E8604C→#F2935C) is shared identity chrome, not a "hero" — allowed alongside a hero gradient.
- **Illustration set (Path B):** warm flat editorial vector, Penguin Classics register, per user's style-guide kit in attached_assets. **Hard content rule: never crescent moons or crescent-and-star compositions anywhere** (reads as Islamic symbolism — user-caught). Flame pair: Prayer = oil lamp, Evening Reflection = candle. Recurring sun/rays motif is deliberate brand vocabulary but AT CEILING (5 uses) — future assets must reach for other motifs first. Prayer = flat clay lamp dish; covers must be full-bleed rectangles, no vignettes/arches. Memory verse card is THE one dark surface app-wide (#050507 bg, cream text, teal label) — deliberate ceremony, all other cards stay light. Avatar rule: flame (coral) avatar never default — collides with streak flame; Joe's mock avatar = sky/wave. Assets in `artifacts/mockup-sandbox/public/images/gtf-art/`.
- Mocks live in the mockup sandbox under `gtf-light/` — all 6 screens (Home, Bible, SabbathSchool, Plans, Discover, Profile) mocked; awaiting user review.

## Pastoral-quiet rule (Joe, Aug 2026 — canon)
Topic pages for pastoral subjects (grief, addiction, abuse, anxiety, depression, loneliness, suffering, abandonment and similar) stay QUIET: no gamified elements, no streak nudges, no playful furniture. Applies to the Signposts topic-page light restyle and any future surface touching these topics.
**How to apply:** when sweeping touchpoint-topic/touchpoint-study to Path B light, use category token tints per topic but strip/omit streaks, celebration moments, sparkle icons, and playful CTAs on pastoral topics.
