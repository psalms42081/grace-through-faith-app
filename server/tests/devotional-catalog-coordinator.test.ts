import assert from "node:assert/strict";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../../shared/schema";
import {
  ensureDevotionalCatalog,
  DevotionalSchemaNotReadyError,
  APPROVED_DEVOTIONAL_TITLES,
} from "../devotional-catalog-coordinator";

type CoordinatorDb = Parameters<typeof ensureDevotionalCatalog>[0]["db"];

// All coordinator-invocation tests run against an ISOLATED temporary schema so
// that no plan/day/enrollment/progress/audit rows in the real development
// `public` schema are ever read or written. The isolated schema is created
// fresh, populated with only the Publish-managed data tables the four data
// seeders require, exercised, and dropped in `finally`.

const SCHEMA_NAME = `coord_test_${process.pid}_${Date.now()}`;

// Data tables the four seeders (+ coordinator) touch. Created via
// `LIKE public.<t>` so columns/defaults/CHECK constraints are copied WITHOUT
// foreign keys (LIKE never copies FKs), letting seeders insert freely while
// still exercising the real column shape + authorship CHECK constraint.
const SEEDER_TABLES_WITH_CONSTRAINTS = [
  "devotional_plan",
  "devotional_day",
  "devotional_plan_provenance_audit",
] as const;
const SEEDER_LOOKUP_TABLES = ["location", "timeline_event", "commentator"] as const;

async function setupIsolatedSchema(admin: Pool): Promise<void> {
  await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA_NAME} CASCADE`);
  await admin.query(`CREATE SCHEMA ${SCHEMA_NAME}`);
  for (const t of SEEDER_TABLES_WITH_CONSTRAINTS) {
    await admin.query(
      `CREATE TABLE ${SCHEMA_NAME}.${t} (LIKE public.${t} INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`,
    );
  }
  for (const t of SEEDER_LOOKUP_TABLES) {
    await admin.query(
      `CREATE TABLE ${SCHEMA_NAME}.${t} (LIKE public.${t} INCLUDING DEFAULTS)`,
    );
  }
}

async function dropIsolatedSchema(admin: Pool): Promise<void> {
  await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA_NAME} CASCADE`);
}

/** Build a pool + drizzle db pinned to the isolated schema via search_path. */
function makeIsolatedContext(searchPath: string): {
  pool: Pool;
  db: CoordinatorDb;
} {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
  pool.on("connect", (c) => {
    c.query(`SET search_path TO ${searchPath}`);
  });
  const db = drizzle(pool, { schema }) as unknown as CoordinatorDb;
  return { pool, db };
}

async function countApprovedPlanRows(pool: Pool): Promise<number> {
  const res = await pool.query<{ cnt: number }>(
    `SELECT count(*)::int AS cnt FROM devotional_plan
       WHERE title = ANY($1::text[])`,
    [[...APPROVED_DEVOTIONAL_TITLES]],
  );
  return res.rows[0].cnt;
}

async function main() {
  // Admin pool operates in public only for DDL of the isolated schema (schema
  // create/drop + LIKE). It performs NO writes to public app-data tables.
  const admin = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  let isolated: { pool: Pool; db: CoordinatorDb } | null = null;

  try {
    // ── 4 (first). Missing-schema actionable error ─────────────────────────
    // A schema with NO devotional tables must trigger the preflight error
    // whose message instructs the operator to run Publish to apply schema.
    // Done in a dedicated empty schema — never touches public.
    const emptySchema = `${SCHEMA_NAME}_empty`;
    await admin.query(`DROP SCHEMA IF EXISTS ${emptySchema} CASCADE`);
    await admin.query(`CREATE SCHEMA ${emptySchema}`);
    const emptyCtx = makeIsolatedContext(emptySchema);
    try {
      let threw: unknown = null;
      try {
        await ensureDevotionalCatalog({ pool: emptyCtx.pool, db: emptyCtx.db });
      } catch (err) {
        threw = err;
      }
      assert.ok(threw, "preflight must throw when schema is absent");
      assert.ok(
        threw instanceof DevotionalSchemaNotReadyError,
        "must throw DevotionalSchemaNotReadyError",
      );
      assert.match(
        (threw as Error).message,
        /run Publish to apply schema/,
        "preflight message must instruct to run Publish to apply schema",
      );
      console.log("  [missing-schema] preflight throws exact actionable message");
    } finally {
      await emptyCtx.pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${emptySchema} CASCADE`);
    }

    // Build the isolated schema with the seeder data tables (0 catalog rows).
    await setupIsolatedSchema(admin);
    isolated = makeIsolatedContext(SCHEMA_NAME);

    // Sanity: the isolated catalog starts completely empty.
    assert.equal(
      await countApprovedPlanRows(isolated.pool),
      0,
      "isolated schema must start with 0 approved plans",
    );

    // ── 1. Fresh 0 → 21 recovery ───────────────────────────────────────────
    const recovered = await ensureDevotionalCatalog({
      pool: isolated.pool,
      db: isolated.db,
    });
    assert.equal(
      recovered.status,
      "recovered",
      "coordinator must report 'recovered' from empty catalog",
    );
    assert.equal(
      recovered.approvedTitleCount,
      APPROVED_DEVOTIONAL_TITLES.length,
      `expected ${APPROVED_DEVOTIONAL_TITLES.length} approved titles after recovery`,
    );
    console.log(`  [1] fresh recovery status=${recovered.status}`);

    // ── 2. Exactly one row per approved title (no dedup masking) ────────────
    // Query grouped by title so a duplicate row for any title is detected —
    // Map-based dedup in the coordinator cannot hide it here.
    const grouped = await isolated.pool.query<{
      title: string;
      row_count: number;
      is_published: boolean;
      provenance: string;
      total_days: number;
      day_count: number;
    }>(
      `SELECT p.title,
              count(*)::int          AS row_count,
              bool_and(p.is_published) AS is_published,
              max(p.provenance)      AS provenance,
              max(p.total_days)      AS total_days,
              (SELECT count(*)::int
                 FROM devotional_day d
                 JOIN devotional_plan pp ON pp.id = d.plan_id
                WHERE pp.title = p.title) AS day_count
         FROM devotional_plan p
        WHERE p.title = ANY($1::text[])
        GROUP BY p.title`,
      [[...APPROVED_DEVOTIONAL_TITLES]],
    );

    assert.equal(
      grouped.rows.length,
      APPROVED_DEVOTIONAL_TITLES.length,
      `expected exactly ${APPROVED_DEVOTIONAL_TITLES.length} distinct approved titles`,
    );

    // Total physical plan rows across approved titles must equal 21 — proving
    // no title has a duplicate plan row.
    const totalRows = await countApprovedPlanRows(isolated.pool);
    assert.equal(
      totalRows,
      APPROVED_DEVOTIONAL_TITLES.length,
      `expected exactly ${APPROVED_DEVOTIONAL_TITLES.length} total plan rows (one per title); got ${totalRows}`,
    );

    for (const row of grouped.rows) {
      assert.equal(
        row.row_count,
        1,
        `"${row.title}" must have exactly one plan row (found ${row.row_count})`,
      );
      assert.ok(row.is_published, `"${row.title}" must be published`);
      assert.equal(
        row.provenance,
        "human_curated",
        `"${row.title}" must be human_curated`,
      );
      // ── day coverage ──
      assert.ok(
        row.day_count >= row.total_days,
        `"${row.title}" day coverage ${row.day_count}/${row.total_days} insufficient`,
      );
    }
    console.log(
      `  [2] exactly one plan row per approved title (21/21) with full day coverage`,
    );

    // ── 3. Repeat no-op ─────────────────────────────────────────────────────
    const repeat = await ensureDevotionalCatalog({
      pool: isolated.pool,
      db: isolated.db,
    });
    assert.equal(repeat.status, "already-healthy", "repeat run must be a no-op");
    assert.equal(repeat.approvedTitleCount, APPROVED_DEVOTIONAL_TITLES.length);
    // Row count unchanged — no duplicates introduced by re-running.
    assert.equal(
      await countApprovedPlanRows(isolated.pool),
      APPROVED_DEVOTIONAL_TITLES.length,
      "repeat run must not introduce duplicate plan rows",
    );
    console.log("  [3] repeat invocation is a no-op (no duplicates)");

    // ── 4. Concurrency ──────────────────────────────────────────────────────
    // Two concurrent invocations against the isolated schema; the advisory
    // lock serializes them and both must resolve healthy with no duplicates.
    const [ca, cb] = await Promise.all([
      ensureDevotionalCatalog({ pool: isolated.pool, db: isolated.db }),
      ensureDevotionalCatalog({ pool: isolated.pool, db: isolated.db }),
    ]);
    assert.equal(ca.approvedTitleCount, APPROVED_DEVOTIONAL_TITLES.length);
    assert.equal(cb.approvedTitleCount, APPROVED_DEVOTIONAL_TITLES.length);
    assert.equal(
      await countApprovedPlanRows(isolated.pool),
      APPROVED_DEVOTIONAL_TITLES.length,
      "concurrent runs must not introduce duplicate plan rows",
    );
    console.log("  [4] concurrent invocations are safe (no duplicates)");

    console.log("Devotional catalog coordinator test passed.");
  } finally {
    if (isolated) {
      await isolated.pool.end();
    }
    // Always drop the isolated schema, even on failure.
    try {
      await dropIsolatedSchema(admin);
    } catch {
      /* best effort */
    }
    await admin.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Devotional catalog coordinator test FAILED:", err);
    process.exit(1);
  });
