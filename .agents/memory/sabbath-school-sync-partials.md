---
name: Sabbath School sync partial-quarterly trap
description: Why quarterlies can exist with zero lessons and the invariants that prevent it
---

**Rule:** A `sabbath_school_quarterly` row must never exist without lessons. The sync (server/services/sabbath-school-sync.ts) validates the Adventech lessons index BEFORE writing the quarterly, `shouldSync` forces a resync when the current quarterly has zero lessons, and adjacent-quarter sync treats zero-lesson quarterlies as missing.

**Why:** Adventech publishes the quarterlies index before a future quarter's lessons exist. `fetchJson` used to silently return null → empty lesson list → a "fresh" quarterly with no lessons that suppressed resync for 24h and confused `/api/sabbath-school/current` (orders by desc quarter_code). Incident: a 2026-04 orphan row had to be deleted manually.

**How to apply:** When touching sync logic, keep failures loud (fetchJson logs, no empty catch blocks in routes/sabbath-school.ts) and never stamp `lastSyncedAt` semantics as "healthy" unless lessons exist. Deleting an orphan quarterly is safe only if it has zero lessons (FKs are NO ACTION).
