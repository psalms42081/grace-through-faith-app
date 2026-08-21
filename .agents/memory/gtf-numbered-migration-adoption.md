---
name: Numbered migration adoption
description: Safety rules for serialized deployment migrations and adopting a pre-ledger database.
---

Hold one database-level lock across any migration sequence whose correctness
depends on seeders running between migrations. A lock held only by each
individual migration command leaves the seed window open to concurrent
deployments.

When adopting an existing pre-ledger database, baseline only migrations whose
postconditions have been positively verified. Execute safe, idempotent
migrations that contain data backfills rather than inferring completion from
column presence. Refuse adoption when a destructive migration's retirement
postconditions are absent.

**Why:** A deployment race can permanently ledger a catalog migration before a
competing deployment finishes seeding. Schema synchronization can also add a
column with its default while omitting an older migration's data correction, so
column-only baseline checks can silently certify incorrect production data.

**How to apply:** Whenever a numbered migration is added or legacy adoption
rules change, classify schema-only, data-backfill, and destructive behavior
separately. Extend fresh, concurrent, repeat, populated-adoption, and refusal
checks to cover the migration's actual postconditions.