---
name: Typecheck scope boundary
description: Defines which project code must remain visible to the root automated typecheck.
---

Operational scripts and server seeds belong in the root typecheck even when they are not part of the main application bundle. Exclude only independently configured artifacts, generated/build output, and test harnesses with their own execution path.

**Why:** Broadly excluding tooling made the quality gate pass while hiding a real stale identifier in a seed used by application workflows.

**How to apply:** When compiler noise appears in scripts or seeds, fix the source or add maintained dependency typings. Do not solve it by removing those directories from the normal validation graph.