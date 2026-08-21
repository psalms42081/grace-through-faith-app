---
name: Lint warning baselines
description: Why legacy lint warnings need finding-level fingerprints rather than aggregate budgets.
---

Keep the lint warning allowlist at finding-level identity. Lower it whenever a legacy warning is fixed, and never regenerate it wholesale merely to make validation pass.

**Why:** Aggregate total/rule/file budgets allow a new warning to replace a removed warning without failing. ESLint bulk suppressions in the current toolchain also store counts by file and rule, so they have the same warning-swap gap.

**How to apply:** Treat any warning outside the existing fingerprint set as a regression. When intentional source changes alter a legacy finding, review it explicitly and update only the affected baseline entry and aggregate counts.