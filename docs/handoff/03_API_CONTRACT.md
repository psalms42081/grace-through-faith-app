# GTF Institutional Intelligence — API Contract

**Audience:** Backend + frontend dev teams, post-AWS migration
**Transport:** HTTPS / JSON over REST
**Auth:** Bearer JWT issued by GTF Identity Service. Token claims include `officer_id`, `role`, `scope_node_id`.
**Base URL:** `https://api.gtf.app/v1`

---

## Cross-cutting

### Authentication
All endpoints require `Authorization: Bearer <jwt>`. Tokens are scope-bound: the JWT carries the officer's role and home scope node. Server cross-checks every request against the institution hierarchy.

### Authorization model
| Role | Can read |
|---|---|
| `pastor` | Own pastor scope. |
| `conference_officer` | All pastor scopes whose `parent_id` chain reaches their conference node. |
| `union_officer` | All conferences under their union. Cannot reach pastor scopes directly via list endpoints — must drill via `conference` → `pastor_scope`. |
| `division_officer` | All unions under their division. |
| `gc_staff` / `gc_president` | All divisions. |

**One-hop drill enforcement:** server validates that any `?drill_into=` parameter targets exactly one level below the requested level. Violations return `403 ONE_HOP_VIOLATION`.

### Privacy invariants (enforced server-side)
- Aggregate endpoints return `null` for any cohort with `reader_count < 5` and include a `privacy_floor: true` marker on the row.
- Pastor identity is never returned in payloads consumed by Union/Division/GC dashboards.
- Drill into a pastor's scope from Conference returns aggregate-only — no member identity even though Pastor sees identity within their own scope.

### Standard error envelope
```json
{
  "error": {
    "code": "ONE_HOP_VIOLATION",
    "message": "Conference cannot drill into a Union node. One-hop only.",
    "request_id": "req_01HW..."
  }
}
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN_SCOPE`, `ONE_HOP_VIOLATION`, `PRIVACY_FLOOR`, `WHY_FIELD_REQUIRED`, `RATE_LIMITED`, `VALIDATION_ERROR`, `INTERNAL`.

### Cadence headers
All analytics endpoints respond with `X-GTF-Cadence: weekly|monthly|quarterly|annual` indicating refresh frequency. Clients should cache accordingly. There is no realtime streaming.

---

## Pastor surface

### `GET /pastor/scope/:scopeId/briefing`
Weekly Sermon Briefing.

Response:
```json
{
  "scope": { "id": "uuid", "display_name": "Riverside SDA Church" },
  "week_of": "2026-04-19",
  "quarterly_week": { "year": 2026, "quarter": 2, "week": 3, "theme": "Sanctuary" },
  "top_topics": [
    { "topic": "Prophecy", "reader_count": 47, "alignment_to_quarterly": 0.62 },
    { "topic": "Mental Health", "reader_count": 31, "alignment_to_quarterly": 0.18 }
  ],
  "scripture_density": [
    { "ref": "JHN-3", "reader_count": 22 }
  ]
}
```

### `GET /pastor/scope/:scopeId/inactive-cohort`
Returns count only — no member identity.
```json
{ "cohort_size": 14, "as_of": "2026-04-20", "trend_30d": "↑ 3" }
```

### `POST /pastor/scope/:scopeId/verified-outcome`
Pastor-only. Logs a verified outcome.
```json
// Request
{ "kind": "baptism", "occurred_on": "2026-04-19", "cohort": "ya19_30", "program_id": null, "notes": "Sunset service" }
// Response
{ "id": "uuid", "created_at": "2026-04-20T12:34:56Z" }
```

---

## Conference surface

### `GET /conference/:nodeId/dashboard`
Top-level Conference dashboard payload.
```json
{
  "scope": { "id": "uuid", "display_name": "Southern California Conference" },
  "period": { "kind": "monthly", "start": "2026-04-01", "end": "2026-04-30" },
  "kpis": [
    { "label": "ACTIVE PASTORS", "value": "84", "subline": "of 91 churches · 92% logging" },
    { "label": "BAPTISMS THIS MONTH", "value": "126", "subline": "verified · ↑ 8% YoY" }
  ],
  "ranked_churches": [
    { "node_id": "uuid", "display_name": "Riverside SDA",
      "trend": "↓ 27%", "meta": "184 readers · 0 baptisms 90d", "band": "red" }
  ],
  "program_effectiveness": [
    { "program_id": "uuid", "name": "Q1 Evangelistic Series",
      "lift_4mo_sustained": 0.31, "control_n": 32, "treatment_n": 18 }
  ]
}
```

### `GET /conference/:nodeId/drill/pastor-scope/:scopeId`
Conference → one Pastor (one hop). Aggregate-only.
```json
{
  "target_scope": { "id": "uuid", "display_name": "Riverside SDA" },
  "topic_breakdown": [
    { "topic": "Prophecy", "reader_count": 47, "wow_delta": -0.12 }
  ],
  "verified_outcomes_90d": { "baptisms": 0, "new_memberships": 2, "church_plants": 0 },
  "audit": {
    "drill_audit_id": "uuid",
    "notified_target_officer": true,
    "drilling_officer": { "display_name": "P. Mendoza", "role": "conference_officer" },
    "timestamp": "2026-04-20T13:01:22Z"
  }
}
```

---

## Union surface

### `GET /union/:nodeId/dashboard`
Includes Policy Implementation Tracking + Cross-Conference Trust Index hero.
```json
{
  "scope": { "id": "uuid", "display_name": "Pacific Union Conference" },
  "period": { "kind": "quarterly", "start": "2026-04-01", "end": "2026-06-30" },
  "policy_tracking": [
    { "program_id": "uuid", "name": "Stewardship Renewal Initiative",
      "participating_lift": 0.12, "non_participating_lift": 0.01,
      "n_participating": 6, "n_non_participating": 5 }
  ],
  "trust_index": { "value": 0.84, "components": {
    "pastor_log_fidelity": 0.91,
    "drill_audit_acknowledgment": 0.78,
    "cross_program_participation": 0.83
  }},
  "ranked_conferences": [ /* per-conference rows */ ]
}
```

### `GET /union/:nodeId/drill/conference/:conferenceId`
Same shape as Conference→Pastor drill but at Conference granularity.

---

## Division surface

### `GET /division/:nodeId/dashboard`
Regional Heatmap + Verified-Outcome Trajectory.
```json
{
  "scope": { "id": "uuid", "display_name": "North American Division" },
  "period": { "kind": "annual", "start": "2026-01-01", "end": "2026-12-31" },
  "regional_heatmap": {
    "image_export_url": "https://api.gtf.app/v1/exports/heatmap/uuid.png",
    "matrix": [ { "union_id": "uuid", "topics": { "prophecy": 0.34, "family": 0.22 }} ]
  },
  "outcome_trajectory_36mo": [
    { "month": "2023-05", "baptisms": 4120, "plants_launched": 12 }
  ],
  "ranked_unions": [ /* per-union rows */ ]
}
```

### `GET /division/:nodeId/drill/union/:unionId`
Union-level breakdown with audit envelope.

---

## GC surface

### `GET /gc/dashboard`
Flagship GC dashboard.
```json
{
  "period": { "kind": "annual", "start": "2026-01-01", "end": "2026-12-31" },
  "kpis": [
    { "label": "TOTAL ACTIVE MEMBERS", "value": "22.1M", "subline": "13 Divisions · 148 Unions" },
    { "label": "BAPTISMS THIS YEAR", "value": "984000", "subline": "↑ 4% YoY (denom-corrected)" },
    { "label": "CHURCH PLANTS LAUNCHED", "value": "1340", "subline": "pipeline 4180 · ↑ 6% YoY" },
    { "label": "CURRICULUM ALIGNMENT", "value": "0.61", "subline": "Q2 Sanctuary · range -0.14 to +0.09" }
  ],
  "global_topic_heatmap": {
    "matrix": [ { "division_code": "NAD", "topics": { "prophecy": 0.31 } } ],
    "image_export_url": "https://api.gtf.app/v1/exports/global-heatmap/2026.png"
  },
  "curriculum_alignment": {
    "global_mean": 0.61,
    "by_division": [ { "division_code": "IAD", "alignment_delta": 0.09 } ]
  },
  "drift_watch_5y": [
    { "year": 2021, "quarter": 1, "alignment": 0.64 }
  ],
  "ranked_divisions": [ /* color-coded rows */ ]
}
```

### `GET /gc/drill/division/:divisionId`
GC → one Division. Requires `why_field` (server returns 400 `WHY_FIELD_REQUIRED` if omitted).
Request:
```
GET /gc/drill/division/uuid?why=Q3+programmatic+resourcing+conversation
```
Response includes the same drill envelope as Division→Union, plus the Annual Council institutional-use-case framing prepared for the audit log.

---

## Audit surface (every officer)

### `GET /me/audit-feed`
Returns audit rows where `target_node_id` is within the requesting officer's scope hierarchy. This is how a Union officer learns that the Division drilled into them.
```json
{
  "rows": [
    {
      "id": "uuid",
      "drilling_officer": { "display_name": "T. Adekoya", "role": "division_officer" },
      "source_level": "division",
      "target_level": "union",
      "target_node": { "id": "uuid", "display_name": "Pacific Union Conference" },
      "why_field": "Stewardship Renewal Initiative review",
      "created_at": "2026-04-20T13:01:22Z"
    }
  ],
  "next_cursor": "opaque-string"
}
```

### `POST /audit/acknowledge/:auditId`
Officer acknowledges they have seen a drill against their scope. Feeds the Trust Index `drill_audit_acknowledgment` component.

---

## Export surface

### `GET /exports/heatmap/:divisionId.png`
### `GET /exports/global-heatmap/:year.png`
Server-rendered PNG exports of dashboard hero panels. Used in Annual Council / GC Session report decks. Auth required; export URLs include a short-lived signed token.

---

## Rate limits

| Endpoint class | Limit |
|---|---|
| Dashboard reads | 60 / minute / officer |
| Drill endpoints | 20 / minute / officer (audit cost) |
| Verified-outcome POST | 10 / minute / pastor |
| Export endpoints | 5 / minute / officer |

429 responses include `Retry-After` and error code `RATE_LIMITED`.

---

## Versioning & deprecation

- Path-versioned (`/v1`).
- Breaking changes require a new major version path.
- Deprecation notices delivered via `Deprecation` and `Sunset` response headers per RFC 8594.
