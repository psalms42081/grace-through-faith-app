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
} from "../../shared/schema";
import { runAnalyticsRollup } from "../workers/analyticsRollupWorker";
import { runHeatmapTiles } from "../workers/heatmapTileWorker";
import { runActivityPattern } from "../workers/activityPatternWorker";

const TP = "test-wrk-";

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
}

async function seedTestData() {
  await db.insert(churchHierarchy).values([
    { id: `${TP}gc`, name: "GC", tier: 1, path: "/gc", latitude: 39.0438, longitude: -77.4874 },
    { id: `${TP}conf`, name: "Test Conf", tier: 4, path: "/gc/div/u/conf" },
    { id: `${TP}ch1`, name: "Fresno Central SDA", tier: 6, path: "/gc/div/u/conf/d/ch1", latitude: 36.7378, longitude: -119.7871 },
    { id: `${TP}ch2`, name: "Paris SDA", tier: 6, path: "/gc/eud/ch2", latitude: 48.8566, longitude: 2.3522 },
  ]);

  const users = ["user1", "user2", "user3", "user4", "user5", "user6", "user7"];
  for (const u of users) {
    await db.insert(hierarchyMembership).values({
      userId: `${TP}${u}`,
      hierarchyNodeId: `${TP}ch1`,
      role: "member",
      isPrimary: true,
    });
  }

  await db.insert(userLocation).values([
    { userId: `${TP}user1`, latitude: 36.74, longitude: -119.79, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user2`, latitude: 36.73, longitude: -119.78, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user3`, latitude: 36.75, longitude: -119.80, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user4`, latitude: 36.72, longitude: -119.77, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user5`, latitude: 36.76, longitude: -119.81, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user6`, latitude: 48.86, longitude: 2.35, hierarchyNodeId: `${TP}ch2` },
    { userId: `${TP}user7`, latitude: 48.85, longitude: 2.36, hierarchyNodeId: `${TP}ch2` },
  ]);

  const engagements = [];

  for (const u of ["user1", "user2", "user3", "user4", "user5"]) {
    engagements.push(
      { userId: `${TP}${u}`, topic: "sabbath", topicType: "essentials", durationSec: 120, isSensitive: false, hierarchyNodeId: `${TP}ch1` },
      { userId: `${TP}${u}`, topic: "prayer", topicType: "devotional", durationSec: 60, isSensitive: false, hierarchyNodeId: `${TP}ch1` },
    );
  }

  for (const u of ["user1", "user2", "user3"]) {
    for (let i = 0; i < 6; i++) {
      engagements.push({
        userId: `${TP}${u}`,
        topic: "depression",
        topicType: "signpost",
        durationSec: 30,
        isSensitive: true,
        hierarchyNodeId: `${TP}ch1`,
      });
    }
  }

  engagements.push(
    { userId: `${TP}user4`, topic: "second coming", topicType: "video", durationSec: 300, isSensitive: false, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user5`, topic: "creation", topicType: "sabbath_school", durationSec: 200, isSensitive: false, hierarchyNodeId: `${TP}ch1` },
    { userId: `${TP}user6`, topic: "prophecy", topicType: "essentials", durationSec: 150, isSensitive: false, hierarchyNodeId: `${TP}ch2` },
    { userId: `${TP}user7`, topic: "sanctuary", topicType: "essentials", durationSec: 180, isSensitive: false, hierarchyNodeId: `${TP}ch2` },
  );

  for (const eng of engagements) {
    await db.insert(topicEngagement).values(eng);
  }

  console.log(`  Seeded ${engagements.length} engagement rows, 7 users, 7 locations`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  STAGE 4 — BACKGROUND WORKERS TEST (REVISED)    ║");
  console.log("║  Geographic Heatmap + Activity Pattern           ║");
  console.log("╚══════════════════════════════════════════════════╝");

  try {
    await cleanup();
    await seedTestData();

    console.log("\n══════════════════════════════════════════════════");
    console.log("RUNNING ANALYTICS ROLLUP WORKER");
    console.log("══════════════════════════════════════════════════");
    await runAnalyticsRollup();

    console.log("\n══════════════════════════════════════════════════");
    console.log("RUNNING GEOGRAPHIC HEATMAP WORKER");
    console.log("══════════════════════════════════════════════════");
    await runHeatmapTiles();

    console.log("\n══════════════════════════════════════════════════");
    console.log("RUNNING ACTIVITY PATTERN WORKER");
    console.log("══════════════════════════════════════════════════");
    await runActivityPattern();

    console.log("\n══════════════════════════════════════════════════");
    console.log("VERIFYING: topic_engagement_daily");
    console.log("══════════════════════════════════════════════════");
    const dailyRows = await db.select().from(topicEngagementDaily).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    console.log(`  Rows: ${dailyRows.length}`);
    for (const r of dailyRows) {
      console.log(`    node=${r.hierarchyNodeId.replace(TP, "")}, topic=${r.topic}, views=${r.totalViews}, users=${r.uniqueUsers}`);
    }
    const hasSabbathDaily = dailyRows.some((r) => r.topic === "sabbath" && r.totalViews === 5 && r.uniqueUsers === 5);
    const hasDepDaily = dailyRows.some((r) => r.topic === "depression" && r.totalViews === 18 && r.uniqueUsers === 3);
    console.log(`  ✓ Sabbath daily (5 views, 5 users): ${hasSabbathDaily}`);
    console.log(`  ✓ Depression daily (18 views, 3 users): ${hasDepDaily}`);

    console.log("\n══════════════════════════════════════════════════");
    console.log("VERIFYING: pastoral_care_alert");
    console.log("══════════════════════════════════════════════════");
    const alertRows = await db.select().from(pastoralCareAlert).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    console.log(`  Rows: ${alertRows.length}`);
    for (const r of alertRows) {
      console.log(`    type=${r.alertType}, severity=${r.severity}, topic=${r.topic}`);
    }
    const hasIndividual = alertRows.some((r) => r.alertType === "individual" && r.severity === "HIGH");
    const hasCongregational = alertRows.some((r) => r.alertType === "congregational" && r.severity === "MODERATE");
    console.log(`  ✓ Individual HIGH alert: ${hasIndividual}`);
    console.log(`  ✓ Congregational MODERATE alert: ${hasCongregational}`);

    console.log("\n══════════════════════════════════════════════════");
    console.log("VERIFYING: heatmap_tile (GEOGRAPHIC)");
    console.log("══════════════════════════════════════════════════");
    const geoRows = await db.select().from(heatmapTile).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    console.log(`  Rows: ${geoRows.length}`);
    for (const r of geoRows) {
      console.log(`    node=${r.hierarchyNodeId.replace(TP, "")}, lat=${r.latitude}, lng=${r.longitude}, score=${r.engagementScore}, users=${r.userCount}, region=${r.regionKey}`);
    }
    const hasGeoFresno = geoRows.some((r) => r.hierarchyNodeId === `${TP}ch1` && r.latitude !== 0 && r.longitude !== 0);
    const hasGeoScore = geoRows.some((r) => r.engagementScore > 0);
    const hasRegionKey = geoRows.every((r) => r.regionKey.includes(","));
    console.log(`  ✓ Geographic tile for Fresno area: ${hasGeoFresno}`);
    console.log(`  ✓ Engagement scores computed: ${hasGeoScore}`);
    console.log(`  ✓ Region keys formatted (lat,lng): ${hasRegionKey}`);

    const parisBelow5 = !geoRows.some((r) => r.hierarchyNodeId === `${TP}ch2`);
    console.log(`  ✓ Paris (2 users) excluded by privacy minimum: ${parisBelow5}`);

    console.log("\n══════════════════════════════════════════════════");
    console.log("VERIFYING: activity_pattern_tile (DAY×TIME GRID)");
    console.log("══════════════════════════════════════════════════");
    const actRows = await db.select().from(activityPatternTile).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    console.log(`  Rows: ${actRows.length}`);
    for (const r of actRows) {
      console.log(`    node=${r.hierarchyNodeId.replace(TP, "")}, day=${r.dayOfWeek}, block=${r.timeBlock}, count=${r.engagementCount}, score=${r.engagementScore}`);
    }
    const hasActivityCh1 = actRows.some((r) => r.hierarchyNodeId === `${TP}ch1`);
    const hasNormalized100 = actRows.some((r) => r.engagementScore === 100);
    const allScoresValid = actRows.every((r) => r.engagementScore >= 0 && r.engagementScore <= 100);
    console.log(`  ✓ Activity tiles for ch1: ${hasActivityCh1}`);
    console.log(`  ✓ Max score normalized to 100: ${hasNormalized100}`);
    console.log(`  ✓ All scores 0-100: ${allScoresValid}`);

    console.log("\n══════════════════════════════════════════════════");
    console.log("IDEMPOTENCY CHECK");
    console.log("══════════════════════════════════════════════════");
    await runAnalyticsRollup();
    await runHeatmapTiles();
    await runActivityPattern();

    const dailyAfter = await db.select().from(topicEngagementDaily).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    const alertAfter = await db.select().from(pastoralCareAlert).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    const geoAfter = await db.select().from(heatmapTile).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);
    const actAfter = await db.select().from(activityPatternTile).where(sql`hierarchy_node_id LIKE ${TP + "%"}`);

    const idempotent =
      dailyAfter.length === dailyRows.length &&
      alertAfter.length === alertRows.length &&
      geoAfter.length === geoRows.length &&
      actAfter.length === actRows.length;

    console.log(`  daily: ${dailyRows.length} → ${dailyAfter.length}`);
    console.log(`  alerts: ${alertRows.length} → ${alertAfter.length}`);
    console.log(`  geo tiles: ${geoRows.length} → ${geoAfter.length}`);
    console.log(`  activity tiles: ${actRows.length} → ${actAfter.length}`);
    console.log(`  ✓ All tables idempotent: ${idempotent}`);

    console.log("\n══════════════════════════════════════════════════");
    console.log("SUMMARY");
    console.log("══════════════════════════════════════════════════");

    const results = [
      { label: "Daily rollup correct", pass: hasSabbathDaily && hasDepDaily },
      { label: "Individual pastoral alert (HIGH)", pass: hasIndividual },
      { label: "Congregational pastoral alert (MODERATE)", pass: hasCongregational },
      { label: "Geographic heatmap tiles (lat/lng)", pass: hasGeoFresno && hasGeoScore },
      { label: "Geographic region keys formatted", pass: hasRegionKey },
      { label: "Privacy minimum enforced (Paris excluded)", pass: parisBelow5 },
      { label: "Activity pattern tiles (day×time)", pass: hasActivityCh1 },
      { label: "Activity scores normalized 0-100", pass: hasNormalized100 && allScoresValid },
      { label: "Idempotent re-run (no duplicates)", pass: idempotent },
    ];

    for (const r of results) {
      console.log(`  ${r.pass ? "✅" : "❌"} ${r.label}`);
    }

    const allPassed = results.every((r) => r.pass);
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
