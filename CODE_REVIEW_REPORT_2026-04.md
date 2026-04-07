# Grace Through Faith — Code Review Report (April 2026)

**Date:** April 6, 2026  
**Scope:** End-to-end review (architecture, security, DB, APIs, frontend, features, performance, consistency). Compared to [CODE_REVIEW_REPORT.md](./CODE_REVIEW_REPORT.md) (March 21, 2026).

**Note:** Project `.agents/skills/brainstorming/SKILL.md` was not present in this workspace; user-global brainstorming skill path was also unavailable. Review proceeded without that skill file.

---

## Delta vs March 2026 report

| Topic | March 2026 | Current (spot-check) |
|--------|------------|------------------------|
| **`helmet`** | Missing | **Present** with CSP and related options in `server/index.ts`; in **development**, Metro proxy runs **before** API middleware, so **bundle/HTML paths skip Helmet** (commented in code). |
| **`GET /api/search/recent`** | Global leak from `searchCache` | **Fixed:** guest gets `[]`; authenticated queries use `where(eq(searchCache.userId, userId))`. |
| **FKs in schema** | “Only 1 `references()`” | **Outdated:** `shared/schema.ts` has **~70** `.references(...)` usages (Bible graph, org/members, etc.). Many **logical** `userId`/string relations may still exist without FKs—worth a dedicated audit. |
| **Route modules** | ~15 files | **38** under `server/routes/*.ts`. |
| **`kids.ts` size** | ~1,281 lines | **~1,149** lines (PowerShell line count). |
| **`study.tsx`** | 5,324 | **~5,147** (still a monolith). |
| **`kids/story/[id].tsx`** | 3,173 | **~2,966** (still very large). |
| **`family.tsx`** | 1,740 | **~1,685**. |
| **`shared/schema.ts`** | ~1,766 | **~2,288** (schema growth). |
| **App screens** | 80+ | **96** `app/**/*.tsx` files. |
| **Components** | ~30 | **73** `components/**/*.tsx`. |
| **Migrations** | No versioned SQL in `drizzle/` | Still **0** `drizzle/**/*.sql` in workspace—**push-only story unchanged** unless migrations live elsewhere. |
| **`user.ts` `:userId` routes** | Param ignored vs `getEffectiveUserId` | **Still true** (misleading URLs; IDOR risk if someone later trusts the param). |

---

## 1. Architecture

### Critical

- **Monolithic screens still dominate maintainability and release risk** — `study.tsx` (~5.1k) and `kids/story/[id].tsx` (~3.0k) bundle navigation, data, and UI in one file. **Effort: XL** (incremental extraction into feature folders).

### High

- **Single mega-schema file** (`shared/schema.ts` ~2.3k lines) — harder to review PRs and reason about domains. **Effort: L** (split by domain, re-export barrel).
- **No checked-in migration history** — production rollbacks and audit trail remain weak. **Effort: L** (introduce `drizzle-kit migrate` workflow + CI check).

### Nice-to-have

- **38 route files** is good modularity; a **route index / domain map** in docs would help onboarding. **Effort: S**.

---

## 2. Security

### Critical

- *(None confirmed from static review beyond standard JWT/mobile-app threat model.)*

### High

- **CORS + mobile:** Requests **without** `Origin` are treated as **mobile** and allowed through the whitelist branch—appropriate for RN, but **any non-browser client** can hit the API the same way; defense relies on **auth, rate limits, and payload validation**. **Effort: M** (document threat model; optional mTLS / app attestation if you ever need stronger guarantees).
- **Helmet in dev:** Bundle served via Metro proxy **does not** get Helmet/CSP—acceptable for local dev; ensure **production** always hits the path with `helmet()`. **Effort: S** (verify staging/prod deploy path).

### Nice-to-have

- **Misleading `:userId` in URLs** (`/api/notes/:userId`, etc.) — still uses `getEffectiveUserId(req)` only; rename to `/api/notes` or validate param matches token. **Effort: M** (API versioning / client updates).
- **CSRF:** JWT in `Authorization` keeps risk low; **credentials: true** is still worth noting if cookies are added later. **Effort: S** (document).
- **Org name length / generic string limits** — March note still relevant unless tightened everywhere. **Effort: S–M** (shared Zod middleware).

### Resolved vs March

- **Helmet** added.
- **`/api/search/recent`** user-scoped.

---

## 3. Database & data layer

### Critical

- *(None new; integrity is **better** than March due to many FKs on core Bible/org tables.)*

### High

- **Partial FK coverage:** ~70 references does **not** mean every cross-table ID is enforced; guest/device IDs, legacy varchar keys, and JSONB blobs may still allow orphans. **Effort: L** (inventory + incremental FKs / cleanup jobs).
- **Still no versioned migrations** in repo. **Effort: L**.

### Nice-to-have

- **Index review** for hot paths (reading history, notes/highlights/bookmarks by user, lists without pagination)—March concerns still apply until proven by `EXPLAIN` under load. **Effort: M**.
- **JSONB-heavy tables** — flexibility vs queryability tradeoff unchanged. **Effort: M** (partial normalization where queried).

---

## 4. Backend API quality

### High

- **Validation inconsistency** — mix of Zod and hand-rolled checks across **more** route files than in March. **Effort: L** (standardize on `validate(schema)` per route).
- **Error responses** — some routes return `err.message` (or similar) to clients on 500s, which can leak implementation details. **Effort: M** for a full sweep; **S** for a targeted pass on admin/AI/pipeline routes (see Appendix A).

### Nice-to-have

- **`/api/auth/me` style** — manual `getAuthUserId` vs `requireAuth` consistency. **Effort: S**.

---

## 5. Frontend quality

### High

- **Monoliths:** `study.tsx`, `kids/story/[id].tsx`, plus other large screens (`resource-detail`, `prophecy-explorer`, `index`, etc.) — same theme as March. **Effort: XL** (study/story first).
- **`any` usage:** ~**207** matches in `app/`, ~**150** in `server/` (PowerShell `Select-String` on `: any` — broader than March’s ~160 total, likely different counting). **Heaviest:** `admin-review.tsx`, `leader-analytics.tsx`, `resource-detail.tsx`, `kids/story/[id].tsx`, `videoTopics.ts`, `ai-engine.ts`. **Effort: L** (prioritize API boundaries and admin tools).

### Nice-to-have

- **Audio cleanup** (March): `useBibleAudio`, kids scene timeouts — worth verifying with a focused QA pass. **Effort: M**.
- **console.log** in app (especially kids story) — scrub for production. **Effort: S**.

---

## 6. Feature completeness (unchanged themes)

March’s matrix still largely holds. **Still partial / verify:**

- **LiveKit / streaming** — backend present; native SDK usage may still be thin vs WebView.
- **i18n** — infrastructure vs actual `useTranslation` coverage on screens.
- **Push** — registration without full server-triggered campaign logic.

**Effort:** **M–L** per area if you want “complete” product polish.

---

## 7. Performance & scalability

### High

- **In-memory caches** (TTS LRU, etc.) — **not shared across horizontal replicas** (March). **Effort: L** (Redis or sticky sessions).
- **Large screens** — memory and JS thread pressure on low-end devices. **Effort: tied to monolith split XL**.

### Nice-to-have

- **Pagination** on large member/resource/prayer lists. **Effort: M**.
- **AI semaphore** per process only — same as March for multi-instance. **Effort: L** with Redis quota.

---

## 8. Consistency & standards

### Nice-to-have

- Align on **Zod everywhere**, **single error shape**, and **OpenAPI or typed client** generated from server. **Effort: L**.
- **Component count** grew (~73); consider **feature colocation** (`features/study/...`) to avoid a flat `components/` dump. **Effort: L** (gradual).

---

## 9. Third-party integrations

March assessment remains directionally accurate: **OpenAI / ElevenLabs** are central and reasonably guarded; **LiveKit** frontend depth is the main question; **Bible** remains DB-backed.

---

## 10. Prioritized recommendations (next 90 days)

1. **XL:** Split `study.tsx` and `kids/story/[id].tsx` into routable sub-screens or feature modules with shared hooks.
2. **L:** Adopt **versioned DB migrations** and stop relying on `db:push` alone for production.
3. **L:** Standardize **request validation** (Zod) and **error responses** across new and high-risk routes (admin, org, kids purchases).
4. **M:** **API path cleanup** for notes/highlights/bookmarks (remove fake `:userId` or enforce equality with auth).
5. **M:** **FK/index audit** with production-sized data or staging load tests.
6. **L (when scaling):** **Redis** (cache, rate limits, AI concurrency) for multi-instance.

---

## Appendix A — Quick wins: Critical/High severity with effort **S** (< 1 day)

This appendix lists only findings rated **Critical** or **High** in Sections 1–7 **where a meaningful mitigation fits in effort S**. Several **High** themes (monoliths, migrations, Redis, full validation pass) are **L+** by nature; they are **not** listed here.

**Helmet verification + API trust model (Appendix A.1 rows 1–2):** see [docs/SECURITY_HELMET_AND_API_TRUST.md](docs/SECURITY_HELMET_AND_API_TRUST.md).

### A.1 Strict matches (High + S as written in Sections 2–4)

| Priority | Item | Action | Est. |
|:--|:--|:--|:--|
| 1 | **Security — Helmet on real deploys** (§2 High) | Confirm **staging and production** traffic always hits Express **after** `helmet()` for `/api` (and any HTML you serve). Dev Metro proxy skipping Helmet is expected; prod must not. Use `curl -I` on `https://<prod>/api/...` and a non-API path if applicable; confirm `X-Content-Type-Options`, `X-Frame-Options` / CSP headers as expected. | 1–2 h |
| 2 | **Security — Origin-less API trust model** (§2 High) | Add a short **internal doc** (or README section): RN does not send `Origin`; API trusts **JWT + device id + rate limits** for those callers; browsers are origin-restricted. Prevents “surprise” during security review and debugging. | 1–2 h |
| 3 | **Backend API — Error leakage on 500s** (§4 High, scoped) | Replace **client-visible** `err.message` / `err?.message` in JSON 500 responses with a **generic** message; **log** full error server-side. Known occurrences (grep, April 2026): `server/routes/pioneers.ts`, `server/routes/devotionals.ts` (reading-plan path), `server/routes/videoPipeline.ts`, `server/routes/videoTopics.ts` (several handlers), `server/routes/admin-pipeline.ts`. In-memory pipeline job objects that store `String(err)` should not be returned verbatim to untrusted clients—sanitize if exposed via API. | 2–4 h |

### A.2 Critical + S

**None.** All **Critical** items in this review (e.g. monolithic `study.tsx` / story screen) are **XL** effort; there is no honest “Critical fix in under a day” without redefining scope.

### A.3 Suggested order before an end-to-end debugging session

1. **Sanitize 500 error bodies** (Appendix A.1 row 3) — reduces noise, avoids leaking stack paths/messages to clients, stabilizes support/debug narratives.  
2. **Helmet verification on prod/staging** (Appendix A.1 row 1) — confirms defense-in-depth matches assumptions.  
3. **Trust model doc** (Appendix A.1 row 2) — aligns the team during deep debugging (who the API trusts and why).

---

*End of report.*
