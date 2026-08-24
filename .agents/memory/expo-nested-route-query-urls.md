---
name: Expo nested-route query URLs
description: Cross-navigator web redirects can preserve screen params without serializing them into Expo Router's final browser URL.
---

When a legacy Expo Router web route redirects into a screen nested under a tab stack, query values can remain available to the destination screen while disappearing from the final browser URL. String hrefs, object hrefs, public-path hrefs, setParams, and post-mount history replacement did not make the canonical URL retain them reliably.

**Why:** The redirected Sabbath School lesson and archived quarter rendered the requested content transiently, but repeated fresh-browser checks showed the final nested URL without its query string. Even targeting the destination's public `/ss/...` path still lost params. Moving the legacy public route owners under the tab group removed the cross-navigator replacement and preserved the query through copy, fresh context, and hard reload.

**How to apply:** Treat destination content and route-state preservation separately from copy/refresh-safe browser URLs. A durable public path must be declared inside the navigator that should own it; do not rely on a root route redirecting to that navigator. Hide direct tab-owned detail routes from the tab buttons, and guard against leaving a second root owner for the same public path.