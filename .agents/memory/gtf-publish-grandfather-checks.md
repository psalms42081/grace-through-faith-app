---
name: Publish-safe grandfather checks
description: How to preserve pre-rollout rows without triggering malformed Publish SQL for NOT VALID checks.
---

Do not use a `NOT VALID` check constraint in the development schema when that
constraint must be copied to production by Replit Publish. Use a normal validated
check with a fixed pre-rollout grandfather branch, but only after read-only
production queries prove that the intended legacy rows satisfy that branch.

**Why:** On 2026-08-21, Publish serialized a valid PostgreSQL `NOT VALID` check
with an extra closing parenthesis and failed validation. Making the original
check valid was not enough because production still held legitimate pre-rollout
rows awaiting provenance classification.

**How to apply:** Keep the strict rule for all post-cutoff rows, narrowly allow
only the intended pre-cutoff legacy class, and preserve catalog filtering at the
application layer. Recompute the development-to-production diff and execute the
exact generated constraint statement against a temporary production-shaped
table before asking for another Publish attempt.