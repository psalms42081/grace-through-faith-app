---
name: Expo nested-route query URLs
description: Cross-navigator web redirects can preserve screen params without serializing them into Expo Router's final browser URL.
---

When a legacy Expo Router web route redirects into a screen nested under a tab stack, query values can remain available to the destination screen while disappearing from the final browser URL. String hrefs, object hrefs, setParams, and post-mount history replacement did not make the canonical URL retain them reliably.

**Why:** The redirected Sabbath School lesson and archived quarter rendered the exact requested content, but repeated fresh-browser checks showed the final nested URL without its query string. URL-only synchronization attempts were overwritten by Expo's canonicalization.

**How to apply:** Treat destination content and route-state preservation separately from copy/refresh-safe browser URLs. If a nested screen must expose a durable canonical web URL, prefer restructuring the route so the public path is owned by the tab navigator rather than layering history or parameter workarounds onto a cross-navigator redirect.