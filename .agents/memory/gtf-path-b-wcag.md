---
name: Path B WCAG deviations
description: Contrast fixes that override the Path B brief's literal color values
---

- The brief's Sabbath School gradient light end (#4CAF8E) fails 4.5:1 for white text → gradients carrying white text must end no lighter than #2B8467 (`ssGradientSafe` in components/home-v2/theme.ts).
- PathB.inkMuted (#8A8A8A) is only ~3:1 on the cream surface → small meta text uses `inkMutedText` #6B6660 instead.
- **Why:** Approved mockups were built at canvas scale where contrast wasn't checked; the brief mandates WCAG AA.
- **How to apply:** Every future Path B screen (Bible reader, Plans, Discover briefs) should import these safe tokens rather than the raw brief values; keep gold strictly for the streak flame and coral for CTAs/active/progress states, avatar is flat coral (one-gradient rule).
