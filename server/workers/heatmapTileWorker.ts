import { db } from "../db";
import { sql } from "drizzle-orm";

const PRIVACY_MINIMUM = 5;

function roundToGrid(lat: number, lng: number): { lat: number; lng: number; regionKey: string } {
  const gridLat = Math.round(lat);
  const gridLng = Math.round(lng);
  return {
    lat: gridLat,
    lng: gridLng,
    regionKey: `${gridLat},${gridLng}`,
  };
}

export async function runHeatmapTiles(): Promise<void> {
  const startTime = Date.now();
  console.log(`[HeatmapWorker] ═══ Starting geographic heatmap tile computation ═══`);

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    const geoData = await db.execute(sql`
      SELECT
        ul.hierarchy_node_id,
        ul.latitude,
        ul.longitude,
        COUNT(te.id)::int AS engagement_count,
        COUNT(DISTINCT te.user_id)::int AS user_count
      FROM user_location ul
      INNER JOIN topic_engagement te
        ON te.user_id = ul.user_id
        AND te.created_at >= ${monthStartStr}::timestamp
      WHERE ul.hierarchy_node_id IS NOT NULL
      GROUP BY ul.hierarchy_node_id, ul.latitude, ul.longitude
    `);

    const rows = geoData.rows as Array<{
      hierarchy_node_id: string;
      latitude: number;
      longitude: number;
      engagement_count: number;
      user_count: number;
    }>;

    if (rows.length === 0) {
      console.log(`[HeatmapWorker] No geo-located engagement data, skipping`);
      return;
    }

    const nodeGroups = new Map<string, typeof rows>();
    for (const row of rows) {
      const grid = roundToGrid(row.latitude, row.longitude);
      const key = `${row.hierarchy_node_id}::${grid.regionKey}`;
      if (!nodeGroups.has(key)) {
        nodeGroups.set(key, []);
      }
      nodeGroups.get(key)!.push(row);
    }

    const aggregated: Array<{
      hierarchyNodeId: string;
      lat: number;
      lng: number;
      regionKey: string;
      engagementCount: number;
      userCount: number;
    }> = [];

    for (const [key, group] of nodeGroups) {
      const nodeId = key.split("::")[0];
      const totalEngagements = group.reduce((sum, r) => sum + r.engagement_count, 0);
      const totalUsers = group.reduce((sum, r) => sum + r.user_count, 0);

      if (totalUsers < PRIVACY_MINIMUM) continue;

      const avgLat = group.reduce((sum, r) => sum + r.latitude, 0) / group.length;
      const avgLng = group.reduce((sum, r) => sum + r.longitude, 0) / group.length;
      const grid = roundToGrid(avgLat, avgLng);

      aggregated.push({
        hierarchyNodeId: nodeId,
        lat: grid.lat,
        lng: grid.lng,
        regionKey: grid.regionKey,
        engagementCount: totalEngagements,
        userCount: totalUsers,
      });
    }

    if (aggregated.length === 0) {
      console.log(`[HeatmapWorker] No regions meet ${PRIVACY_MINIMUM}-user minimum, skipping`);
      return;
    }

    const maxEngagement = Math.max(...aggregated.map((a) => a.engagementCount));

    let tileCount = 0;
    for (const tile of aggregated) {
      const score = maxEngagement > 0
        ? Math.round((tile.engagementCount / maxEngagement) * 100)
        : 0;

      await db.execute(sql`
        INSERT INTO heatmap_tile (id, hierarchy_node_id, latitude, longitude, engagement_count, engagement_score, region_key, region_level, time_range, user_count, updated_at)
        VALUES (gen_random_uuid(), ${tile.hierarchyNodeId}, ${tile.lat}, ${tile.lng}, ${tile.engagementCount}, ${score}, ${tile.regionKey}, 'grid', 'month', ${tile.userCount}, now())
        ON CONFLICT (hierarchy_node_id, region_key, time_range)
        DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          engagement_count = EXCLUDED.engagement_count,
          engagement_score = EXCLUDED.engagement_score,
          user_count = EXCLUDED.user_count,
          updated_at = now()
      `);
      tileCount++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[HeatmapWorker] ═══ Complete in ${elapsed}s — ${tileCount} geo tiles across ${new Set(aggregated.map((a) => a.hierarchyNodeId)).size} nodes ═══`);
  } catch (err) {
    console.error(`[HeatmapWorker] FAILED:`, err);
    throw err;
  }
}
