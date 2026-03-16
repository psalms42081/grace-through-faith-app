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
- **Kids Club UI:** Playful, vibrant design with custom elements, animations, larger touch targets, and a scene-based story viewer with Cinematic and Interactive modes.
- **Visual Design System:** Premium image-based cards replace icons throughout the app. Home screen, devotional cards, connect page, and study topics utilize specific image assets for a consistent aesthetic. Bible book cover art uses 66 AI-generated classical Renaissance-style paintings.

**Technical Implementations & Feature Specifications:**
- **4-Layer Study Model:** Integrates Bible text with historical context, classic commentaries, and AI-generated application content across three study depth levels.
- **AI Integration:** Utilizes OpenAI's `gpt-4o-mini` for on-demand content generation (Socratic AI Study Guide, Dynamic AI Reading Plans). Features an AI Ethics & Transparency Layer with disclosures and guidelines.
- **Text-to-Speech (TTS):** Employs ElevenLabs for high-quality voices, with fallback to `expo-speech`.
- **Offline Support:** React Query persistence via AsyncStorage ensures an offline-first experience.
- **User Features:** Notes, highlights, bookmarks, prayer journal, reading history, and a unified "Saved" screen.
- **Semantic Search:** AI-powered natural language Bible search.
- **Formation System:** Curriculum-based engine for spiritual formation with structured lessons, assessments, and progress tracking, including a Sabbath Mode UI toggle.
- **Church Connect:** Global SDA church finder.
- **Spiritual Rings:** Apple Watch-style concentric SVG rings on the home screen tracking daily spiritual disciplines.
- **Internationalization (i18n):** Comprehensive UI language system using `i18next` and `react-i18next`.
- **Contextual Tutorial System:** Full-screen walkthroughs for major features.
- **Supporter/Mission System:** Mission-driven donation model.
- **Live Fellowship:** Community feature for structured group experiences (Discussion, Prayer, Devotional, Study, Live tabs) with real-time video/audio powered by LiveKit Cloud.
- **SDA Speakers Experience:** In-app browsing of 15 curated SDA speakers/ministries with embedded YouTube playback.
- **Broadcasts:** 5 SDA broadcast networks with live streaming.
- **Kids Star Shop:** Cosmetic rewards store.
- **Kids Daily Quests:** 3 daily quests for children.
- **Feedback System:** Dedicated in-app feedback screen.
- **In-App Sermon Player:** Dedicated screen for playing sermons from YouTube.
- **Prophecy Explorer:** Interactive Daniel & Revelation study with a horizontal timeline.
- **Spiritual Growth Map:** Visual spiritual journey tracking 5 dimensions with 4 levels each.
- **Christian Radio:** Live streaming player with 15 SDA/gospel stations.
- **Dynamic Topic Content:** AI-generated daily reflections and shuffled verses/media for 14 topics including SDA-distinctive themes.
- **Insight & Voices:** Commentary screen with Adventist-first content ordering, including AI-generated Ellen G. White perspectives.
- **Sabbath School Mode:** Weekly-synced Sabbath School lesson engine powered by Adventech's open-source quarterly content.
- **28 Fundamental Beliefs UX:** Interactive belief cards with scripture navigation.
- **Great Controversy Timeline Engine:** Immersive vertical timeline.
- **Study Screen Architecture:** Structured Study tab with hero sections, learning paths, prophecy, and reference sections.
- **Bible Maps Location Detail:** Enriched location data (`constants/biblical-locations.ts`) with `BiblicalLocation` interface (ancientRegion, keyEvents, keyPeople, passages, nearbyLocations, eras, timelineEvents, relatedPeopleGroupIds) for 8 locations. Detail screen at `/location/[id]` with region badge, timeline section, key events, people, passages, people groups section, nearby links, and study actions. Ancient/modern mode toggle, era-based timeline overlay with filtering, and people groups overlay. `ERA_OPTIONS`, `OVERLAY_OPTIONS`, `BIBLICAL_PEOPLE_GROUPS`, `getLocationsByEra()`, `getPeopleGroupById()`, `getPeopleGroupsForLocation()` exported. Mode + era + overlay state preserved across navigation via route params.
- **People Groups Overlay:** `BiblicalPeopleGroup` type (id, name, regionLabel, description, keyPassages, relatedLocationIds, eras). 7 groups: Philistines, Moabites, Edomites, Cushites, Hittites, Amorites, Canaanites. Overlay control on maps screen switches list from locations to people groups. Detail screen at `/people-group/[id]` shows region, description, eras, key passages, related locations, and Read Passages / View Related Locations actions. Location detail screens show related people groups as tappable rows. Relationships: Jerusalem (Canaanites, Hittites, Philistines, Amorites), Bethlehem (Moabites), Jordan River (Moabites, Canaanites, Amorites), Damascus (Hittites). Conservative associations only.
- **Prophecy Overlay:** `BiblicalProphecyLink` type (id, title, theme, description, keyPassages, relatedLocationIds, eras). `prophecyLinkIds` field on `BiblicalLocation`. 4 prophecy links: Babylon (Kingdoms and final rebellion), Jerusalem (Covenant, judgment, restoration), Jordan River (Entry, transition, covenant), Sea of Galilee (Kingdom ministry of Jesus). Overlay control (None / People Groups / Prophecy / Journey Routes) on maps screen. When Prophecy selected, list shows prophecy links with amber theme color. Detail screen at `/prophecy-link/[id]` with theme, description, eras, key passages, related locations, and 3 action buttons (Read Passages, Open Prophecy Explorer, View Related Locations). Location detail screens show "Prophecy Connections" section. Prophecy links: Babylon→prophecy-babylon, Jerusalem→prophecy-jerusalem, Jordan River→prophecy-jordan-river, Sea of Galilee→prophecy-sea-of-galilee. Maps screen reads mode/era/overlay/journey from route params for state restoration.
- **Journey Routes Overlay:** `BiblicalJourneyRoute` + `RouteSegment` interfaces. 4 routes: Exodus Route (egypt-goshen→mount-sinai→jordan-river), Paul's First Journey (antioch→cyprus→antioch), Paul's Second Journey (antioch→philippi→thessalonica→corinth→ephesus→jerusalem), Paul's Third Journey (antioch→ephesus→corinth→philippi→jerusalem). 8 new locations added for route coverage. `JOURNEY_ROUTE_COLORS` (amber, indigo, pink, teal), `JOURNEY_FILTER_OPTIONS`, `getJourneyRouteById()`, `getJourneyRoutesForLocation()`, `getRouteCoordinates()` exported. Journey selector row with filter chips appears when overlay=journey-routes. `BibleMap.tsx` renders `<Polyline>` for each route (dashed when showing all, solid when single route highlighted). Detail screen at `/journey-route/[id]` with category badge, description, visual route stops timeline with segment labels, key passages, eras, and 3 action buttons (View on Map, Read Passages, Back to Maps). Location detail screens show "Journey Routes" section listing routes that pass through that location. State preserved across all navigation (mode + era + overlay + journey).
- **Prophecy Hub & Beliefs Hub:** Centralized entry points for prophecy and fundamental beliefs study, respectively, with filtered study paths.
- **Kingdoms & Empires Overlay:** `BiblicalKingdomOverlay` type (id, name, eraLabel, shortDescription, keyPassages, relatedLocationIds, relatedProphecyLinkIds, color, centerLatitude, centerLongitude, mapLabel, periods). `relatedKingdomIds` field on `BiblicalLocation`. 6 kingdoms: Egypt (amber, Patriarchs/Exodus), Assyria (red, Divided Kingdom), Babylon (purple, Exile), Medo-Persia (cyan, Exile/Restoration), Greece (blue, Intertestamental/Prophetic), Rome (pink, NT/Early Church). Overlay selector now 5 options (None / People Groups / Prophecy / Journey Routes / Kingdoms). When Kingdoms selected, map shows Circle + label markers at each empire's center. List below map shows kingdom cards. Detail screen at `/kingdom-overlay/[id]` with era badge, description, periods, key passages (tappable), related locations, prophetic significance, and 3 action buttons (Read Passages, View on Map, Open Prophecy Detail). Location detail screens show "Kingdoms & Empires" section. `getKingdomById()`, `getKingdomsForLocation()` exported. State preserved: mode + era + overlay + kingdom across all navigation.
- **Guided Study Passage Picker:** Inline book/chapter picker for AI tutor sessions.
- **Content Engine & Study Resources:** Two-stage content pipeline with review workflow and versioning.
- **Role System:** Supports "user," "editor," and "admin" roles with role-gated middleware and an internal content management UI.

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