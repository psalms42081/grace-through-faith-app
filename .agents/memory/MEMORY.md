# Memory Index

- [SDA lens prompt rule](gtf-sda-lens.md) — all generative AI calls must prepend the shared lens from sda-lens.ts; bump SDA_LENS_VERSION on prompt changes to bust caches.

- [Workflow rules with Joe](gtf-workflow-rules.md) — phase stops go BEFORE nav swaps; task-approval UI often mis-registers approvals as cancelled — confirm verbally, do small work in-session.

- [Sabbath School sync partial-quarterly trap](sabbath-school-sync-partials.md) — Adventech publishes quarter indexes before lessons; sync must reject empty lesson lists or orphan quarterlies suppress resync.
- Hosting decision (Aug 2026): Replit is production; Railway experiment abandoned and its config deleted — never reintroduce Railway CORS/config.
- Design canon: dark background is #050507 (design system / YouVersion benchmark); #13141C was drift. Canonical SS UI chain: sabbath-school.tsx → -quarter → -day (Adventech-wired); lesson/[id].tsx and kids SS are separate systems.
- [GTF light-mode redesign canon](gtf-light-redesign.md) — v12 light-first reskin: Coral #E8604C accent + coral-ink rule, one gradient hero per screen, teal = Sabbath School; replaces dark+gold for consumer app.
- [Web preview quirks](gtf-web-preview-quirks.md) — blank appPreview screenshots = onboarding gate/timing, not a broken app; web-only CORS on API calls is pre-existing noise. Use the e2e tester.
- [Plan taxonomy tiles](gtf-plan-tiles.md) — live plan categories are Identity/Mental Health/Relationships/Seasonal/Spiritual Growth; dedicated tiles + tints exist; Joe's tile-gen rules: one batch, no crescents, no sunbursts.
- [Path B WCAG deviations](gtf-path-b-wcag.md) — brief's SS gradient light end and #8A8A8A muted text fail 4.5:1 on cream; use ssGradientSafe + inkMutedText from home-v2 theme for all future Path B screens.
- [Devotions boundary and rollout](gtf-devotions-boundary.md) — Devotions gathers plans, ODB, EGW, and series in one landing; Sabbath School stays separate; review behind preview routes before live swaps.
- [Devotional authorship boundary](gtf-devotional-authorship.md) — catalog devotionals need human-curated provenance; hide legacy/AI records without breaking enrolled journeys.
- [Typecheck scope boundary](gtf-typecheck-scope.md) — root checks include operational scripts and seeds; exclude only standalone artifacts, generated output, and test harnesses.
