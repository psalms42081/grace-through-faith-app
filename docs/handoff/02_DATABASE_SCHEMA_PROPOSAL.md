# GTF Institutional Intelligence — Database Schema Proposal (Draft SQL)

**Audience:** Backend dev team, post-AWS migration
**Target:** PostgreSQL 15+ (RDS or equivalent)
**Status:** Draft. Architecture review required before migration.

---

## Design principles

1. **Reader-level data is write-once, read-aggregate.** Individual reading events are recorded in a single append-only fact table; everything readable from a dashboard is derived via aggregation views.
2. **5+ reader floor enforced at the view layer**, not the application layer. Aggregate views that produce cohort statistics filter `HAVING COUNT(DISTINCT user_id) >= 5`. Bypassing this requires direct table access (revoked from app role).
3. **Drill audit is a fact table.** Every drill action is an immutable row. Bidirectional notification is derived from this table.
4. **Institutional hierarchy is materialized.** `institution_node` self-references via `parent_id`; `level` is enum (`pastor_scope`, `conference`, `union`, `division`, `gc`).

---

## Core tables

### `institution_node`
Authoritative hierarchy. Pastor scope = a single congregation served by a pastor.

```sql
CREATE TYPE institution_level AS ENUM (
  'pastor_scope', 'conference', 'union', 'division', 'gc'
);

CREATE TABLE institution_node (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES institution_node(id),
  level           institution_level NOT NULL,
  display_name    TEXT NOT NULL,
  region_code     TEXT,                      -- e.g. "ESD", "NAD"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

CREATE INDEX idx_inst_parent ON institution_node(parent_id);
CREATE INDEX idx_inst_level ON institution_node(level);
```

### `app_user`
Anonymized at every layer above the user themselves. `display_name` is shown only on Pastor surface for own congregation, never above.

```sql
CREATE TABLE app_user (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_scope_id UUID NOT NULL REFERENCES institution_node(id),
  cohort          TEXT NOT NULL CHECK (cohort IN
    ('kids6_9','juniors10_12','teens13_18','ya19_30','adult31_64','senior65')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ
);

CREATE INDEX idx_user_pastor_scope ON app_user(pastor_scope_id);
CREATE INDEX idx_user_cohort ON app_user(cohort);
```

### `officer`
Staff with read access to one or more dashboard levels.

```sql
CREATE TYPE officer_role AS ENUM (
  'pastor', 'conference_officer', 'union_officer',
  'division_officer', 'gc_staff', 'gc_president'
);

CREATE TABLE officer (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_node_id   UUID NOT NULL REFERENCES institution_node(id),
  role            officer_role NOT NULL,
  display_name    TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_officer_scope ON officer(scope_node_id);
```

---

## Engagement fact tables

### `reading_event` (append-only)
The atomic engagement record. **Application role can INSERT only.** SELECT is restricted to aggregate views.

```sql
CREATE TABLE reading_event (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES app_user(id),
  pastor_scope_id UUID NOT NULL REFERENCES institution_node(id),  -- denormalized for partition pruning
  occurred_at     TIMESTAMPTZ NOT NULL,
  duration_sec    INT NOT NULL CHECK (duration_sec >= 0),
  topic           TEXT NOT NULL,                    -- canonicalized topic id
  scripture_ref   TEXT,                             -- e.g. "JHN-3-16"
  curriculum_ref  TEXT,                             -- e.g. "AQ-2026-Q2-W3" (Adult Quarterly Q2 Week 3)
  source          TEXT NOT NULL CHECK (source IN ('discover','quarterly','search','briefing'))
) PARTITION BY RANGE (occurred_at);

-- Monthly partitions
CREATE TABLE reading_event_y2026m04 PARTITION OF reading_event
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX idx_re_user_time ON reading_event(user_id, occurred_at);
CREATE INDEX idx_re_scope_time ON reading_event(pastor_scope_id, occurred_at);
CREATE INDEX idx_re_topic_time ON reading_event(topic, occurred_at);
```

### `verified_outcome` (pastor-logged)
Baptisms, new memberships, church plants. Only pastor-role officers can INSERT for their own scope.

```sql
CREATE TYPE outcome_kind AS ENUM (
  'baptism', 'new_membership', 'church_plant_launch', 'church_plant_pipeline'
);

CREATE TABLE verified_outcome (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_scope_id UUID NOT NULL REFERENCES institution_node(id),
  logged_by       UUID NOT NULL REFERENCES officer(id),
  kind            outcome_kind NOT NULL,
  occurred_on     DATE NOT NULL,
  cohort          TEXT,                             -- optional cohort attribution
  program_id      UUID REFERENCES program(id),      -- optional attribution
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vo_scope_date ON verified_outcome(pastor_scope_id, occurred_on);
CREATE INDEX idx_vo_kind_date ON verified_outcome(kind, occurred_on);
```

---

## Program & policy tables

### `program`
Conference / Union / Division / GC initiatives whose effectiveness is measured.

```sql
CREATE TABLE program (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_node_id   UUID NOT NULL REFERENCES institution_node(id),
  name            TEXT NOT NULL,                    -- e.g. "Stewardship Renewal Initiative"
  start_on        DATE NOT NULL,
  end_on          DATE,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE program_participation (
  program_id      UUID NOT NULL REFERENCES program(id),
  pastor_scope_id UUID NOT NULL REFERENCES institution_node(id),
  enrolled_on     DATE NOT NULL,
  PRIMARY KEY (program_id, pastor_scope_id)
);
```

### `quarterly_curriculum`
Sabbath School quarterly metadata for alignment scoring.

```sql
CREATE TABLE quarterly_curriculum (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INT NOT NULL,
  quarter         INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  audience        TEXT NOT NULL CHECK (audience IN
    ('adult','ya','teen','junior','kids')),
  theme           TEXT NOT NULL,                    -- e.g. "Sanctuary"
  reference_set   JSONB NOT NULL,                   -- topic IDs + scripture refs that count as "aligned"
  published_on    DATE NOT NULL,
  UNIQUE (year, quarter, audience)
);
```

---

## Audit table (drill-down events)

### `drill_audit`
Immutable, append-only. Renders both for drilling officer and drilled officer.

```sql
CREATE TABLE drill_audit (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drilling_officer_id  UUID NOT NULL REFERENCES officer(id),
  source_level         institution_level NOT NULL,
  target_node_id       UUID NOT NULL REFERENCES institution_node(id),
  target_level         institution_level NOT NULL,
  why_field            TEXT,                        -- required at GC source level
  notified_at          TIMESTAMPTZ,                 -- set when target officer's audit feed sees the row
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_hop CHECK (
    (source_level = 'gc'         AND target_level = 'division') OR
    (source_level = 'division'   AND target_level = 'union') OR
    (source_level = 'union'      AND target_level = 'conference') OR
    (source_level = 'conference' AND target_level = 'pastor_scope')
    -- Pastor-level drill into topic detail does not produce an audit row.
  ),
  CONSTRAINT gc_requires_why CHECK (
    source_level <> 'gc' OR (why_field IS NOT NULL AND length(trim(why_field)) > 0)
  )
);

CREATE INDEX idx_da_target ON drill_audit(target_node_id, created_at DESC);
CREATE INDEX idx_da_drilling ON drill_audit(drilling_officer_id, created_at DESC);
```

---

## Aggregate views (the dashboard data layer)

These are the ONLY surfaces the application role can SELECT from for analytics. The 5+ reader floor is enforced here.

### `v_topic_engagement_by_scope`
```sql
CREATE VIEW v_topic_engagement_by_scope AS
SELECT
  pastor_scope_id,
  topic,
  date_trunc('week', occurred_at) AS period_start,
  COUNT(DISTINCT user_id)         AS reader_count,
  SUM(duration_sec)               AS total_seconds
FROM reading_event
GROUP BY pastor_scope_id, topic, date_trunc('week', occurred_at)
HAVING COUNT(DISTINCT user_id) >= 5;
```

### `v_curriculum_alignment_by_node`
```sql
CREATE VIEW v_curriculum_alignment_by_node AS
WITH scope_alignment AS (
  SELECT
    re.pastor_scope_id,
    qc.year, qc.quarter,
    SUM(CASE WHEN re.curriculum_ref = ANY(
      SELECT jsonb_array_elements_text(qc.reference_set->'aligned_refs')
    ) THEN 1 ELSE 0 END)::FLOAT
      / NULLIF(COUNT(*), 0) AS alignment_ratio,
    COUNT(DISTINCT re.user_id) AS reader_count
  FROM reading_event re
  JOIN quarterly_curriculum qc
    ON qc.audience = 'adult'
   AND date_part('year', re.occurred_at) = qc.year
   AND date_part('quarter', re.occurred_at) = qc.quarter
  GROUP BY re.pastor_scope_id, qc.year, qc.quarter
  HAVING COUNT(DISTINCT re.user_id) >= 5
)
-- Roll up via institution_node hierarchy in application layer or recursive CTE per query.
SELECT * FROM scope_alignment;
```

### `v_verified_outcomes_rolling`
```sql
CREATE VIEW v_verified_outcomes_rolling AS
SELECT
  pastor_scope_id,
  kind,
  date_trunc('month', occurred_on) AS period_start,
  COUNT(*) AS event_count
FROM verified_outcome
GROUP BY pastor_scope_id, kind, date_trunc('month', occurred_on);
-- Note: verified outcomes are NOT subject to 5+ floor (they are aggregate by definition,
-- never identifying a member). Pastor identity IS recorded but never exposed above
-- Conference level by API contract.
```

---

## Roles and grants

```sql
CREATE ROLE app_read;
CREATE ROLE app_write;
CREATE ROLE migrations;

-- Application reads ONLY through views. Cannot SELECT raw fact tables.
GRANT SELECT ON v_topic_engagement_by_scope, v_curriculum_alignment_by_node,
                v_verified_outcomes_rolling TO app_read;
GRANT INSERT ON reading_event, drill_audit TO app_write;
GRANT INSERT ON verified_outcome TO app_write;  -- API layer enforces "pastor-of-scope only"
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO migrations;

REVOKE SELECT ON reading_event, verified_outcome FROM app_read;
```

---

## Migration notes

- Existing `reading_event` data (if any) imports as `source = 'discover'` by default; backfill from session metadata where available.
- `verified_outcome` is a NEW capability — pastors will need an in-app capture flow (not yet specified; tied to Pastor surface roadmap).
- `drill_audit` is NEW — must be deployed before any dashboard above Pastor goes live; otherwise the privacy architecture is not enforceable.
- Partition `reading_event` by month from launch date forward; backfill historical partitions if importing.
