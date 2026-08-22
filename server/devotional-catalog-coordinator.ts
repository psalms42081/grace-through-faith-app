/**
 * Devotional Catalog Coordinator
 * ------------------------------------------------------------------------
 * A data-only startup coordinator that guarantees the approved 21-title
 * devotional catalog is present, correctly provenanced, and fully seeded
 * with day coverage — WITHOUT ever issuing DDL or running numbered
 * migrations.
 *
 * Responsibilities, in order:
 *   1. Schema preflight — verify the tables/columns this coordinator relies
 *      on already exist. If not, throw an actionable error instructing the
 *      operator to run Publish to apply schema. (No DDL is ever emitted.)
 *   2. Advisory lock — serialize concurrent boots so only one process
 *      performs recovery at a time; others wait and then observe a healthy
 *      catalog (no-op).
 *   3. Healthy check — if the catalog is already complete, return early.
 *   4. Data-only recovery — run the importable base/SDA/more seed sources
 *      to (re)create plans and repair any missing days.
 *   5. Provenance promotion — promote the reviewed 21 legacy titles to
 *      human_curated + published (data UPDATE only; the audit trigger fires
 *      automatically).
 *   6. Verification — confirm all 21 approved titles are catalog-eligible
 *      AND that each plan's day coverage matches its declared total_days.
 *
 * Safe under concurrency and repeat invocation: every step is idempotent.
 */

import type { Pool } from "pg";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// The 21 titles reviewed and approved by the editorial team (see
// migrations/0005_restore_approved_devotional_catalog.sql). Kept in sync with
// server/tests/devotional-catalog-health.test.mjs.
export const APPROVED_DEVOTIONAL_TITLES: readonly string[] = [
  "Foundations of Faith",
  "The Life of Christ",
  "Psalms of Comfort",
  "Women of the Bible",
  "Prophets and Prophecy",
  "Parables of Jesus",
  "Walking Through the Wilderness",
  "The Armor of God",
  "The Sabbath Rest",
  "Daniel's Prophecies — End-Time Visions",
  "God's Health Blueprint",
  "The Heavenly Sanctuary",
  "Death, Sleep, and Resurrection",
  "A Life of Prayer",
  "Wisdom for Life",
  "God's Unfailing Love",
  "Living in Hope",
  "Strength in Weakness",
  "Finding Peace",
  "Grace Upon Grace",
  "The Sermon on the Mount",
];

// Editorial metadata recorded when promoting the reviewed legacy titles.
const CURATED_BY = "Test Devotionals";
const CURATED_AT = "2026-08-21 01:30:00+00";

// Advisory lock key — unique to this coordinator. Distinct from the numbered
// migration lock so a schema migration and this data recovery never collide.
const LOCK_KEY_NAMESPACE = "grace-through-faith:devotional-catalog-coordinator:v1";

// Tables/columns the coordinator depends on. Absence means the schema has not
// been applied yet (Publish has not run).
const REQUIRED_TABLES = [
  "devotional_plan",
  "devotional_day",
  "devotional_plan_provenance_audit",
] as const;

const REQUIRED_PLAN_COLUMNS = [
  "id",
  "title",
  "total_days",
  "is_published",
  "is_ai_generated",
  "provenance",
  "curated_by",
  "curated_at",
] as const;

const REQUIRED_DAY_COLUMNS = ["id", "plan_id", "day_number"] as const;

export interface CoordinatorOptions {
  /** Raw pg pool used for the advisory lock and information_schema preflight. */
  pool: Pool;
  /** Drizzle instance used for data queries and the importable seeders. */
  db: NodePgDatabase<Record<string, unknown>>;
}

export interface CoordinatorResult {
  status: "already-healthy" | "recovered";
  approvedTitleCount: number;
}

/** Thrown by the schema preflight when required tables/columns are missing. */
export class DevotionalSchemaNotReadyError extends Error {
  constructor(missing: string[]) {
    super(
      "[devotional-catalog] Required devotional schema is not present: " +
        `${missing.join(", ")}. This coordinator never issues DDL or runs ` +
        "migrations — run Publish to apply schema, then restart the server.",
    );
    this.name = "DevotionalSchemaNotReadyError";
  }
}

/**
 * Preflight: verify every required table and column exists. Throws
 * DevotionalSchemaNotReadyError (message contains "run Publish to apply
 * schema") when anything is missing. Read-only; never emits DDL.
 */
async function assertSchemaReady(pool: Pool): Promise<void> {
  const tableResult = await pool.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES as unknown as string[]],
  );
  const presentTables = new Set(tableResult.rows.map((r) => r.table_name));
  const missing: string[] = REQUIRED_TABLES.filter(
    (t) => !presentTables.has(t),
  ).map((t) => `table ${t}`);

  // Only probe columns for tables that exist (missing tables already reported).
  const columnChecks: Array<[string, readonly string[]]> = [
    ["devotional_plan", REQUIRED_PLAN_COLUMNS],
    ["devotional_day", REQUIRED_DAY_COLUMNS],
  ];

  for (const [tableName, requiredColumns] of columnChecks) {
    if (!presentTables.has(tableName)) continue;
    const columnResult = await pool.query<{ column_name: string }>(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
          AND column_name = ANY($2::text[])`,
      [tableName, requiredColumns as unknown as string[]],
    );
    const present = new Set(columnResult.rows.map((r) => r.column_name));
    for (const column of requiredColumns) {
      if (!present.has(column)) {
        missing.push(`column ${tableName}.${column}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new DevotionalSchemaNotReadyError(missing);
  }
}

/**
 * Count how many of the approved titles are fully catalog-eligible AND have
 * complete day coverage (day count >= declared total_days). Read-only.
 */
async function countHealthyApprovedTitles(
  db: CoordinatorOptions["db"],
): Promise<{ healthy: number; details: Array<{ title: string; issue: string }> }> {
  // Aggregate PER TITLE so a title with more than one plan row is detected
  // rather than masked. `row_count` is the number of physical plan rows for
  // the title; a healthy title must have exactly one. Eligibility flags are
  // combined with bool_and (every row must satisfy them), and day_count is the
  // total days across all plan rows for the title.
  const rows = await db.execute<{
    title: string;
    row_count: number;
    all_published: boolean | null;
    none_ai: boolean | null;
    all_curated_provenance: boolean | null;
    all_curated_by: boolean | null;
    all_curated_at: boolean | null;
    max_total_days: number | null;
    day_count: number;
  }>(sql`
    SELECT
      p.title,
      count(*)::int AS row_count,
      bool_and(p.is_published IS TRUE)                    AS all_published,
      bool_and(p.is_ai_generated IS FALSE)                AS none_ai,
      bool_and(p.provenance = 'human_curated')            AS all_curated_provenance,
      bool_and(p.curated_by IS NOT NULL)                  AS all_curated_by,
      bool_and(p.curated_at IS NOT NULL)                  AS all_curated_at,
      max(p.total_days)                                   AS max_total_days,
      (SELECT count(*)::int
         FROM devotional_day d
         JOIN devotional_plan pp ON pp.id = d.plan_id
        WHERE pp.title = p.title)                         AS day_count
    FROM devotional_plan p
    WHERE p.title = ANY(${sql.param([...APPROVED_DEVOTIONAL_TITLES])}::text[])
    GROUP BY p.title
  `);

  const byTitle = new Map<string, (typeof rows.rows)[number]>();
  for (const row of rows.rows) {
    byTitle.set(row.title, row);
  }

  const details: Array<{ title: string; issue: string }> = [];
  let healthy = 0;

  for (const title of APPROVED_DEVOTIONAL_TITLES) {
    const row = byTitle.get(title);
    if (!row) {
      details.push({ title, issue: "plan missing" });
      continue;
    }
    // A healthy title must be represented by EXACTLY one plan row. Duplicates
    // indicate a seeding defect and are never treated as healthy.
    if (row.row_count !== 1) {
      details.push({
        title,
        issue: `duplicate plan rows (${row.row_count})`,
      });
      continue;
    }
    const eligible =
      row.all_published === true &&
      row.none_ai === true &&
      row.all_curated_provenance === true &&
      row.all_curated_by === true &&
      row.all_curated_at === true;
    const totalDays = row.max_total_days ?? 0;
    const dayCoverageOk = totalDays > 0 && row.day_count >= totalDays;

    if (eligible && dayCoverageOk) {
      healthy += 1;
    } else if (!eligible) {
      details.push({ title, issue: "not catalog-eligible" });
    } else {
      details.push({
        title,
        issue: `incomplete day coverage (${row.day_count}/${totalDays})`,
      });
    }
  }

  return { healthy, details };
}

/**
 * Run the importable base/SDA/more seed sources. Data-only: each seeder
 * inserts missing plans and repairs missing days idempotently. None owns the
 * shared pool or calls process.exit.
 */
async function runDataOnlyRecovery(db: CoordinatorOptions["db"]): Promise<void> {
  const { seedDevotionals } = await import("../scripts/seed-devotionals");
  const { seedSdaDevotionals } = await import("../scripts/seed-sda-devotionals");
  const { seedMoreDevotionals } = await import("../scripts/seed-more-devotionals");
  const { seedApprovedCatalog } = await import("./seed-approved-catalog");

  console.log("[devotional-catalog] Running base devotional seed source...");
  await seedDevotionals(db);
  console.log("[devotional-catalog] Running SDA devotional seed source...");
  await seedSdaDevotionals(db);
  console.log("[devotional-catalog] Running additional devotional seed source...");
  await seedMoreDevotionals(db);
  console.log("[devotional-catalog] Running approved-catalog supplement (8 plans)...");
  await seedApprovedCatalog(db);
}

/**
 * Promote the reviewed legacy titles to human_curated + published. Data
 * UPDATE only — the provenance audit trigger records history automatically.
 * The WHERE clause is scoped exactly like migration 0005 so only
 * legacy_unclassified, non-AI rows among the approved titles are touched.
 */
async function promoteProvenance(db: CoordinatorOptions["db"]): Promise<void> {
  await db.execute(sql`
    UPDATE devotional_plan
       SET provenance      = 'human_curated',
           curated_by      = ${CURATED_BY},
           curated_at      = ${CURATED_AT}::timestamptz,
           is_published    = true,
           is_ai_generated = false
     WHERE title = ANY(${sql.param([...APPROVED_DEVOTIONAL_TITLES])}::text[])
       AND provenance = 'legacy_unclassified'
       AND (is_ai_generated IS NOT TRUE)
  `);
}

/**
 * Verify the final state: all 21 approved titles catalog-eligible with full
 * day coverage. Throws an actionable error otherwise.
 */
async function verifyCatalog(db: CoordinatorOptions["db"]): Promise<void> {
  const { healthy, details } = await countHealthyApprovedTitles(db);
  if (healthy < APPROVED_DEVOTIONAL_TITLES.length) {
    const summary = details
      .map((d) => `${d.title} (${d.issue})`)
      .join("; ");
    throw new Error(
      "[devotional-catalog] Catalog verification failed after recovery: " +
        `${healthy}/${APPROVED_DEVOTIONAL_TITLES.length} approved titles healthy. ` +
        `Outstanding: ${summary}`,
    );
  }
}

/**
 * Coordinator entrypoint. Must be awaited during startup BEFORE server.listen.
 * Idempotent and safe under concurrent boots.
 */
export async function ensureDevotionalCatalog(
  options: CoordinatorOptions,
): Promise<CoordinatorResult> {
  const { pool, db } = options;

  // 1. Schema preflight (read-only; throws if Publish has not been run).
  await assertSchemaReady(pool);

  // 2. Advisory lock (session-scoped on a dedicated connection).
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      LOCK_KEY_NAMESPACE,
    ]);

    // 3. Healthy no-op check (under lock, so it reflects a settled state).
    const initial = await countHealthyApprovedTitles(db);
    if (initial.healthy === APPROVED_DEVOTIONAL_TITLES.length) {
      console.log(
        `[devotional-catalog] Catalog already healthy (${initial.healthy}/${APPROVED_DEVOTIONAL_TITLES.length} approved titles). No action needed.`,
      );
      return {
        status: "already-healthy",
        approvedTitleCount: initial.healthy,
      };
    }

    console.log(
      `[devotional-catalog] Catalog incomplete (${initial.healthy}/${APPROVED_DEVOTIONAL_TITLES.length} healthy). Running data-only recovery...`,
    );

    // 4. Data-only recovery (plans + missing days).
    await runDataOnlyRecovery(db);

    // 5. Provenance promotion (data UPDATE only; audit trigger fires).
    await promoteProvenance(db);

    // 6. Verification with exact day coverage.
    await verifyCatalog(db);

    console.log(
      `[devotional-catalog] Recovery complete. All ${APPROVED_DEVOTIONAL_TITLES.length} approved titles are catalog-eligible with full day coverage.`,
    );

    return {
      status: "recovered",
      approvedTitleCount: APPROVED_DEVOTIONAL_TITLES.length,
    };
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
        LOCK_KEY_NAMESPACE,
      ]);
    } catch {
      // Session teardown releases the advisory lock regardless.
    }
    client.release();
  }
}
