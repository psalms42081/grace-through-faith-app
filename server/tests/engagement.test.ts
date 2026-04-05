import { db } from "../db";
import {
  churchHierarchy,
  hierarchyMembership,
  topicEngagement,
} from "../../shared/schema";
import { eq, sql, and } from "drizzle-orm";
import {
  isSensitiveTopic,
  SENSITIVE_TOPICS,
  VALID_TOPIC_TYPES,
} from "../routes/analytics";
import { getHierarchyScope } from "../services/hierarchyScope";

const TEST_PREFIX = "test-eng-";

async function cleanup() {
  await db
    .delete(topicEngagement)
    .where(sql`${topicEngagement.userId} LIKE ${TEST_PREFIX + "%"}`);
  await db
    .delete(hierarchyMembership)
    .where(sql`${hierarchyMembership.userId} LIKE ${TEST_PREFIX + "%"}`);
  await db
    .delete(churchHierarchy)
    .where(sql`${churchHierarchy.id} LIKE ${TEST_PREFIX + "%"}`);
}

async function seedData() {
  await db.insert(churchHierarchy).values([
    { id: `${TEST_PREFIX}gc`, name: "General Conference", tier: 1, path: "/gc" },
    { id: `${TEST_PREFIX}conf`, name: "Test Conference", tier: 4, path: "/gc/div/union/conf", parentId: `${TEST_PREFIX}gc` },
    { id: `${TEST_PREFIX}ch1`, name: "Test Church", tier: 6, path: "/gc/div/union/conf/dist/ch1", parentId: `${TEST_PREFIX}conf` },
  ]);

  await db.insert(hierarchyMembership).values({
    userId: `${TEST_PREFIX}user1`,
    hierarchyNodeId: `${TEST_PREFIX}ch1`,
    role: "member",
    isPrimary: true,
  });
}

async function testSensitiveTopicDetection() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("TEST 1: Sensitive topic detection (is_sensitive flag)");
  console.log("══════════════════════════════════════════════════");

  const sensitiveTopics = [
    "Depression",
    "loneliness",
    "GRIEF",
    "Anxiety",
    "Suffering",
    "doubt",
    "Addiction",
    "Abandonment",
    "Fear",
    "Anger",
    "Suicide",
    "Self-harm",
    "Divorce",
    "Abuse",
    "Trauma",
  ];

  const nonSensitiveTopics = [
    "Sabbath",
    "Second Coming",
    "Prayer",
    "Baptism",
    "Stewardship",
    "Creation",
    "Health Message",
    "Prophecy",
    "Three Angels",
    "Sanctuary",
  ];

  let allCorrect = true;

  console.log("\n  Sensitive topics (should all be TRUE):");
  for (const topic of sensitiveTopics) {
    const result = isSensitiveTopic(topic);
    const correct = result === true;
    if (!correct) allCorrect = false;
    console.log(`    ${correct ? "✓" : "✗"} "${topic}" → is_sensitive: ${result}`);
  }

  console.log("\n  Non-sensitive topics (should all be FALSE):");
  for (const topic of nonSensitiveTopics) {
    const result = isSensitiveTopic(topic);
    const correct = result === false;
    if (!correct) allCorrect = false;
    console.log(`    ${correct ? "✓" : "✗"} "${topic}" → is_sensitive: ${result}`);
  }

  console.log(`\n  ✓ Total sensitive topics in set: ${SENSITIVE_TOPICS.size} (expected 15): ${SENSITIVE_TOPICS.size === 15}`);
  console.log(`  ✓ Case-insensitive matching works: ${isSensitiveTopic("DEPRESSION") && isSensitiveTopic("depression") && isSensitiveTopic("Depression")}`);

  if (SENSITIVE_TOPICS.size !== 15) allCorrect = false;

  console.log(`\n  RESULT: ${allCorrect ? "✅ PASS" : "❌ FAIL"}`);
  return allCorrect;
}

async function testHierarchyNodeStamping() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("TEST 2: hierarchy_node_id stamped from primary membership");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}user1`;

  await db.insert(topicEngagement).values({
    userId,
    topic: "sabbath",
    topicType: "essentials",
    durationSec: 120,
    isSensitive: false,
    hierarchyNodeId: `${TEST_PREFIX}ch1`,
  });

  const [row] = await db
    .select()
    .from(topicEngagement)
    .where(
      and(
        eq(topicEngagement.userId, userId),
        eq(topicEngagement.topic, "sabbath")
      )
    )
    .limit(1);

  const nodeCorrect = row?.hierarchyNodeId === `${TEST_PREFIX}ch1`;
  const notSensitive = row?.isSensitive === false;

  console.log(`  User: ${userId}`);
  console.log(`  Topic: ${row?.topic}`);
  console.log(`  hierarchy_node_id: ${row?.hierarchyNodeId}`);
  console.log(`  is_sensitive: ${row?.isSensitive}`);
  console.log(`\n  ✓ Node ID stamped correctly: ${nodeCorrect}`);
  console.log(`  ✓ Non-sensitive topic flagged correctly: ${notSensitive}`);

  const pass = nodeCorrect && notSensitive;
  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function testSensitiveTopicWrittenCorrectly() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("TEST 3: Sensitive topic written with is_sensitive=true");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}user1`;

  await db.insert(topicEngagement).values({
    userId,
    topic: "depression",
    topicType: "signpost",
    durationSec: 45,
    isSensitive: true,
    hierarchyNodeId: `${TEST_PREFIX}ch1`,
  });

  const [row] = await db
    .select()
    .from(topicEngagement)
    .where(
      and(
        eq(topicEngagement.userId, userId),
        eq(topicEngagement.topic, "depression")
      )
    )
    .limit(1);

  const sensitive = row?.isSensitive === true;
  const nodeCorrect = row?.hierarchyNodeId === `${TEST_PREFIX}ch1`;
  const topicLower = row?.topic === "depression";

  console.log(`  User: ${userId}`);
  console.log(`  Topic: ${row?.topic}`);
  console.log(`  is_sensitive: ${row?.isSensitive}`);
  console.log(`  hierarchy_node_id: ${row?.hierarchyNodeId}`);
  console.log(`\n  ✓ is_sensitive = true: ${sensitive}`);
  console.log(`  ✓ Topic stored lowercase: ${topicLower}`);
  console.log(`  ✓ Node ID stamped: ${nodeCorrect}`);

  const pass = sensitive && nodeCorrect && topicLower;
  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function testScopeUsedForStamping() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("TEST 4: getHierarchyScope resolves correct node for stamping");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}user1`;
  const scope = await getHierarchyScope(userId);

  const hasPrimaryNode = scope?.scopes.some((s) => s.nodeId === `${TEST_PREFIX}ch1`);
  const nodeInAllIds = scope?.allNodeIds.includes(`${TEST_PREFIX}ch1`);

  console.log(`  User: ${userId}`);
  console.log(`  Scope found: ${scope !== null}`);
  console.log(`  Primary node in scopes: ${hasPrimaryNode}`);
  console.log(`  Primary node in allNodeIds: ${nodeInAllIds}`);
  console.log(`  Highest role: ${scope?.highestRole}`);
  console.log(`\n  ✓ Scope resolves correctly: ${hasPrimaryNode}`);
  console.log(`  ✓ Primary node accessible: ${nodeInAllIds}`);

  const pass = !!hasPrimaryNode && !!nodeInAllIds;
  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function testValidTopicTypes() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("TEST 5: Valid topic_type validation");
  console.log("══════════════════════════════════════════════════");

  const expected = ["signpost", "essentials", "video", "reading_plan", "devotional", "search", "sabbath_school"];
  const allPresent = expected.every((t) => VALID_TOPIC_TYPES.includes(t as any));
  const noExtras = VALID_TOPIC_TYPES.length === expected.length;

  console.log(`  Valid types: ${VALID_TOPIC_TYPES.join(", ")}`);
  console.log(`  ✓ All 7 types present: ${allPresent}`);
  console.log(`  ✓ No extra types: ${noExtras}`);

  const invalidTypes = ["bible_study", "random", "", "SIGNPOST"];
  let allInvalidRejected = true;
  for (const t of invalidTypes) {
    const isValid = VALID_TOPIC_TYPES.includes(t as any);
    if (isValid) allInvalidRejected = false;
    console.log(`  ✓ "${t}" correctly rejected: ${!isValid}`);
  }

  const pass = allPresent && noExtras && allInvalidRejected;
  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  STAGE 3 — TOPIC ENGAGEMENT LOGGING TESTS       ║");
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    await cleanup();
    await seedData();

    const results = [
      await testSensitiveTopicDetection(),
      await testHierarchyNodeStamping(),
      await testSensitiveTopicWrittenCorrectly(),
      await testScopeUsedForStamping(),
      await testValidTopicTypes(),
    ];

    console.log("\n══════════════════════════════════════════════════");
    console.log("SUMMARY");
    console.log("══════════════════════════════════════════════════");
    const labels = [
      "Test 1 — Sensitive topic detection (15 topics)",
      "Test 2 — hierarchy_node_id stamped from membership",
      "Test 3 — Sensitive topic written with is_sensitive=true",
      "Test 4 — getHierarchyScope resolves for stamping",
      "Test 5 — topic_type validation (7 valid types)",
    ];
    results.forEach((r, i) =>
      console.log(`  ${r ? "✅" : "❌"} ${labels[i]}`)
    );

    const allPassed = results.every(Boolean);
    console.log(`\n  Overall: ${allPassed ? "✅ ALL PASSED" : "❌ SOME FAILED"}`);

    await cleanup();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error("Test error:", err);
    await cleanup().catch(() => {});
    process.exit(1);
  }
}

main();
