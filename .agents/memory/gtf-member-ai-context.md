---
name: Member AI context trust
description: Security and source-trust rules for member-facing, billable lesson tutors.
---

Rule: billable lesson tutors are member-only, and an “official source loaded” claim must come from a fresh server verification in the current screen visit.

**Why:** anonymous generation endpoints create a direct cost-abuse surface, while persisted client query caches can make stale lesson metadata appear freshly verified. The model must also never treat client-supplied lesson text as authoritative source context.

**How to apply:** enforce account authentication again on every billable generation endpoint; resolve lesson/source content server-side for each generation; force a fresh context check when the tutor opens; disable questions until that check succeeds; never send client-provided source text to the model.