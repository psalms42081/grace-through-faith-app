import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { sql } from "drizzle-orm";
import express from "express";
import { db } from "../db";
import devotionalRoutes from "../routes/devotionals";

const suffix = `${process.pid}-${Date.now()}`;
const traditionKey = `api-test-${process.pid}`;
const ids = {
  enrolledUser: `device-devotional-enrolled-${suffix}`,
  blockedUser: `device-devotional-blocked-${suffix}`,
  humanPlan: `test-api-human-${suffix}`,
  legacyPlan: `test-api-legacy-${suffix}`,
  aiPlan: `test-api-ai-${suffix}`,
  humanDay: `test-api-human-day-${suffix}`,
  legacyDay: `test-api-legacy-day-${suffix}`,
  aiDay: `test-api-ai-day-${suffix}`,
  legacyEnrollment: `test-api-enrollment-${suffix}`,
};

async function main() {
const app = express();
app.use(express.json());
app.use(devotionalRoutes);

const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});

const { port } = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${port}`;
let exitCode = 0;

async function requestJson(
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  return { response, body };
}

try {
  await db.execute(sql`
    INSERT INTO users (id, username, password)
     VALUES
       (${ids.enrolledUser}, ${`test-api-enrolled-${suffix}`}, 'test-only'),
       (${ids.blockedUser}, ${`test-api-blocked-${suffix}`}, 'test-only')
  `);

  await db.execute(sql`
    INSERT INTO devotional_plan
       (id, title, total_days, tradition_key, is_published, is_ai_generated,
        provenance, curated_by, curated_at)
     VALUES
       (${ids.humanPlan}, 'API reviewed human devotional', 1, ${traditionKey}, true, false,
        'human_curated', 'test-editor', now()),
       (${ids.legacyPlan}, 'API unreviewed legacy devotional', 1, ${traditionKey}, false, false,
        'legacy_unclassified', null, null),
       (${ids.aiPlan}, 'API generated devotional', 1, ${traditionKey}, false, true,
        'ai_generated', null, null)
  `);

  await db.execute(sql`
    INSERT INTO devotional_day
       (id, plan_id, day_number, title, reflection_questions)
     VALUES
       (${ids.humanDay}, ${ids.humanPlan}, 1, 'Approved API day', '[]'::jsonb),
       (${ids.legacyDay}, ${ids.legacyPlan}, 1, 'Hidden legacy API day', '[]'::jsonb),
       (${ids.aiDay}, ${ids.aiPlan}, 1, 'Hidden AI API day', '[]'::jsonb)
  `);

  await db.execute(sql`
    INSERT INTO user_plan_enrollment (id, user_id, plan_id, is_active)
    VALUES (${ids.legacyEnrollment}, ${ids.enrolledUser}, ${ids.legacyPlan}, true)
  `);

  const catalog = await requestJson(
    `/api/devotionals/plans?traditionKey=${encodeURIComponent(traditionKey)}`,
  );
  assert.equal(catalog.response.status, 200);
  assert.equal(Array.isArray(catalog.body), true, "catalog response must be an array");
  assert.deepEqual(
    catalog.body.map((plan: { id: string }) => plan.id),
    [ids.humanPlan],
    "catalog must return the approved series and exclude legacy/AI plans",
  );
  assert.equal(catalog.body[0].provenance, "human_curated");
  assert.equal(catalog.body[0].isAiGenerated, false);

  const approvedDays = await requestJson(
    `/api/devotionals/plans/${ids.humanPlan}/days`,
    { headers: { "x-device-id": ids.blockedUser } },
  );
  assert.equal(approvedDays.response.status, 200);
  assert.deepEqual(
    approvedDays.body.map((day: { id: string }) => day.id),
    [ids.humanDay],
    "approved catalog plan days must be readable",
  );

  const blockedLegacyDays = await requestJson(
    `/api/devotionals/plans/${ids.legacyPlan}/days`,
    { headers: { "x-device-id": ids.blockedUser } },
  );
  assert.equal(
    blockedLegacyDays.response.status,
    404,
    "a user who never enrolled must not read a guessed hidden plan ID",
  );

  const existingLegacyDays = await requestJson(
    `/api/devotionals/plans/${ids.legacyPlan}/days`,
    { headers: { "x-device-id": ids.enrolledUser } },
  );
  assert.equal(existingLegacyDays.response.status, 200);
  assert.equal(existingLegacyDays.body[0]?.id, ids.legacyDay);

  const blockedEnrollment = await requestJson("/api/devotionals/enroll", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-id": ids.blockedUser,
    },
    body: JSON.stringify({ planId: ids.legacyPlan }),
  });
  assert.equal(
    blockedEnrollment.response.status,
    404,
    "a legacy_unclassified plan ID must not start a new enrollment",
  );

  const blockedAiEnrollment = await requestJson("/api/devotionals/enroll", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-id": ids.blockedUser,
    },
    body: JSON.stringify({ planId: ids.aiPlan }),
  });
  assert.equal(
    blockedAiEnrollment.response.status,
    404,
    "an ai_generated plan ID must not start a new enrollment",
  );

  const approvedEnrollment = await requestJson("/api/devotionals/enroll", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-id": ids.blockedUser,
    },
    body: JSON.stringify({ planId: ids.humanPlan }),
  });
  assert.equal(approvedEnrollment.response.status, 200);
  assert.equal(approvedEnrollment.body.alreadyEnrolled, false);
  assert.equal(approvedEnrollment.body.enrollment?.planId, ids.humanPlan);

  const today = await requestJson(
    `/api/devotionals/today?planId=${encodeURIComponent(ids.legacyPlan)}`,
    { headers: { "x-device-id": ids.enrolledUser } },
  );
  assert.equal(today.response.status, 200);
  assert.equal(
    today.body.today?.id,
    ids.legacyDay,
    "an enrolled user must still receive day content for a hidden plan",
  );
  assert.equal(today.body.enrollment?.planId, ids.legacyPlan);

  console.log("Devotional catalog HTTP route checks passed.");
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  try {
    await db.execute(sql`
      DELETE FROM user_plan_progress
      WHERE enrollment_id IN (
        SELECT id FROM user_plan_enrollment
        WHERE plan_id IN (${ids.humanPlan}, ${ids.legacyPlan}, ${ids.aiPlan})
          OR user_id IN (${ids.enrolledUser}, ${ids.blockedUser})
      )
    `);
    await db.execute(sql`
      DELETE FROM user_plan_enrollment
      WHERE plan_id IN (${ids.humanPlan}, ${ids.legacyPlan}, ${ids.aiPlan})
        OR user_id IN (${ids.enrolledUser}, ${ids.blockedUser})
    `);
    await db.execute(sql`
      DELETE FROM devotional_day
      WHERE plan_id IN (${ids.humanPlan}, ${ids.legacyPlan}, ${ids.aiPlan})
    `);
    await db.execute(sql`
      DELETE FROM devotional_plan_provenance_audit
      WHERE plan_id IN (${ids.humanPlan}, ${ids.legacyPlan}, ${ids.aiPlan})
    `);
    await db.execute(sql`
      DELETE FROM devotional_plan
      WHERE id IN (${ids.humanPlan}, ${ids.legacyPlan}, ${ids.aiPlan})
    `);
    await db.execute(sql`
      DELETE FROM users WHERE id IN (${ids.enrolledUser}, ${ids.blockedUser})
    `);
  } catch (cleanupError) {
    exitCode = 1;
    console.error("Devotional API test cleanup failed:", cleanupError);
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.$client.end();
  process.exitCode = exitCode;
}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});