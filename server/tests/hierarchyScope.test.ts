import { db } from "../db";
import { churchHierarchy, hierarchyMembership, users } from "../../shared/schema";
import { getHierarchyScope } from "../services/hierarchyScope";
import { eq, inArray, sql } from "drizzle-orm";

const TEST_PREFIX = "test-hierarchy-";

async function cleanup() {
  await db
    .delete(hierarchyMembership)
    .where(sql`${hierarchyMembership.userId} LIKE ${TEST_PREFIX + "%"}`);
  await db
    .delete(churchHierarchy)
    .where(sql`${churchHierarchy.id} LIKE ${TEST_PREFIX + "%"}`);
}

async function seedHierarchy() {
  const nodes = [
    { id: `${TEST_PREFIX}gc`, name: "General Conference", tier: 1, path: "/gc", parentId: null },
    { id: `${TEST_PREFIX}nad`, name: "North American Division", tier: 2, path: "/gc/nad", parentId: `${TEST_PREFIX}gc` },
    { id: `${TEST_PREFIX}puc`, name: "Pacific Union Conference", tier: 3, path: "/gc/nad/puc", parentId: `${TEST_PREFIX}nad` },
    { id: `${TEST_PREFIX}cc`, name: "Central California Conference", tier: 4, path: "/gc/nad/puc/cc", parentId: `${TEST_PREFIX}puc` },
    { id: `${TEST_PREFIX}d1`, name: "Valley District", tier: 5, path: "/gc/nad/puc/cc/d1", parentId: `${TEST_PREFIX}cc` },
    { id: `${TEST_PREFIX}ch1`, name: "Fresno Central SDA", tier: 6, path: "/gc/nad/puc/cc/d1/ch1", parentId: `${TEST_PREFIX}d1` },
    { id: `${TEST_PREFIX}ch2`, name: "Clovis SDA", tier: 6, path: "/gc/nad/puc/cc/d1/ch2", parentId: `${TEST_PREFIX}d1` },
    { id: `${TEST_PREFIX}sg1`, name: "Youth Small Group", tier: 7, path: "/gc/nad/puc/cc/d1/ch1/sg1", parentId: `${TEST_PREFIX}ch1` },
    { id: `${TEST_PREFIX}sg2`, name: "Women's Bible Study", tier: 7, path: "/gc/nad/puc/cc/d1/ch1/sg2", parentId: `${TEST_PREFIX}ch1` },
    { id: `${TEST_PREFIX}eud`, name: "Euro-Africa Division", tier: 2, path: "/gc/eud", parentId: `${TEST_PREFIX}gc` },
    { id: `${TEST_PREFIX}eud-ch1`, name: "Paris SDA Church", tier: 6, path: "/gc/eud/eud-ch1", parentId: `${TEST_PREFIX}eud` },
  ];

  for (const node of nodes) {
    await db.insert(churchHierarchy).values(node);
  }

  return nodes;
}

async function runScenario1_PastorScopedToOneChurch() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("SCENARIO 1: Pastor scoped to one church");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}pastor-john`;

  await db.insert(hierarchyMembership).values({
    userId,
    hierarchyNodeId: `${TEST_PREFIX}ch1`,
    role: "pastor",
    isPrimary: true,
  });

  const scope = await getHierarchyScope(userId);

  console.log(`  User: ${userId}`);
  console.log(`  Highest role: ${scope?.highestRole}`);
  console.log(`  Highest tier: ${scope?.highestTier} (6 = Church)`);
  console.log(`  Scopes count: ${scope?.scopes.length}`);
  console.log(`  Total accessible nodes: ${scope?.allNodeIds.length}`);
  console.log(`  Accessible node IDs:`);
  scope?.allNodeIds.forEach((id) => console.log(`    - ${id}`));

  const expectedNodes = [`${TEST_PREFIX}ch1`, `${TEST_PREFIX}sg1`, `${TEST_PREFIX}sg2`];
  const allPresent = expectedNodes.every((n) => scope?.allNodeIds.includes(n));
  const noExtras = scope?.allNodeIds.every((n) => expectedNodes.includes(n));

  console.log(`\n  ✓ Has access to own church (ch1): ${scope?.allNodeIds.includes(`${TEST_PREFIX}ch1`)}`);
  console.log(`  ✓ Has access to small groups under ch1: ${scope?.allNodeIds.includes(`${TEST_PREFIX}sg1`) && scope?.allNodeIds.includes(`${TEST_PREFIX}sg2`)}`);
  console.log(`  ✓ Does NOT have access to sibling church (ch2): ${!scope?.allNodeIds.includes(`${TEST_PREFIX}ch2`)}`);
  console.log(`  ✓ Does NOT have access to conference (cc): ${!scope?.allNodeIds.includes(`${TEST_PREFIX}cc`)}`);
  console.log(`  ✓ All expected nodes present: ${allPresent}`);
  console.log(`  ✓ No unexpected nodes: ${noExtras}`);
  console.log(`  ✓ Role is 'pastor': ${scope?.highestRole === "pastor"}`);

  const pass =
    allPresent &&
    noExtras &&
    scope?.highestRole === "pastor" &&
    scope?.highestTier === 6 &&
    !scope?.allNodeIds.includes(`${TEST_PREFIX}ch2`) &&
    !scope?.allNodeIds.includes(`${TEST_PREFIX}cc`);

  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function runScenario2_ConferenceAdmin() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("SCENARIO 2: Conference admin scoped to all churches");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}admin-sarah`;

  await db.insert(hierarchyMembership).values({
    userId,
    hierarchyNodeId: `${TEST_PREFIX}cc`,
    role: "admin",
    isPrimary: true,
  });

  const scope = await getHierarchyScope(userId);

  console.log(`  User: ${userId}`);
  console.log(`  Highest role: ${scope?.highestRole}`);
  console.log(`  Highest tier: ${scope?.highestTier} (4 = Conference)`);
  console.log(`  Scopes count: ${scope?.scopes.length}`);
  console.log(`  Total accessible nodes: ${scope?.allNodeIds.length}`);
  console.log(`  Accessible node IDs:`);
  scope?.allNodeIds.forEach((id) => console.log(`    - ${id}`));

  const mustHave = [
    `${TEST_PREFIX}cc`,
    `${TEST_PREFIX}d1`,
    `${TEST_PREFIX}ch1`,
    `${TEST_PREFIX}ch2`,
    `${TEST_PREFIX}sg1`,
    `${TEST_PREFIX}sg2`,
  ];
  const mustNotHave = [`${TEST_PREFIX}gc`, `${TEST_PREFIX}nad`, `${TEST_PREFIX}puc`, `${TEST_PREFIX}eud`];

  const allPresent = mustHave.every((n) => scope?.allNodeIds.includes(n));
  const noneExtra = mustNotHave.every((n) => !scope?.allNodeIds.includes(n));

  console.log(`\n  ✓ Has access to conference + all descendants (${mustHave.length}): ${allPresent}`);
  console.log(`  ✓ Does NOT have access to parent nodes: ${noneExtra}`);
  console.log(`  ✓ Does NOT have access to other divisions: ${!scope?.allNodeIds.includes(`${TEST_PREFIX}eud`)}`);
  console.log(`  ✓ Role is 'admin': ${scope?.highestRole === "admin"}`);
  console.log(`  ✓ Tier is 4 (Conference): ${scope?.highestTier === 4}`);

  const pass =
    allPresent &&
    noneExtra &&
    scope?.highestRole === "admin" &&
    scope?.highestTier === 4;

  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function runScenario3_GCAdminGlobalScope() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("SCENARIO 3: GC admin with global scope");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}gc-admin-ted`;

  await db.insert(hierarchyMembership).values({
    userId,
    hierarchyNodeId: `${TEST_PREFIX}gc`,
    role: "gc_admin",
    isPrimary: true,
  });

  const scope = await getHierarchyScope(userId);

  console.log(`  User: ${userId}`);
  console.log(`  Highest role: ${scope?.highestRole}`);
  console.log(`  Highest tier: ${scope?.highestTier} (1 = General Conference)`);
  console.log(`  Scopes count: ${scope?.scopes.length}`);
  console.log(`  Total accessible nodes: ${scope?.allNodeIds.length}`);

  const allTestNodes = [
    `${TEST_PREFIX}gc`,
    `${TEST_PREFIX}nad`,
    `${TEST_PREFIX}puc`,
    `${TEST_PREFIX}cc`,
    `${TEST_PREFIX}d1`,
    `${TEST_PREFIX}ch1`,
    `${TEST_PREFIX}ch2`,
    `${TEST_PREFIX}sg1`,
    `${TEST_PREFIX}sg2`,
    `${TEST_PREFIX}eud`,
    `${TEST_PREFIX}eud-ch1`,
  ];

  const allPresent = allTestNodes.every((n) => scope?.allNodeIds.includes(n));

  console.log(`\n  ✓ Has access to ALL ${allTestNodes.length} nodes in tree: ${allPresent}`);
  console.log(`  ✓ Includes cross-division (EUD + Paris church): ${scope?.allNodeIds.includes(`${TEST_PREFIX}eud`) && scope?.allNodeIds.includes(`${TEST_PREFIX}eud-ch1`)}`);
  console.log(`  ✓ Role is 'gc_admin': ${scope?.highestRole === "gc_admin"}`);
  console.log(`  ✓ Tier is 1 (GC): ${scope?.highestTier === 1}`);
  console.log(`  ✓ Total nodes = ${scope?.allNodeIds.length} (expected 11): ${scope?.allNodeIds.length === 11}`);

  const pass =
    allPresent &&
    scope?.highestRole === "gc_admin" &&
    scope?.highestTier === 1 &&
    scope?.allNodeIds.length === 11;

  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function runScenario4_MultiMembershipUnion() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("SCENARIO 4 (BONUS): Multi-membership union scope");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}multi-elder`;

  await db.insert(hierarchyMembership).values([
    {
      userId,
      hierarchyNodeId: `${TEST_PREFIX}ch1`,
      role: "elder",
      isPrimary: true,
    },
    {
      userId,
      hierarchyNodeId: `${TEST_PREFIX}eud-ch1`,
      role: "pastor",
      isPrimary: false,
    },
  ]);

  const scope = await getHierarchyScope(userId);

  console.log(`  User: ${userId}`);
  console.log(`  Highest role: ${scope?.highestRole}`);
  console.log(`  Highest tier: ${scope?.highestTier}`);
  console.log(`  Scopes count: ${scope?.scopes.length}`);
  console.log(`  Total accessible nodes: ${scope?.allNodeIds.length}`);
  console.log(`  Accessible node IDs:`);
  scope?.allNodeIds.forEach((id) => console.log(`    - ${id}`));

  const mustHave = [
    `${TEST_PREFIX}ch1`,
    `${TEST_PREFIX}sg1`,
    `${TEST_PREFIX}sg2`,
    `${TEST_PREFIX}eud-ch1`,
  ];
  const mustNotHave = [`${TEST_PREFIX}gc`, `${TEST_PREFIX}ch2`, `${TEST_PREFIX}cc`];

  const allPresent = mustHave.every((n) => scope?.allNodeIds.includes(n));
  const noneExtra = mustNotHave.every((n) => !scope?.allNodeIds.includes(n));

  console.log(`\n  ✓ Has access to ch1 descendants: ${scope?.allNodeIds.includes(`${TEST_PREFIX}ch1`) && scope?.allNodeIds.includes(`${TEST_PREFIX}sg1`)}`);
  console.log(`  ✓ Has access to eud-ch1 (cross-division): ${scope?.allNodeIds.includes(`${TEST_PREFIX}eud-ch1`)}`);
  console.log(`  ✓ Scopes are unioned (2 memberships): ${scope?.scopes.length === 2}`);
  console.log(`  ✓ Highest role is 'pastor' (from eud-ch1): ${scope?.highestRole === "pastor"}`);
  console.log(`  ✓ Does NOT have access to sibling ch2: ${!scope?.allNodeIds.includes(`${TEST_PREFIX}ch2`)}`);

  const pass =
    allPresent &&
    noneExtra &&
    scope?.scopes.length === 2 &&
    scope?.highestRole === "pastor";

  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function runScenario5_NoMembership403() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("SCENARIO 5 (BONUS): User with no membership → null");
  console.log("══════════════════════════════════════════════════");

  const userId = `${TEST_PREFIX}nobody`;
  const scope = await getHierarchyScope(userId);

  console.log(`  User: ${userId}`);
  console.log(`  Scope returned: ${scope}`);
  console.log(`  ✓ Returns null (would trigger 403): ${scope === null}`);

  const pass = scope === null;
  console.log(`\n  RESULT: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  return pass;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  STAGE 2 — HIERARCHY ACCESS CONTROL TESTS       ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  Testing getHierarchyScope service function      ║");
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    await cleanup();
    await seedHierarchy();

    const results = [
      await runScenario1_PastorScopedToOneChurch(),
      await runScenario2_ConferenceAdmin(),
      await runScenario3_GCAdminGlobalScope(),
      await runScenario4_MultiMembershipUnion(),
      await runScenario5_NoMembership403(),
    ];

    console.log("\n══════════════════════════════════════════════════");
    console.log("SUMMARY");
    console.log("══════════════════════════════════════════════════");
    const labels = [
      "Scenario 1 — Pastor (one church)",
      "Scenario 2 — Conference admin (all descendants)",
      "Scenario 3 — GC admin (global scope)",
      "Scenario 4 — Multi-membership union",
      "Scenario 5 — No membership → null/403",
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
