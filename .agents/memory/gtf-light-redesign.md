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
- Base tokens: bg #FAF9F7, card #FFF, ink #1A1A1A (never pure black), muted #75706A. Lora = large headings/verse only; Inter elsewhere. Tab labels: Home / Bible / Discover / Study / Profile.
- Mocks live in the mockup sandbox under `gtf-light/`; Home must be approved before the other 4 screens are mocked.
