---
name: SDA lens prompt rule
description: Every user-facing generative AI call must go through the shared SDA theological lens; bump the lens version to bust caches.
---

Rule: every user-facing generative AI feature must prepend the one canonical shared SDA lens prompt block (single shared module; exemptions for non-doctrinal utilities are documented in its header). Never reintroduce per-feature generic "Bible teacher" prompts or "respectful of all Christian traditions" phrasing.

**Why:** Aug 2026 audit found ~20 generic prompts; grief/state-of-the-dead answers risked non-SDA framing. Joe's rule: one shared block, no exceptions.

**How to apply:**
- Any material change to the lens prompt must bump the lens version constant — it is baked into generated-content cache keys, and a startup check purges the unversioned DB content caches when it changes, so stale content regenerates in every environment (including production after publish).
- Keep the lens pastoral: it explicitly instructs not to force distinctives where the topic doesn't raise them — preserve that when editing.
- Treat doctrine validation as two layers: deterministic checks guard production request wiring and trusted source context; periodic human live prompts judge the model's actual theology. **Why:** a free plumbing test catches the failure mode that previously mattered—the shared lens falling off during refactors—but cannot prove a live model will always follow it.
- **Protected refresh boundary:** `context_card` and `application_template` mix or may mix generated and curated material but have no provenance marker. Never bulk-delete them during a lens refresh. Add reliable generated-vs-curated provenance first, then refresh only AI-generated rows. User-authored study sessions, responses, prayers, notes, journals, progress, highlights, and bookmarks are always untouchable.
