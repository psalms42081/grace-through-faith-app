---
name: Devotions boundary and rollout
description: Product boundary and approval sequence for the Devotions tab redesign.
---

Devotions uses one landing in this order: Continue Today, Daily Readings, Devotional Series, Reading Plans, and Your Shelf. It gathers reading plans, Our Daily Bread, Ellen G. White daily readings, and devotional series, while Sabbath School remains a separate teal practice and route chain.

**Why:** The user confirmed that Sabbath School day must remain separate because combining it with Devotions would blur two distinct Adventist practices. The reviewed Devotions experience passed device approval before becoming live.

**How to apply:** `/devotions` is the canonical live tab route. Keep `/plans` and `/devotionals` as compatibility redirects, preserve the five-tab order Home/Bible/Devotions/Discover/Profile, and keep Sabbath School separate.