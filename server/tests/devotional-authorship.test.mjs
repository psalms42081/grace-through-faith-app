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
  legacyPlan: `test-devotional-legacy-${suffix}`,
  aiDay: `test-devotional-day-${suffix}`,
  enrollment: `test-devotional-enrollment-${suffix}`,
  progress: `test-devotional-progress-${suffix}`,
  customPlan: `test-custom-plan-${suffix}`,
  customDay: `test-custom-day-${suffix}`,
  customEnrollment: `test-custom-enrollment-${suffix}`,
};

try {
  await client.query("BEGIN");

  // ─── Schema guards ────────────────────────────────────────────────────────

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

  // ─── Every existing plan must already be audited ─────────────────────────

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

  // ─── Approved catalog: all promoted series visible, none suppressed ───────

  // The 21 editorially approved series must all appear in the catalog query.
  const approvedTitles = [
    "Foundations of Faith",
    "The Life of Christ",
    "Psalms of Comfort",
    "Women of the Bible",
    "Prophets and Prophecy",
    "Parables of Jesus",
    "Walking Through the Wilderness",
    "The Armor of God",
    "The Sabbath Rest",
    "Daniel's Prophecies \u2014 End-Time Visions",
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

  const catalogRows = await client.query(`
    SELECT title
    FROM devotional_plan
    WHERE is_published = true
      AND provenance = 'human_curated'
      AND is_ai_generated = false
  `);
  const catalogTitles = new Set(catalogRows.rows.map((r) => r.title));
  for (const title of approvedTitles) {
    assert.equal(
      catalogTitles.has(title),
      true,
      `approved series must be catalog-eligible: "${title}"`,
    );
  }

  // No ai_generated or legacy_unclassified plan may appear in the catalog.
  const leakedPlans = await client.query(`
    SELECT title, provenance
    FROM devotional_plan
    WHERE is_published = true
      AND (provenance != 'human_curated' OR is_ai_generated = true)
  `);
  assert.equal(
    leakedPlans.rowCount,
    0,
    `catalog must contain only human_curated, non-AI plans — found: ${leakedPlans.rows.map(r=>r.title).join(", ")}`,
  );

  // Every catalog-eligible plan must have at least one day.
  const emptyPlans = await client.query(`
    SELECT p.title
    FROM devotional_plan p
    WHERE p.is_published = true
      AND p.provenance = 'human_curated'
      AND p.is_ai_generated = false
      AND NOT EXISTS (SELECT 1 FROM devotional_day d WHERE d.plan_id = p.id)
  `);
  assert.equal(
    emptyPlans.rowCount,
    0,
    `every catalog plan must have at least one day — empty: ${emptyPlans.rows.map(r=>r.title).join(", ")}`,
  );

  // Every catalog-eligible plan must have non-null curator attribution.
  const unattributedPlans = await client.query(`
    SELECT title FROM devotional_plan
    WHERE is_published = true
      AND provenance = 'human_curated'
      AND (curated_by IS NULL OR curated_at IS NULL)
  `);
  assert.equal(
    unattributedPlans.rowCount,
    0,
    `every published human_curated plan must have curated_by and curated_at set — missing: ${unattributedPlans.rows.map(r=>r.title).join(", ")}`,
  );

  // Every catalog-eligible plan must have an audit trail.
  const unaditedCatalogPlans = await client.query(`
    SELECT p.title
    FROM devotional_plan p
    WHERE p.is_published = true
      AND p.provenance = 'human_curated'
      AND NOT EXISTS (
        SELECT 1 FROM devotional_plan_provenance_audit a WHERE a.plan_id = p.id
      )
  `);
  assert.equal(
    unaditedCatalogPlans.rowCount,
    0,
    "every catalog plan must have provenance audit records",
  );

  // ─── Fixture plans for behavioral tests ──────────────────────────────────

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
  await client.query(
    `INSERT INTO devotional_plan
      (id, title, total_days, is_published, is_ai_generated, provenance)
     VALUES ($1, 'Unreviewed legacy plan', 1, false, false, 'legacy_unclassified')`,
    [ids.legacyPlan],
  );

  // ─── Trigger: new records must receive audit entries ─────────────────────

  const fixtureAudits = await client.query(
    `SELECT plan_id
       FROM devotional_plan_provenance_audit
      WHERE plan_id = ANY($1::varchar[])`,
    [[ids.humanPlan, ids.aiPlan, ids.legacyPlan]],
  );
  assert.deepEqual(
    new Set(fixtureAudits.rows.map((row) => row.plan_id)),
    new Set([ids.humanPlan, ids.aiPlan, ids.legacyPlan]),
    "new devotional records must receive provenance audits automatically",
  );

  // ─── Constraint: publishing AI-generated plans must be rejected ──────────

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

  // ─── Constraint: publishing legacy_unclassified plans must be rejected ───

  await client.query("SAVEPOINT rejects_published_legacy");
  let rejectedPublishedLegacy = false;
  try {
    await client.query(
      `UPDATE devotional_plan
          SET is_published = true
        WHERE id = $1`,
      [ids.legacyPlan],
    );
  } catch (error) {
    rejectedPublishedLegacy = error.code === "23514";
    await client.query("ROLLBACK TO SAVEPOINT rejects_published_legacy");
  }
  assert.equal(
    rejectedPublishedLegacy,
    true,
    "database must reject publishing a legacy_unclassified plan",
  );

  // ─── Constraint: publishing without curator fields must be rejected ───────

  await client.query("SAVEPOINT rejects_missing_curator");
  let rejectedMissingCurator = false;
  try {
    await client.query(
      `INSERT INTO devotional_plan
        (title, total_days, is_published, is_ai_generated, provenance)
       VALUES ('Missing curator', 1, true, false, 'human_curated')`,
    );
  } catch (error) {
    rejectedMissingCurator = error.code === "23514";
    await client.query("ROLLBACK TO SAVEPOINT rejects_missing_curator");
  }
  assert.equal(
    rejectedMissingCurator,
    true,
    "database must reject published human_curated plans without curator attribution",
  );

  // ─── Catalog predicate checks ─────────────────────────────────────────────

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
  assert.equal(catalogIds.has(ids.legacyPlan), false, "legacy_unclassified plan must not be catalog eligible");

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

  // ─── Grandfather clause: enrolled hidden plans remain resumable ───────────

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

  // ─── Delete protection: enrolled plan cannot be deleted ──────────────────

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

  // ─── Custom reading plan grandfather clause ───────────────────────────────

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

  // ─── Idempotency: re-promoting already-human_curated plans is safe ────────

  // Re-run the promotion UPDATE for one already-approved plan; it should match
  // 0 rows (WHERE provenance = 'legacy_unclassified' guard prevents re-processing).
  const idempotentResult = await client.query(
    `UPDATE devotional_plan
        SET provenance = 'human_curated', curated_by = 'Test Devotionals',
            curated_at = now(), is_published = true
      WHERE title = 'Foundations of Faith'
        AND provenance = 'legacy_unclassified'`,
  );
  assert.equal(
    idempotentResult.rowCount,
    0,
    "re-running promotion on already-approved plans must be idempotent (no rows updated)",
  );

  console.log("Devotional authorship and grandfather-clause checks passed.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
