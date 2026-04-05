import { db } from "../db";
import { sql } from "drizzle-orm";

const PRIVACY_MINIMUM = 5;

export async function runActivityPattern(): Promise<void> {
  const startTime = Date.now();
  console.log(`[ActivityPatternWorker] ═══ Starting activity pattern computation ═══`);

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    const eligibleNodes = await db.execute(sql`
      SELECT hierarchy_node_id, COUNT(*)::int AS total
      FROM topic_engagement
      WHERE created_at >= ${monthStartStr}::timestamp
        AND hierarchy_node_id IS NOT NULL
      GROUP BY hierarchy_node_id
      HAVING COUNT(*) >= ${PRIVACY_MINIMUM}
    `);

    const nodes = eligibleNodes.rows as Array<{
      hierarchy_node_id: string;
      total: number;
    }>;

    if (nodes.length === 0) {
      console.log(`[ActivityPatternWorker] No nodes with >= ${PRIVACY_MINIMUM} engagements, skipping`);
      return;
    }

    console.log(`[ActivityPatternWorker] Processing ${nodes.length} eligible nodes`);

    let totalTiles = 0;

    for (const node of nodes) {
      const nodeId = node.hierarchy_node_id;

      const tilesResult = await db.execute(sql`
        WITH raw_tiles AS (
          SELECT
            EXTRACT(DOW FROM created_at)::int AS day_of_week,
            (EXTRACT(HOUR FROM created_at)::int / 4) AS time_block,
            COUNT(*)::int AS engagement_count
          FROM topic_engagement
          WHERE hierarchy_node_id = ${nodeId}
            AND created_at >= ${monthStartStr}::timestamp
          GROUP BY day_of_week, time_block
        ),
        max_count AS (
          SELECT MAX(engagement_count) AS max_val FROM raw_tiles
        )
        SELECT
          rt.day_of_week,
          rt.time_block,
          rt.engagement_count,
          CASE WHEN mc.max_val > 0
            THEN ROUND((rt.engagement_count::float / mc.max_val * 100))::int
            ELSE 0
          END AS engagement_score
        FROM raw_tiles rt, max_count mc
      `);

      const tiles = tilesResult.rows as Array<{
        day_of_week: number;
        time_block: number;
        engagement_count: number;
        engagement_score: number;
      }>;

      for (const tile of tiles) {
        await db.execute(sql`
          INSERT INTO activity_pattern_tile (id, hierarchy_node_id, day_of_week, time_block, engagement_count, engagement_score, time_range, updated_at)
          VALUES (gen_random_uuid(), ${nodeId}, ${tile.day_of_week}, ${tile.time_block}, ${tile.engagement_count}, ${tile.engagement_score}, 'month', now())
          ON CONFLICT (hierarchy_node_id, day_of_week, time_block, time_range)
          DO UPDATE SET
            engagement_count = EXCLUDED.engagement_count,
            engagement_score = EXCLUDED.engagement_score,
            updated_at = now()
        `);
      }

      totalTiles += tiles.length;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[ActivityPatternWorker] ═══ Complete in ${elapsed}s — ${totalTiles} tiles across ${nodes.length} nodes ═══`);
  } catch (err) {
    console.error(`[ActivityPatternWorker] FAILED:`, err);
    throw err;
  }
}
