---
name: Mounted tab screens and root modals
description: Navigation constraint for tab screens that remain mounted while a root-level modal is open.
---

Tab navigators can keep previously visited screens mounted after the user switches tabs. A mounted background screen must not use live global route segments to decide that it has escaped its tab and issue a redirect. Opening a root-level modal changes those global segments for every mounted screen, so a background redirect can immediately replace the modal.

**Why:** This caused Sign In to resolve back to the last visited Sabbath School lesson from every guest entry point after Sabbath School had been visited.

**How to apply:** If a screen needs to know whether its own instance was mounted inside a tab, capture that ownership when the instance mounts and keep it stable. Use live global route state only for behavior that should genuinely follow the foreground route.