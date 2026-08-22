---
name: Publish schema ownership
description: Production DDL belongs exclusively to Replit Publish schema diff; builds remain schema-neutral while development keeps schema push.
---

Replit Publish schema diff is the only production schema mutation path. Production
builds must be completely database-free: no PostgreSQL connections, runtime-server
smokes, data seeds/checks, Drizzle push, numbered migrations, fallback DDL, raw
schema repairs, or schema-sensitive migration adoption. Development and post-merge
setup retain the normal development database schema-push path.

**Why:** A non-interactive build-time Drizzle push stopped at an unresolved rename
but exited successfully, leaving an incomplete build database. A later numbered
migration preflight then failed before catalog preparation, creating competing and
contradictory schema owners inside one Publish attempt.

**How to apply:** Put schema changes in the shared schema and let Publish present
and apply the production diff. Keep the build limited to compilation and static
asset export, and prove it passes with DATABASE_URL absent. Runtime startup recovery
may perform awaited, locked, idempotent data reads/writes only; if required schema
is absent, fail clearly with an instruction to run Publish rather than attempting
repair. Historical migration tools may remain for explicit development tests,
never automatic production paths.