---
name: GTF Track 2 Light Sweep
description: Standing spec for mechanical light-theme conversion of non-core screens; batch rules, exclusions, cadence with core briefs.
---

# Track 2 — Light Sweep (standing spec)

Full spec: `attached_assets/Pasted--GTF-Path-B-Track-2-The-Light-Sweep-Mechanical-conversi_1787031760870.txt` (if missing, ask Joe to re-attach).

**The rule:** every non-core screen gets a MECHANICAL conversion — same layout/features/logic, new skin. No redesign decisions in this track. Screens that resist mechanical conversion are SKIPPED and flagged in the packet, never improvised.

**Checklist per screen:** bg #FBF7EE; cards white + soft shadow (Home/Reader treatment), no border-as-edge; ink #1F1A12 / inkMuted #8A8A8A; Lora headings + Inter body (verify only); gold #C9933A → coral #E8604C interactive (small coral text = coralInk #C24431); legacy blue → coral (actions) or ink; remove card background photography (existing illustration only for obvious 1:1 slots, no new art); category tokens stay (teal SS, violet Plans, amber EGW, blue Signposts); ZERO gradients in this track; status colours keep semantics in light shades; contrast sanity check every screen.

**Hard exclusions:** Kids Club/Juniors; analytics/leader dashboards + conference portal (gold heritage rule); memory-verse surfaces (dark by canon); the five core screens/v2 rebuilds; welcome/onboarding flow; anything with an active bug ticket. study.tsx (Batch 2) = style-only, NO restructuring.

**Process:** batches of 8–10 (Batch 1 was scoped smaller by Joe: settings, SS day reader, plan detail/day, prayer journal, notes list, saved/bookmarks). Convert → self-test each screen opens + primary action works → screenshot every screen → ONE review packet → STOP for Joe's 30s-per-screen scan → next batch. In-place conversion, no route swaps; one commit per batch "Light sweep batch {n}: {screens}"; git revert per batch is rollback.

**Cadence:** never deliver a sweep batch review and a core-brief phase review at the same time — Joe reviews one thing at a time. Sweep batches fill gaps while the main line waits on Joe.

**Why:** protects Joe's attention and the swept-vs-bespoke boundary; design decisions never happen inside the sweep.
**How to apply:** whenever the main core-brief line is blocked on Joe, start/continue the next sweep batch instead of idling.

**Batch order:** 1) settings, sabbath-school-day, plan detail, prayer journal, notes, saved · 2) study surfaces (style-only) · 3) discovery adjacents · 4) account & community · 5+) long tail by folder.

**Status:** Batch 1 started 18 Aug 2026.
