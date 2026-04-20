# GTF Institutional Intelligence — Component Specification

**Audience:** Frontend dev team, post-AWS migration
**Source of truth:** Canvas mockups at y=28,400 (Pastor) → y=38,600 (GC) plus 3 board insets at y=42,000–43,200
**Stack target:** React Native (Expo) for Pastor surface · React (web) for Conference / Union / Division / GC desktop dashboards
**Design system:** Shared Kit v1 (typography, color, spacing) — see Pastor frame for canonical tokens

---

## 1. Shared primitives (used across all five dashboards)

### `<DashboardFrame />`
Top-level layout container. Provides title bar, two-row chip rail, and surface background.

| Prop | Type | Notes |
|---|---|---|
| `level` | `'pastor' \| 'conference' \| 'union' \| 'division' \| 'gc'` | Drives default cadence label and chip set. |
| `scopeLabel` | `string` | e.g. `"Riverside SDA Church · This Week"`, `"Office of the President · This Year"`. |
| `theme` | `'light' \| 'dark'` | All dashboards ship in both. |
| `cadence` | `'weekly' \| 'monthly' \| 'quarterly' \| 'annual'` | Controls the period selector default. |
| `children` | `ReactNode` | Composition slot for hero, KPI, ranked panels. |

### `<ChipRail />`
Two-row Adventech-attributed cohort filter (preserved at every level).

| Prop | Type | Notes |
|---|---|---|
| `chips` | `Chip[]` | Row-1 + Row-2 split is layout-driven; pass full ordered list. |
| `activeId` | `string` | Single-select. Default `'all'`. |
| `onChange` | `(id: string) => void` | |

```ts
type Chip = {
  id: string;
  label: string;     // e.g. "Teens 13–18 · Real-Time Faith / Cornerstone"
  cohort: 'kids6_9' | 'juniors10_12' | 'teens13_18' | 'ya19_30' | 'adult31_64' | 'senior65' | 'all';
};
```

### `<KPICard />` (composite-label variant)
Single statistic with composite-label sub-line, used in 4-card strip on every dashboard.

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` | All-caps. e.g. `"BAPTISMS THIS YEAR"`. |
| `value` | `string` | Pre-formatted (`"984,000"`, `"22.1M"`). |
| `subline` | `string` | Composite metadata line (verified-source, YoY delta, denom-correction note). |
| `trend` | `'up' \| 'down' \| 'flat' \| 'flagged'` | Drives accent color. |

### `<RankedPanel />` (color-coded rows)
Used for Pastor rank-by-topic, Conference rank-by-church, Union rank-by-conference, Division rank-by-union, GC rank-by-division.

| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | e.g. `"DIVISIONS RANKED — composite engagement health"`. |
| `rows` | `RankedRow[]` | Renders in order received. |
| `colorRule` | `'health' \| 'change'` | `health` = green/amber/red by absolute composite; `change` = green/grey/red by YoY delta. |

```ts
type RankedRow = {
  name: string;
  trend: string;            // "↑ 12%", "↓ 21%", "→ flat"
  metaLine: string;         // "4.1M members · +9 alignment"
  band: 'green-strong' | 'green' | 'grey' | 'amber' | 'red' | 'red-flagged';
  drillCta: string;         // "Drill ↓", "Drill ↓ (FLAGGED)"
  onDrill: () => void;
};
```

### `<DrillDownPanel />`
One-hop drill-down surface. Composes (a) aggregate breakdown, (b) bidirectional audit pill, (c) institutional use-case framing.

| Prop | Type | Notes |
|---|---|---|
| `targetLevel` | `'topic' \| 'pastor' \| 'conference' \| 'union' \| 'division'` | One level below the source dashboard. Strictly enforced. |
| `targetId` | `string` | UUID of drilled entity. |
| `auditState` | `AuditState` | See below. Required at Conference, Union, Division, GC levels. |
| `useCaseText` | `string` | 3-paragraph institutional framing — what conversation this drill informs. |
| `onClose` | `() => void` | |

```ts
type AuditState = {
  drillingOfficer: { id: string; displayName: string; role: string };
  whyField: string;             // required at GC; recommended otherwise
  notifiedTargetOfficer: boolean;
  timestamp: ISO8601;
};
```

### `<RationaleColumn />`
4-paragraph annotation column, fixed at right edge of every dashboard (x=3140, w=1180 in canvas units; right-rail in production layout).

| Prop | Type | Notes |
|---|---|---|
| `paragraphs` | `RationaleParagraph[]` | Exactly 4. |
| `headerStyle` | `'gold-rule'` | Section headers flanked by gold cap + underline rules (per consistency pass). |

```ts
type RationaleParagraph = {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  heading: string;       // e.g. "Why the Global Topic Heatmap is the GC hero"
  body: string;          // markdown-light, ~150-280 words
};
```

---

## 2. Per-dashboard hero components

### Pastor — `<WeeklySermonBriefing />` + `<InactiveMemberDetection />`
- **Cadence:** weekly
- **Data:** previous-7-days congregation aggregate; cross-reference against current quarterly week
- Privacy: aggregate only, **count never names** for inactive cohort.

### Conference — `<DeclineDetectionFlag />` + `<ProgramEffectiveness />`
- Renders flagged churches (e.g. Riverside −27%) with privacy band visible.
- Program Effectiveness: control-group comparison (participating vs non-participating churches), 4-month sustained-lift window.

### Union — `<PolicyImplementationTracking />` + `<CrossConferenceTrustIndex />`
- Tracks adoption of Union-mandated initiatives with delta vs non-participating Conferences (canonical example: Stewardship Renewal Initiative +12 vs +1).
- Trust Index composes pastor-log fidelity, drill audit acknowledgment, cross-program participation.

### Division — `<RegionalHeatmap />` + `<VerifiedOutcomeTrajectory />`
- 36-month rolling, denominator-corrected line chart.
- Heatmap exportable as image-for-GC-report.

### GC — `<GlobalTopicHeatmap />` + `<CurriculumAlignmentPanel />` + `<CatecheticalDriftWatch />`
- Heatmap renders 13 Divisions × 5 topic dominance dimensions; gold border treatment indicating "exportable for Annual Council".
- Curriculum Alignment: % aligned with current quarterly + per-Division delta.
- Drift Watch: 5-year longitudinal (separate panel below KPIs).

---

## 3. State & data fetching

- **Server state:** React Query with hierarchical array keys: `['/api/analytics', level, scopeId, period]`.
- **Realtime:** none. Cadence is intentional (weekly Pastor / monthly Conference / quarterly Union / annual Division & GC).
- **Persistence:** AsyncStorage (Pastor mobile) / localStorage (web dashboards) for last-viewed scope and theme preference.
- **Auth context:** `useAuthLevel()` returns `{ level, scopeId, role }` and gates which dashboards / drill targets are accessible.

## 4. Privacy / discipline enforcement (frontend)

These are frontend invariants — backend enforces them too (see API doc), but the UI must never *attempt* a forbidden render:

1. **5+ reader floor** — any cohort with `n < 5` renders as `🔒 Topic hidden — < 5 readers · privacy floor`. Never render the underlying value.
2. **One-hop drill** — `<DrillDownPanel />` validates `targetLevel === levelBelow(sourceLevel)`. Throws if violated.
3. **Bidirectional audit** — drill cannot fire without `auditState.notifiedTargetOfficer === true` resolving from server.
4. **No pastor leaderboard** — `RankedPanel` MUST NOT be instantiated with `rows` of pastors at any level above Conference. Lint rule enforced.

## 5. Insets (auxiliary surfaces, not dashboards)

These render as standalone documentation pages, not in-app surfaces, but share the design system.

- `<PrivacyArchitectureInset />` — 4-column matrix (5+ floor, one-hop, bidirectional audit, no-leaderboard refusal).
- `<DrillAuditMatrix />` — 5-level × 3-row matrix (what it sees / what drill does / audit fires).
- `<PayForAnchorsInset />` — 5 columns, each with title + body + "Institutional Moat" callout.
