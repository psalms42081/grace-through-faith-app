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
