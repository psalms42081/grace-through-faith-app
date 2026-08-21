import assert from "node:assert/strict";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const client = await pool.connect();
const suffix = `${process.pid}-${Date.now()}`;
const ids = {
  user: `test-devotional-user-${suffix}`,
  humanPlan: `test-devotional-human-${suffix}`,
  aiPlan: `test-devotional-ai-${suffix}`,
  aiDay: `test-devotional-day-${suffix}`,
  enrollment: `test-devotional-enrollment-${suffix}`,
  progress: `test-devotional-progress-${suffix}`,
  customPlan: `test-custom-plan-${suffix}`,
  customDay: `test-custom-day-${suffix}`,
  customEnrollment: `test-custom-enrollment-${suffix}`,
};

try {
  await client.query("BEGIN");

  const schemaGuards = await client.query(`
    SELECT
      EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'devotional_plan_catalog_authorship_check'
          AND conrelid = 'devotional_plan'::regclass
      ) AS has_catalog_check,
      EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'devotional_plan_provenance_audit_trigger'
          AND NOT tgisinternal
      ) AS has_provenance_audit_trigger,
      (
        SELECT delete_rule
        FROM information_schema.referential_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name = 'user_plan_enrollment_plan_id_devotional_plan_id_fk'
      ) AS enrollment_delete_rule
  `);
  assert.equal(schemaGuards.rows[0].has_catalog_check, true, "catalog authorship check must be deployed");
  assert.equal(
    schemaGuards.rows[0].has_provenance_audit_trigger,
    true,
    "provenance audit trigger must be deployed",
  );
  assert.equal(
    schemaGuards.rows[0].enrollment_delete_rule,
    "RESTRICT",
    "enrollment-plan FK must reject plan deletion",
  );

  const unauditedLegacyPlans = await client.query(`
    SELECT count(*)::int AS count
    FROM devotional_plan plan
    WHERE NOT EXISTS (
      SELECT 1
      FROM devotional_plan_provenance_audit audit
      WHERE audit.plan_id = plan.id
    )
  `);
  assert.equal(
    unauditedLegacyPlans.rows[0].count,
    0,
    "every existing devotional plan must have a provenance audit",
  );

  await client.query(
    `INSERT INTO users (id, username, password)
     VALUES ($1, $2, 'test-only')`,
    [ids.user, `test-devotional-${suffix}`],
  );

  await client.query(
    `INSERT INTO devotional_plan
      (id, title, total_days, is_published, is_ai_generated, provenance, curated_by, curated_at)
     VALUES ($1, 'Reviewed human devotional', 1, true, false, 'human_curated', 'test-editor', now())`,
    [ids.humanPlan],
  );
  await client.query(
    `INSERT INTO devotional_plan
      (id, title, total_days, is_published, is_ai_generated, provenance)
     VALUES ($1, 'Grandfathered AI devotional', 1, false, true, 'ai_generated')`,
    [ids.aiPlan],
  );

  const fixtureAudits = await client.query(
    `SELECT plan_id
       FROM devotional_plan_provenance_audit
      WHERE plan_id = ANY($1::varchar[])`,
    [[ids.humanPlan, ids.aiPlan]],
  );
  assert.deepEqual(
    new Set(fixtureAudits.rows.map((row) => row.plan_id)),
    new Set([ids.humanPlan, ids.aiPlan]),
    "new devotional records must receive provenance audits automatically",
  );

  await client.query("SAVEPOINT rejects_published_ai");
  let rejectedPublishedAi = false;
  try {
    await client.query(
      `INSERT INTO devotional_plan
        (title, total_days, is_published, is_ai_generated, provenance, curated_by, curated_at)
       VALUES ('Must be rejected', 1, true, true, 'human_curated', 'test-editor', now())`,
    );
  } catch (error) {
    rejectedPublishedAi = error.code === "23514";
    await client.query("ROLLBACK TO SAVEPOINT rejects_published_ai");
  }
  assert.equal(rejectedPublishedAi, true, "database must reject newly published AI devotionals");

  await client.query(
    `INSERT INTO devotional_day
      (id, plan_id, day_number, title, reflection_questions)
     VALUES ($1, $2, 1, 'Still readable', '[]'::jsonb)`,
    [ids.aiDay, ids.aiPlan],
  );
  await client.query(
    `INSERT INTO user_plan_enrollment (id, user_id, plan_id, is_active)
     VALUES ($1, $2, $3, true)`,
    [ids.enrollment, ids.user, ids.aiPlan],
  );

  const catalog = await client.query(
    `SELECT id
       FROM devotional_plan
      WHERE is_published = true
        AND provenance = 'human_curated'
        AND is_ai_generated = false`,
  );
  const catalogIds = new Set(catalog.rows.map((row) => row.id));
  assert.equal(catalogIds.has(ids.humanPlan), true, "reviewed human plan should be catalog eligible");
  assert.equal(catalogIds.has(ids.aiPlan), false, "AI plan must not be catalog eligible");

  const newAiStart = await client.query(
    `SELECT id
       FROM devotional_plan
      WHERE id = $1
        AND is_published = true
        AND provenance = 'human_curated'
        AND is_ai_generated = false`,
    [ids.aiPlan],
  );
  assert.equal(newAiStart.rowCount, 0, "hidden AI plan must not be eligible for a new start");

  const today = await client.query(
    `SELECT d.id
       FROM user_plan_enrollment e
       JOIN devotional_day d ON d.plan_id = e.plan_id
      WHERE e.user_id = $1
        AND e.is_active = true
        AND e.plan_id = $2
      ORDER BY d.day_number
      LIMIT 1`,
    [ids.user, ids.aiPlan],
  );
  assert.equal(today.rows[0]?.id, ids.aiDay, "hidden AI enrollment should remain resumable");

  await client.query(
    `INSERT INTO user_plan_progress (id, enrollment_id, day_id)
     VALUES ($1, $2, $3)`,
    [ids.progress, ids.enrollment, ids.aiDay],
  );
  const completed = await client.query(
    `SELECT count(*)::int AS count
       FROM user_plan_progress
      WHERE enrollment_id = $1`,
    [ids.enrollment],
  );
  assert.equal(completed.rows[0].count, 1, "hidden AI enrollment should remain completable");

  await client.query("SAVEPOINT protects_enrollment_history");
  let rejectedPlanDelete = false;
  try {
    await client.query("DELETE FROM user_plan_progress WHERE enrollment_id = $1", [ids.enrollment]);
    await client.query("DELETE FROM devotional_day WHERE plan_id = $1", [ids.aiPlan]);
    await client.query("DELETE FROM devotional_plan WHERE id = $1", [ids.aiPlan]);
  } catch (error) {
    rejectedPlanDelete = error.code === "23503";
    await client.query("ROLLBACK TO SAVEPOINT protects_enrollment_history");
  }
  assert.equal(
    rejectedPlanDelete,
    true,
    "database must reject plan deletion while enrollment history exists",
  );

  await client.query(
    `INSERT INTO reading_plan (id, title, duration_days, type)
     VALUES ($1, 'Private custom plan', 1, 'custom')`,
    [ids.customPlan],
  );
  await client.query(
    `INSERT INTO plan_day (id, plan_id, day_number, book_id, chapter)
     VALUES ($1, $2, 1, 1, 1)`,
    [ids.customDay, ids.customPlan],
  );
  await client.query(
    `INSERT INTO user_plan (id, user_id, plan_id, current_day)
     VALUES ($1, $2, $3, 1)`,
    [ids.customEnrollment, ids.user, ids.customPlan],
  );

  const browseCustom = await client.query(
    `SELECT id FROM reading_plan WHERE type <> 'custom' AND id = $1`,
    [ids.customPlan],
  );
  assert.equal(browseCustom.rowCount, 0, "custom plan must not appear in browse catalogs");

  const resumeCustom = await client.query(
    `SELECT up.id, pd.id AS day_id
       FROM user_plan up
       JOIN reading_plan rp ON rp.id = up.plan_id
       JOIN plan_day pd ON pd.plan_id = up.plan_id AND pd.day_number = up.current_day
      WHERE up.user_id = $1 AND up.plan_id = $2`,
    [ids.user, ids.customPlan],
  );
  assert.equal(
    resumeCustom.rows[0]?.day_id,
    ids.customDay,
    "existing custom enrollment should remain resumable",
  );

  console.log("Devotional authorship and grandfather-clause checks passed.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}