---
name: Expo Router route tree
description: Non-route helpers and Node-only tests must stay outside the app directory.
---

Keep framework-free helpers, test files, and other non-screen modules outside the Expo Router `app/` directory.

**Why:** Expo Router discovers TypeScript files under `app/` as routes. Node-only tests can break the web bundle, while helper modules produce missing-default-export route warnings.

**How to apply:** Put reusable logic in `lib/` and tests in a root-level test directory; keep `app/` limited to route components and route layouts.