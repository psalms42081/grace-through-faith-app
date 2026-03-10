# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed as the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. It provides an immersive study experience through a "4-Layer Study Model" powered by AI, offering offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture. The frontend uses Expo (React Native), the backend uses Express.js, and PostgreSQL with Drizzle ORM handles data persistence. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`. All devotional content is presented without tradition-based filtering, specifically designed for Seventh-day Adventists.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer. Age groups: Little Lambs, Young Disciples, Teens (internally `young_disciples_plus`). All kids progress/badge/streak routes use auth-derived identity (no userId in URL paths). AI generation endpoints are rate-limited. childProfileId ownership is validated server-side before points/parent-bridge writes. Flagship interactive stories support per-scene interactions (`interactionType`, `interactionConfig`, `soundEffects` columns on `kids_story_scene`) via `SceneInteraction` component and a post-story learning loop (`StoryCompletionFlow`: memory verse tap → prayer → reward). David and the Giant is the template flagship story with 6 interaction types (tap_wiggle, tap_compare, tap_glow, tap_collect, drag_release, tap_cheer). Flagship stories use two presentation modes based on age group: **Cinematic Mode** (Little Lambs, `components/kids/CinematicScene.tsx`) and **Interactive Mode** (older groups, `components/kids/LivingScene.tsx`). Both use contain-fit layout on a warm dark page background (#0B0910) with 1536x1024 (3:2) images at full screen width. **Cinematic Mode** (Little Lambs): Art-first animated storybook — no hotspots or tap targets. Each scene has choreographed camera movement (enhanced Ken Burns with per-scene direction/speed), scene-specific animation overlays (floating particles, glows, water shimmers, auto-animated sling stone flight, celebration bursts), and reveal text. Effects are data-driven via `cinematicConfig` in interactionConfig (stored in DB), with fallback defaults in `DAVID_SCENE_DEFAULTS`. The child watches, listens to narration, and taps "next" — the art is the hero. Bottom controls are minimal: a tiny close button (left), progress dots (center), and two small icon buttons — replay narration and auto-play (right). No voice picker pill, no story title, no background bar. Older age groups keep the full bottom bar with voice picker ("George"), auto-play toggle, and read-to-me button. **Interactive Mode** (older groups): Hotspot-based interactions with SoftHotspot, sequential reveal, calibrated coordinates. **Calibration Mode**: A dev-only tool (`CALIBRATION_MODE = __DEV__ && false`) renders draggable crosshairs for pixel-precise hotspot positioning. Scene routing: when `interactionConfig.isLivingScene === true`, the story viewer renders `LivingScene` instead of the old card+SceneInteraction layout. Static illustration assets are in `public/kids/david-goliath/scene-N-*.png`. Hotspots: `SoftHotspot` component with gentle glow pulse (scale 1→1.15, 1200ms), opacity 0.25→0.7, inner dot 40% of container, no ring reticle — designed to feel like soft storybook sparkles anchored to characters/objects. Sequential reveal: `config.sequential: true` shows one hotspot at a time (next appears only after child taps current). Instruction text: 19px Inter_600SemiBold, dark pill at 15% scene height, 6-second visibility. Sound feedback: `playSound()` via `expo-audio` `createAudioPlayer` with per-sound duration cleanup (pop/chime/whoosh/thud/cheer/collect/fanfare from Pixabay CDN). Memory verse step: next-word golden glow (shadowColor #FFD700, scale 1.1, bold border), hand-icon hint, "N of M words" progress counter. Image loading gate: `imageLoaded` state defers interaction layer until illustration `onLoad` fires.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text with historical context, classic commentaries, and AI-generated application content across three study depth levels.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, including a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs for high-quality voices, with fallback to `expo-speech` device voices for offline use.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history, and a unified "Saved" screen (previously "My Library").
- **Semantic Search:** AI-powered natural language Bible search.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle.
- **Sabbath Experience Mode:** Time-phased Sabbath environment with four distinct phases.
- **Church Connect:** A global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Supporter/Mission System:** Mission-driven donation model.
- **Small Groups 2.0:** Enhanced system for SDA small groups.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Belief cards with animated chevrons, scripture navigation, and authority hierarchy.
- **Great Controversy Timeline Engine:** An immersive vertical timeline tracing the cosmic conflict.
- **Content Engine & Study Resources:** A two-stage content pipeline (Source Packets and Generation) with a review workflow for AI-generated companions. Includes version-safe regeneration, rollback capabilities, and an Admin Pipeline API for content management. Public-facing label is "Study Resources" (in Study tab). Personal saved content is "Saved" (in You tab). All resources are currently fully accessible (no supporter gating). The tier field is preserved in the schema for future use but does not restrict access.
- **Role System:** Supports "user," "editor," and "admin" roles with role-gated middleware for secure access.
- **Admin Review UI:** Internal content management screen for editors and admins. Review tab features queue presets ("Pending Review", "Needs Attention", "Regenerated Drafts", "Source Changed", "Has Notes") for one-tap filter combinations, smart filter chips (review status, regenerated toggle, has notes toggle, prompt version), sorting (Created/Updated/Title with asc/desc), priority badges (Regenerated amber, Source Changed blue), regenerated card accent, rollback button for published items with predecessors. Review history feed shows chronological timeline of all review actions (approve/reject/revision/rollback) with author attribution, status transitions, and notes. Overview tab with pipeline stats, quarter tab with batch generation.
- **Review Notes History:** `resource_review_notes` table tracks every review action with `action`, `statusFrom`/`statusTo`, `notes`, `createdBy`, `isSystem` flag. Entries created on review actions (human) and rollback/archive events (system). History endpoint at `GET /api/admin/pipeline/resource/:id/review-history` returns enriched entries with author info. PreviewModal displays chronological feed with color-coded action badges and status transitions.
- **Preset Counts/Badges:** The overview endpoint returns `presetCounts` object with counts for each queue preset (pendingReview, needsAttention, regenerated, sourceChanged, hasNotes). Counts are computed via SQL FILTER clauses for simple predicates; sourceChanged count uses batch hash comparison. Preset chips display count badges (pill-shaped, white text on matching preset color).

## External Dependencies

- **OpenAI API:** For AI content generation (`gpt-4o-mini`).
- **PostgreSQL:** Primary database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework, navigation, icons, speech, audio/video, and localization.
- **AsyncStorage:** Client-side data persistence and offline caching.
- **i18next + react-i18next:** UI internationalization.
- **ElevenLabs API:** For high-quality Text-to-Speech.
- **egwwritings.org:** External source for Ellen G. White's writings.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides public domain commentaries.
- **Adventech/sabbath-school-lessons (GitHub):** Open-source quarterly content for Sabbath School.
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.
- **LiveKit Cloud:** Real-time video/audio conferencing.
- **react-native-webview:** Loads LiveKit room HTML on native.
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.