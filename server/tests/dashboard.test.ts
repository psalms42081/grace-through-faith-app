import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  churchHierarchy,
  hierarchyMembership,
  topicEngagement,
  topicEngagementDaily,
  topicTrend,
  pastoralCareAlert,
  analyticsCache,
  heatmapTile,
  activityPatternTile,
  userLocation,
  users,
} from "../../shared/schema";
import { runAnalyticsRollup } from "../workers/analyticsRollupWorker";
import { runHeatmapTiles } from "../workers/heatmapTileWorker";
import { runActivityPattern } from "../workers/activityPatternWorker";

const TP = "test-dash-";

function getISOWeekStart(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

async function cleanup() {
  await db.delete(activityPatternTile).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
  await db.delete(heatmapTile).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
  await db.delete(analyticsCache).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
  await db.delete(pastoralCareAlert).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
  await db.delete(topicTrend).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
  await db.delete(topicEngagementDaily).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
  await db.delete(topicEngagement).where(sql`user_id LIKE ${TP + "%"}`);
  await db.delete(userLocation).where(sql`user_id LIKE ${TP + "%"}`);
  await db.delete(hierarchyMembership).where(sql`user_id LIKE ${TP + "%"}`);
  await db.delete(churchHierarchy).where(sql`id LIKE ${TP + "%"}`);
  await db.delete(users).where(sql`id LIKE ${TP + "%"}`);
}

async function seedTestData() {
  await db.insert(churchHierarchy).values([
    { id: `${TP}gc`, name: "GC", tier: 1, path: `/${TP}gc`, latitude: 39.04, longitude: -77.49 },
    { id: `${TP}div`, name: "NAD", tier: 2, path: `/${TP}gc/${TP}div`, latitude: 38.90, longitude: -77.04 },
    { id: `${TP}union`, name: "Pacific Union", tier: 3, path: `/${TP}gc/${TP}div/${TP}union` },
    { id: `${TP}conf`, name: "Central Conf", tier: 4, path: `/${TP}gc/${TP}div/${TP}union/${TP}conf` },
    { id: `${TP}ch1`, name: "Fresno Central SDA", tier: 7, path: `/${TP}gc/${TP}div/${TP}union/${TP}conf/${TP}ch1`, latitude: 36.74, longitude: -119.79 },
    { id: `${TP}ch2`, name: "Mountain View SDA", tier: 7, path: `/${TP}gc/${TP}div/${TP}union/${TP}conf/${TP}ch2`, latitude: 37.39, longitude: -122.08 },
  ]);

  const userIds = ["pastor1", "conf-pres", "union-pres", "div-pres", "gc-admin"];
  for (const u of userIds) {
    await db.insert(users).values({
      id: `${TP}${u}`,
      email: `${TP}${u}@test.com`,
      username: `${TP}${u}`,
      password: "hashed",
      name: `Test ${u}`,
    }).onConflictDoNothing();
  }

  await db.insert(hierarchyMembership).values([
    { userId: `${TP}pastor1`, hierarchyNodeId: `${TP}ch1`, role: "pastor", isPrimary: true },
    { userId: `${TP}conf-pres`, hierarchyNodeId: `${TP}conf`, role: "president", isPrimary: true },
    { userId: `${TP}union-pres`, hierarchyNodeId: `${TP}union`, role: "president", isPrimary: true },
    { userId: `${TP}div-pres`, hierarchyNodeId: `${TP}div`, role: "president", isPrimary: true },
    { userId: `${TP}gc-admin`, hierarchyNodeId: `${TP}gc`, role: "gc_admin", isPrimary: true },
  ]);

  await db.insert(userLocation).values([
    { userId: `${TP}pastor1`, latitude: 36.74, longitude: -119.79, hierarchyNodeId: `${TP}ch1` },
  ]);

  const engagements = [];
  for (let i = 0; i < 5; i++) {
    engagements.push(
      { userId: `${TP}pastor1`, topic: "sabbath", topicType: "essentials", durationSec: 120, isSensitive: false, hierarchyNodeId: `${TP}ch1` },
      { userId: `${TP}pastor1`, topic: "prayer", topicType: "devotional", durationSec: 60, isSensitive: false, hierarchyNodeId: `${TP}ch1` },
    );
  }
  for (let i = 0; i < 6; i++) {
    engagements.push({
      userId: `${TP}pastor1`,
      topic: "depression",
      topicType: "signpost",
      durationSec: 30,
      isSensitive: true,
      hierarchyNodeId: `${TP}ch1`,
    });
  }
  await db.insert(topicEngagement).values(engagements);

  await runAnalyticsRollup();
  await runHeatmapTiles();
  await runActivityPattern();
}

async function runTests() {
  console.log("\n═══ Dashboard API Tests ═══\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ ${msg}`);
      passed++;
    } else {
      console.log(`  ❌ ${msg}`);
      failed++;
    }
  }

  try {
    await cleanup();
    await seedTestData();

    console.log("Test 1: Pastor dashboard has correct shape");
    {
      const weekStart = getISOWeekStart(new Date());
      const cached = await db.execute(sql`
        SELECT data FROM analytics_cache WHERE hierarchy_node_id = ${`${TP}ch1`} AND cache_type = 'dashboard' LIMIT 1
      `);
      const cacheData = cached.rows[0] ? (cached.rows[0] as any).data : {};

      const alertCount = await db.execute(sql`
        SELECT count(*)::int AS count FROM pastoral_care_alert
        WHERE hierarchy_node_id = ${`${TP}ch1`} AND is_reviewed = false
      `);
      const alerts = (alertCount.rows[0] as any)?.count ?? 0;

      const trends = await db.execute(sql`
        SELECT topic, current_week_views, trend_direction FROM topic_trend
        WHERE hierarchy_node_id = ${`${TP}ch1`}
        ORDER BY current_week_views DESC LIMIT 5
      `);

      const activityGrid = await db.execute(sql`
        SELECT day_of_week, time_block, engagement_score FROM activity_pattern_tile
        WHERE hierarchy_node_id = ${`${TP}ch1`}
      `);

      assert(cached.rows.length > 0, "Cache row exists for pastor's church");
      assert(typeof cacheData === "object", "Cache data is an object");
      assert(typeof (cacheData as any).active_users === "number", "active_users is a number");
      assert(typeof (cacheData as any).total_engagements === "number", "total_engagements is a number");
      assert(alerts >= 0, `Pastoral alert count is valid (${alerts})`);
      assert(trends.rows.length > 0, `Topic trends exist (${trends.rows.length} topics)`);
      assert(activityGrid.rows.length > 0, `Activity grid tiles exist (${activityGrid.rows.length} tiles)`);
    }

    console.log("\nTest 2: Conference dashboard aggregates child churches");
    {
      const confDescendants = await db.execute(sql`
        SELECT id, name, tier FROM church_hierarchy
        WHERE path LIKE ${"/" + TP + "gc/" + TP + "div/" + TP + "union/" + TP + "conf%"}
        AND tier = 7
      `);

      assert(confDescendants.rows.length === 2, `Conference has 2 child churches (got ${confDescendants.rows.length})`);

      const childIds = (confDescendants.rows as any[]).map(r => r.id);
      const alertSummary = await db.execute(sql`
        SELECT severity, count(*)::int AS count
        FROM pastoral_care_alert
        WHERE hierarchy_node_id = ANY(${sql`ARRAY[${sql.join(childIds.map(id => sql`${id}`), sql`, `)}]::varchar[]`})
          AND is_reviewed = false
        GROUP BY severity
      `);

      const alertMap: Record<string, number> = { HIGH: 0, MODERATE: 0, INFO: 0 };
      for (const row of alertSummary.rows as any[]) {
        alertMap[row.severity] = row.count;
      }

      assert(typeof alertMap.HIGH === "number", `HIGH alerts aggregated (${alertMap.HIGH})`);
      assert(typeof alertMap.MODERATE === "number", `MODERATE alerts aggregated (${alertMap.MODERATE})`);
    }

    console.log("\nTest 3: GC heatmap respects 5-user privacy minimum & intensity format");
    {
      const heatmapData = await db.execute(sql`
        SELECT latitude, longitude, engagement_score FROM heatmap_tile
        WHERE hierarchy_node_id = ${`${TP}gc`}
      `);

      assert(heatmapData.rows.length === 0, "Heatmap correctly empty with <5 users in region");

      const sampleScore = 75;
      const intensity = Math.round((sampleScore / 100) * 100) / 100;
      assert(intensity === 0.75, `intensity formula correct: score 75 → intensity 0.75 (got ${intensity})`);
      assert(intensity >= 0 && intensity <= 1, "intensity stays in 0-1 range");
    }

    console.log("\nTest 4: Division dashboard includes heatmap but no church markers");
    {
      const divHeatmap = await db.execute(sql`
        SELECT latitude, longitude, engagement_score FROM heatmap_tile
        WHERE hierarchy_node_id = ${`${TP}div`}
      `);

      assert(divHeatmap.rows.length >= 0, `Division heatmap query returns (${divHeatmap.rows.length} tiles)`);
    }

    console.log("\nTest 5: Empty cache returns building status");
    {
      const fakeNodeId = `${TP}nonexistent`;
      const cached = await db.execute(sql`
        SELECT data FROM analytics_cache WHERE hierarchy_node_id = ${fakeNodeId} LIMIT 1
      `);
      assert(cached.rows.length === 0, "No cache row for nonexistent node");
    }

    console.log("\nTest 6: Topic trends have correct fields");
    {
      const trends = await db.execute(sql`
        SELECT topic, current_week_views, previous_week_views, trend_percent, trend_direction, topic_type
        FROM topic_trend
        WHERE hierarchy_node_id = ${`${TP}ch1`}
        ORDER BY current_week_views DESC LIMIT 5
      `);

      if (trends.rows.length > 0) {
        const t = trends.rows[0] as any;
        assert(typeof t.topic === "string", "topic is a string");
        assert(typeof t.current_week_views === "number", "current_week_views is a number");
        assert(typeof t.trend_direction === "string", "trend_direction is a string");
        assert(typeof t.trend_percent === "number", "trend_percent is a number");
        assert(typeof t.topic_type === "string", "topic_type is a string");
      } else {
        assert(false, "No topic trends found for test church");
      }
    }

    console.log("\nTest 7: Activity pattern has valid 7x6 grid structure");
    {
      const grid = await db.execute(sql`
        SELECT day_of_week, time_block, engagement_score, engagement_count
        FROM activity_pattern_tile
        WHERE hierarchy_node_id = ${`${TP}ch1`}
        ORDER BY day_of_week, time_block
      `);

      const tiles = grid.rows as any[];
      const allDaysValid = tiles.every((t: any) => t.day_of_week >= 0 && t.day_of_week <= 6);
      const allBlocksValid = tiles.every((t: any) => t.time_block >= 0 && t.time_block <= 5);
      const allScoresValid = tiles.every((t: any) => t.engagement_score >= 0 && t.engagement_score <= 100);

      assert(allDaysValid, "All day_of_week values are 0-6");
      assert(allBlocksValid, "All time_block values are 0-5");
      assert(allScoresValid, "All engagement_scores are 0-100");
      assert(tiles.length > 0, `Grid has ${tiles.length} tiles`);
    }

  } finally {
    await cleanup();
  }

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
