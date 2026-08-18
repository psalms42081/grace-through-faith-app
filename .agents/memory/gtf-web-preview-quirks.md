---
name: GTF web preview quirks
description: Why Expo web preview screenshots look blank/broken and what to trust instead
---

- A "blank white" appPreview screenshot of the Expo web build is usually the onboarding gate (fresh browser → redirect to /onboarding, quote screen) or capture timing — not a broken app. Verify with the Playwright testing subagent (it can click "Enter" past onboarding).
- **Why:** Burned time in Aug 2026 debugging a healthy Phase 1 Home because raw screenshots of "/" came back blank three times.
- All API calls from the web preview fail with CORS (page origin `*.expo.kirk.replit.dev` vs backend `*.kirk.replit.dev:5000`). Pre-existing, web-dev-only; native Expo Go is unaffected. Ignore these errors when judging web renders.
- **How to apply:** When web preview looks broken, run the e2e tester before touching code; treat CORS errors in browser logs as noise.
- Deep links never work on web: app/_layout.tsx does router.replace("/onboarding") on EVERY launch, and onboarding always exits to /(tabs). Any hidden route must have an in-app entry point (client-side nav) for both testers and Joe's on-device review.
- Web browser audio/TTS is broken in the test env for BOTH readers (expo-av "sound is not loaded", blocked cross-origin audio). Not a regression signal — verify audio on device only.

## Hidden study surfaces (Path B Phase 0)
Study, Explore, Connect, Family tabs have `href: null` in the tab layout — not in bottom nav. Study surfaces are reached ONLY via the Bible reader's "Study this chapter" menu (Word Study / Application / Deep Dive). The Guided Study hub (/study-guide) is reached via the reader sheet's "Guided Study" row (added Aug 2026 as the permanent interim entry; Discover's "Ways to Study" becomes the second entry later).

## Tester computed-style probes lie on RN-web
Pressable fills live on the wrapper node; probes on inner Text report transparent bg or wrong colors. When a probe contradicts the code, trust the code (grep the literal) before re-fixing.

## Two lookalike EllenWhite contexts (Aug 2026)
The real `useEllenWhite` lives in `contexts/PioneerContext.tsx` (PioneerProvider mounted at app root). `contexts/EllenWhiteContext.tsx` is legacy and its provider is never mounted — importing from it crashes with "useEllenWhite must be used within an EllenWhiteProvider". Also: Metro can serve stale bundles after import fixes; if a fixed error message reappears verbatim, restart Start Frontend before re-diagnosing.
