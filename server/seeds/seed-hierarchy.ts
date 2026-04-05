import { db } from "../db";
import { churchHierarchy, hierarchyMembership, users } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

const GC_ID = "gc-test-001";
const DIV_ID = "div-test-001";
const UNION_ID = "union-test-001";
const CONF_ID = "conf-test-001";
const ZONE_ID = "zone-test-001";
const CHURCH_A_ID = "church-test-001";
const CHURCH_B_ID = "church-test-002";

const DIV2_ID = "div-test-002";
const UNION2_ID = "union-test-002";
const CONF2_ID = "conf-test-002";
const CHURCH_C_ID = "church-test-003";

const HIERARCHY_NODES = [
  {
    id: GC_ID,
    name: "General Conference (Test)",
    tier: 1,
    parentId: null,
    path: "/gc-test-001",
    timezone: "America/New_York",
    latitude: 39.0437,
    longitude: -77.1109,
  },
  {
    id: DIV_ID,
    name: "North American Division (Test)",
    tier: 2,
    parentId: GC_ID,
    path: "/gc-test-001/div-test-001",
    timezone: "America/New_York",
    latitude: 39.0437,
    longitude: -77.1109,
  },
  {
    id: UNION_ID,
    name: "Columbia Union Conference (Test)",
    tier: 3,
    parentId: DIV_ID,
    path: "/gc-test-001/div-test-001/union-test-001",
    timezone: "America/New_York",
    latitude: 39.0437,
    longitude: -77.1109,
  },
  {
    id: CONF_ID,
    name: "Potomac Conference (Test)",
    tier: 4,
    parentId: UNION_ID,
    path: "/gc-test-001/div-test-001/union-test-001/conf-test-001",
    timezone: "America/New_York",
    latitude: 38.8951,
    longitude: -77.0364,
  },
  {
    id: ZONE_ID,
    name: "Northern Virginia District (Test)",
    tier: 5,
    parentId: CONF_ID,
    path: "/gc-test-001/div-test-001/union-test-001/conf-test-001/zone-test-001",
    timezone: "America/New_York",
    latitude: 38.9500,
    longitude: -77.1500,
  },
  {
    id: CHURCH_A_ID,
    name: "Grace Community SDA Church (Test)",
    tier: 7,
    parentId: ZONE_ID,
    path: "/gc-test-001/div-test-001/union-test-001/conf-test-001/zone-test-001/church-test-001",
    timezone: "America/New_York",
    latitude: 38.9072,
    longitude: -77.0369,
  },
  {
    id: CHURCH_B_ID,
    name: "Arlington SDA Church (Test)",
    tier: 6,
    parentId: ZONE_ID,
    path: "/gc-test-001/div-test-001/union-test-001/conf-test-001/zone-test-001/church-test-002",
    timezone: "America/New_York",
    latitude: 38.8799,
    longitude: -77.1068,
  },
  {
    id: DIV2_ID,
    name: "Inter-European Division (Test)",
    tier: 2,
    parentId: GC_ID,
    path: "/gc-test-001/div-test-002",
    timezone: "Europe/Zurich",
    latitude: 46.9481,
    longitude: 7.4474,
  },
  {
    id: UNION2_ID,
    name: "Franco-Belgian Union (Test)",
    tier: 3,
    parentId: DIV2_ID,
    path: "/gc-test-001/div-test-002/union-test-002",
    timezone: "Europe/Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    id: CONF2_ID,
    name: "French Conference (Test)",
    tier: 4,
    parentId: UNION2_ID,
    path: "/gc-test-001/div-test-002/union-test-002/conf-test-002",
    timezone: "Europe/Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    id: CHURCH_C_ID,
    name: "Paris Adventist Church (Test)",
    tier: 7,
    parentId: CONF2_ID,
    path: "/gc-test-001/div-test-002/union-test-002/conf-test-002/church-test-003",
    timezone: "Europe/Paris",
    latitude: 48.8731,
    longitude: 2.3511,
  },
];

export async function seedHierarchy() {
  console.log("[Seed] Starting hierarchy seed...");

  for (const node of HIERARCHY_NODES) {
    const existing = await db
      .select({ id: churchHierarchy.id })
      .from(churchHierarchy)
      .where(eq(churchHierarchy.id, node.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(churchHierarchy).values(node);
      console.log(`[Seed] Created hierarchy node: ${node.name} (tier ${node.tier})`);
    } else {
      console.log(`[Seed] Hierarchy node already exists: ${node.name}`);
    }
  }

  const adminUser = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (adminUser.length === 0) {
    const anyUser = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .limit(1);

    if (anyUser.length === 0) {
      console.log("[Seed] No users found in the database. Skipping membership creation.");
      console.log("[Seed] Hierarchy nodes created. Run this script again after a user registers.");
      return;
    }

    console.log(`[Seed] No admin user found. Using first user: ${anyUser[0].username} (${anyUser[0].id})`);
    await linkUserToChurch(anyUser[0].id);
  } else {
    console.log(`[Seed] Found admin user: ${adminUser[0].username} (${adminUser[0].id})`);
    await linkUserToChurch(adminUser[0].id);
  }

  console.log("[Seed] Hierarchy seed complete.");
}

async function linkUserToChurch(userId: string) {
  const existing = await db
    .select({ id: hierarchyMembership.id })
    .from(hierarchyMembership)
    .where(
      eq(hierarchyMembership.userId, userId),
    )
    .limit(1);

  if (existing.length > 0) {
    console.log(`[Seed] User ${userId} already has a hierarchy membership.`);
    return;
  }

  await db.insert(hierarchyMembership).values({
    userId,
    hierarchyNodeId: CHURCH_ID,
    role: "pastor",
    isPrimary: true,
  });

  console.log(`[Seed] Linked user ${userId} to Grace Community SDA Church as pastor.`);
}

const isDirectRun = (() => {
  try {
    return typeof require !== "undefined" && require.main === (typeof module !== "undefined" ? module : undefined);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  seedHierarchy()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed] Error:", err);
      process.exit(1);
    });
}
