# Grace through Faith — SDA Spiritual Formation App

## Overview
Grace through Faith is a mobile-first Seventh-day Adventist spiritual formation app designed as the definitive SDA hub for structured identity formation, Bible study, prophecy, and daily spiritual disciplines. Its core purpose is to provide an immersive study experience through a "4-Layer Study Model" powered by AI, offering offline functionality, a Kids Club, devotional plans, and prayer journaling. The project aims to foster mature discipleship within the SDA framework, providing a comprehensive and engaging platform for spiritual growth.

## User Preferences
I prefer iterative development with clear communication on significant changes. Please ask before making any major architectural decisions or large-scale code refactors. I appreciate detailed explanations for complex technical choices. Ensure the application's UI/UX prioritizes a clean, uncluttered design, inspired by modern, immersive dark themes like YouVersion's. Avoid using emojis in the app's UI. When integrating external content, such as Ellen G. White's writings, always link to the external source (egwwritings.org) rather than embedding the text directly.

## System Architecture
The application features a mobile-first architecture. The frontend uses Expo (React Native), the backend uses Express.js, and PostgreSQL with Drizzle ORM handles data persistence. TanStack Query manages server state with offline persistence, and React context manages shared UI state. AI generation functions are centralized in `server/services/ai-engine.ts`. All devotional content is presented without tradition-based filtering, specifically designed for Seventh-day Adventists.

**UI/UX Decisions:**
- **Color Scheme:** A deep dark mode (`#050507`) with a warm gold accent (`#C9933A`), distinct palettes for Kids Mode, and a specific Sabbath theme.
- **Typography:** Lora (serif) for scripture and headings, Inter (sans-serif) for UI elements.
- **Design Philosophy:** Emphasizes a borderless, immersive dark theme for readability and clear information hierarchy.
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer with advanced text highlighting and narration options.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text (KJV, ASV, WEB) with historical context, classic commentaries, and AI-generated application content, supporting three study depth levels.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation, including a Socratic AI Study Guide and Dynamic AI Reading Plans.
- **Text-to-Speech (TTS):** Employs ElevenLabs for high-quality voices, with fallback to `expo-speech` device voices for offline use.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Includes notes, highlights, bookmarks, a prayer journal, reading history, and a unified "My Library" screen.
- **Semantic Search:** AI-powered natural language Bible search, including user's notes/highlights/bookmarks.
- **Formation System:** A curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle.
- **Sabbath Experience Mode:** Time-phased Sabbath environment with four distinct phases.
- **Church Connect:** A global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`, with content translation architecture.
- **Contextual Tutorial System:** Full-screen walkthrough tutorials for major features.
- **Supporter/Mission System:** Mission-driven donation model replacing traditional paywall.
- **Small Groups 2.0:** Enhanced system for SDA small groups.
- **Live Streaming:** LiveKit Cloud-powered real-time video/audio via WebView.
- **Prophecy Explorer:** Interactive Daniel & Revelation study screen with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey screen tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** Topic detail pages feature AI-generated daily reflections and shuffled verses/media.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Feedback Widget:** Home screen card for submitting feedback.
- **Guest User Identity:** Unauthenticated requests use a shared "guest" userId on the server; per-device UUIDs for client-side cache isolation.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Belief cards with animated chevrons, scripture navigation, and authority hierarchy.
- **Great Controversy Timeline Engine:** An immersive vertical timeline tracing the cosmic conflict.
- **UI Primitive System:** Standardized reusable UI components for consistency.
- **Content Engine & Resources Library:** Two-stage content pipeline architecture:
  - **Stage 1 (Source Packets):** `lesson_source_packets` table + `server/services/source-packet-builder.ts`. Sabbath School sync ingests lessons → builds normalized source packets with quarter metadata, memory verse extraction, doctrinal theme detection, scripture ref extraction, SHA-256 content hashing for change detection. Status: ingested/normalized/failed.
  - **Stage 2 (Generation):** `server/services/content-engine.ts` generates derived resources from source packets. AI functions: `generateSabbathSchoolCompanion(lessonId, { sourcePacketId? })`, `generateTopicalStudy`, `generateFamilyWorshipPlan`. All enforce SDA doctrinal guardrails, Zod schema validation (hard gate with repair retry), structured JSON output with `_generation` metadata (promptVersion, model, tokensUsed, generatedAt).
  - **Resources table:** `sourcePacketId` links to source packet, `promptVersion` tracks generation prompt, `generationStatus` (completed/failed/regenerating), `reviewStatus` (pending/approved/rejected). Tier-based gating (free/pro), status workflow (draft/published).
  - **Pipeline flow:** sync quarterly → build source packets → check hash → generate companions → validate → store with packet linkage.
  - **Content quality (v2.1):** 400+ char overviews, SDA-distinctive insights, 4+ meditation steps, 300+ char kids versions, 6+ discussion questions, consistent EGW format.
  - **Frontend:** `app/resources.tsx` (library), `app/resource-detail.tsx` (reader with pro-gate). Featured card on Explore, colored accent strips, tier badges.
  - **Batch Generation:** `server/services/batch-generator.ts` — `generateQuarterCompanions(quarterCode, { force?, dryRun? })` generates all companions for a quarter. Builds source packets first, skips existing unless forced or content changed. Returns structured BatchResult with per-lesson details.
  - **Review Workflow:** Auto-generated companions → `status=draft`, `reviewStatus=pending`. Review actions: `approved` (publishes), `rejected` (stays draft), `needs_revision`. Only `published` resources appear in public API.
  - **Admin Pipeline API:** `server/routes/admin-pipeline.ts` (isPro-gated):
    - `GET /api/admin/pipeline/overview` — packet status counts, companion counts by generation/review status, coverage %, prompt version distribution, failed generations, pending review list.
    - `GET /api/admin/pipeline/quarter/:quarterCode` — per-lesson detail: packet status/hash, companion status/review/prompt version.
    - `POST /api/admin/pipeline/generate-quarter` — triggers batch generation (async, returns immediately).
    - `GET /api/admin/pipeline/quarters` — available quarters with lesson/companion counts.
  - **Resource Review API:** `POST /api/resources/:id/review` (requireEditor: editor+admin). Actions: approved (publishes), rejected/needs_revision (unpublishes to draft).
  - **Resource Publish API:** `POST /api/resources/:id/publish` (requireAdmin only).
  - **Role System:** `users.role` column: "user" | "editor" | "admin". Middleware: `requireRole(...roles)`, `requireEditor` (editor+admin), `requireAdmin` (admin only). All auth endpoints (register/login/me) return `role` field. `POST /api/admin/users/:id/role` for admin role management. Self-demotion prevented.
  - **Admin Review UI:** `app/admin-review.tsx` — internal content management screen accessible from Profile (admin/editor only). Three tabs:
    - Overview: source packet counts, companion status by generation/review, coverage %, prompt version distribution, failed generations list.
    - Review: pending companions with approve/revise/reject actions per item.
    - Quarter: quarter selector with per-lesson detail (packet status, companion status, review badges), batch generation trigger.
  - **CLI:** `scripts/gen-companions.ts` — batch quarter generation. Args: `--quarter 2026-01`, `--force`, `--dry-run`, `--list`.
  - **Key files:** `server/services/source-packet-builder.ts`, `server/services/batch-generator.ts`, `server/services/content-engine.ts`, `server/routes/resources.ts`, `server/routes/admin-pipeline.ts`, `server/middleware/auth.ts` (role middleware), `app/admin-review.tsx`, `shared/schema.ts`.

## External Dependencies

**Core:**
- **OpenAI API:** For AI content generation (`gpt-4o-mini`).
- **PostgreSQL:** Primary database, managed with Drizzle ORM.
- **Expo & React Native Ecosystem:** Core framework, navigation, icons, speech, audio/video, and localization.
- **AsyncStorage:** Client-side data persistence and offline caching.
- **i18next + react-i18next:** UI internationalization.
- **ElevenLabs API:** For high-quality Text-to-Speech.

**External Content Sources:**
- **egwwritings.org:** External source for Ellen G. White's writings.
- **Wikimedia Commons:** Source for historical images.
- **HelloAO Bible API:** Provides public domain commentaries.
- **Adventech/sabbath-school-lessons (GitHub):** Open-source quarterly content for Sabbath School.

**Authentication & Security:**
- **bcryptjs:** Password hashing.
- **jsonwebtoken:** JWT token generation and verification.
- **LiveKit Cloud:** Real-time video/audio conferencing.
- **react-native-webview:** Loads LiveKit room HTML on native.

**Maps & Location:**
- **react-native-maps@1.18.0:** Interactive maps on native platforms.
- **OpenStreetMap:** Embedded tile maps on the web platform.