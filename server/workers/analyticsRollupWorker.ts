import { db } from "../db";
import { sql } from "drizzle-orm";

function getISOWeekStart(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function stepDailyRollup(): Promise<number> {
  const today = getToday();
  console.log(`[RollupWorker] Step 1: Daily rollup for ${today}`);

  const result = await db.execute(sql`
    INSERT INTO topic_engagement_daily (id, hierarchy_node_id, topic, topic_type, date, total_views, total_duration_sec, unique_users, updated_at)
    SELECT
      gen_random_uuid(),
      hierarchy_node_id,
      topic,
      topic_type,
      ${today},
      COUNT(*)::int,
      COALESCE(SUM(duration_sec), 0)::int,
      COUNT(DISTINCT user_id)::int,
      now()
    FROM topic_engagement
    WHERE created_at::date = ${today}::date
      AND hierarchy_node_id IS NOT NULL
    GROUP BY hierarchy_node_id, topic, topic_type
    ON CONFLICT (hierarchy_node_id, date, topic, topic_type)
    DO UPDATE SET
      total_views = EXCLUDED.total_views,
      total_duration_sec = EXCLUDED.total_duration_sec,
      unique_users = EXCLUDED.unique_users,
      updated_at = now()
  `);

  const count = result.rowCount ?? 0;
  console.log(`[RollupWorker] Step 1 complete: ${count} daily rollup rows upserted`);
  return count;
}

async function stepWeeklyTrend(): Promise<number> {
  const now = new Date();
  const currentWeekStart = getISOWeekStart(now);
  const prevWeek = new Date(now);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const previousWeekStart = getISOWeekStart(prevWeek);
  const currentWeekEnd = new Date(now);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + (7 - currentWeekEnd.getDay()));
  const currentWeekEndStr = currentWeekEnd.toISOString().slice(0, 10);
  const prevWeekEnd = currentWeekStart;

  console.log(`[RollupWorker] Step 2: Weekly trend — current week ${currentWeekStart}, prev week ${previousWeekStart}`);

  const result = await db.execute(sql`
    WITH current_week AS (
      SELECT hierarchy_node_id, topic, topic_type,
        SUM(total_views)::int AS views
      FROM topic_engagement_daily
      WHERE date >= ${currentWeekStart} AND date < ${currentWeekEndStr}
      GROUP BY hierarchy_node_id, topic, topic_type
    ),
    prev_week AS (
      SELECT hierarchy_node_id, topic, topic_type,
        SUM(total_views)::int AS views
      FROM topic_engagement_daily
      WHERE date >= ${previousWeekStart} AND date < ${currentWeekStart}
      GROUP BY hierarchy_node_id, topic, topic_type
    ),
    combined AS (
      SELECT
        COALESCE(c.hierarchy_node_id, p.hierarchy_node_id) AS hierarchy_node_id,
        COALESCE(c.topic, p.topic) AS topic,
        COALESCE(c.topic_type, p.topic_type) AS topic_type,
        COALESCE(c.views, 0) AS current_views,
        COALESCE(p.views, 0) AS prev_views
      FROM current_week c
      FULL OUTER JOIN prev_week p
        ON c.hierarchy_node_id = p.hierarchy_node_id
        AND c.topic = p.topic
        AND c.topic_type = p.topic_type
    )
    INSERT INTO topic_trend (id, hierarchy_node_id, topic, topic_type, current_week_views, previous_week_views, trend_percent, trend_direction, week_start_date, updated_at)
    SELECT
      gen_random_uuid(),
      hierarchy_node_id,
      topic,
      topic_type,
      current_views,
      prev_views,
      CASE WHEN prev_views = 0 THEN
        CASE WHEN current_views > 0 THEN 100 ELSE 0 END
      ELSE
        ((current_views - prev_views)::float / prev_views * 100)::int
      END,
      CASE
        WHEN prev_views = 0 AND current_views > 0 THEN 'rising'
        WHEN prev_views > 0 AND ((current_views - prev_views)::float / prev_views * 100) >= 30 THEN 'rising'
        WHEN prev_views > 0 AND ((current_views - prev_views)::float / prev_views * 100) <= -15 THEN 'falling'
        ELSE 'stable'
      END,
      ${currentWeekStart},
      now()
    FROM combined
    ON CONFLICT (hierarchy_node_id, week_start_date, topic)
    DO UPDATE SET
      current_week_views = EXCLUDED.current_week_views,
      previous_week_views = EXCLUDED.previous_week_views,
      trend_percent = EXCLUDED.trend_percent,
      trend_direction = EXCLUDED.trend_direction,
      topic_type = EXCLUDED.topic_type,
      updated_at = now()
  `);

  const count = result.rowCount ?? 0;
  console.log(`[RollupWorker] Step 2 complete: ${count} trend rows upserted`);
  return count;
}

async function stepPastoralCareAlerts(): Promise<number> {
  const currentWeekStart = getISOWeekStart(new Date());

  console.log(`[RollupWorker] Step 3: Pastoral care alerts for week ${currentWeekStart}`);

  const individualResult = await db.execute(sql`
    INSERT INTO pastoral_care_alert (id, hierarchy_node_id, alert_type, severity, topic, member_count, week_start_date, created_at)
    SELECT
      gen_random_uuid(),
      te.hierarchy_node_id,
      'individual',
      'HIGH',
      te.topic,
      1,
      ${currentWeekStart},
      now()
    FROM topic_engagement te
    WHERE te.is_sensitive = true
      AND te.created_at >= ${currentWeekStart}::date
      AND te.hierarchy_node_id IS NOT NULL
    GROUP BY te.user_id, te.topic, te.hierarchy_node_id
    HAVING COUNT(*) >= 5
    ON CONFLICT (hierarchy_node_id, alert_type, topic, week_start_date) DO NOTHING
  `);

  const congregationalResult = await db.execute(sql`
    INSERT INTO pastoral_care_alert (id, hierarchy_node_id, alert_type, severity, topic, member_count, week_start_date, created_at)
    SELECT
      gen_random_uuid(),
      ted.hierarchy_node_id,
      'congregational',
      'MODERATE',
      ted.topic,
      SUM(ted.unique_users)::int,
      ${currentWeekStart},
      now()
    FROM topic_engagement_daily ted
    WHERE ted.date >= ${currentWeekStart}
      AND EXISTS (
        SELECT 1 FROM topic_engagement te2
        WHERE te2.topic = ted.topic
          AND te2.is_sensitive = true
        LIMIT 1
      )
    GROUP BY ted.hierarchy_node_id, ted.topic
    HAVING SUM(ted.unique_users) >= 3
    ON CONFLICT (hierarchy_node_id, alert_type, topic, week_start_date) DO NOTHING
  `);

  const total = (individualResult.rowCount ?? 0) + (congregationalResult.rowCount ?? 0);
  console.log(`[RollupWorker] Step 3 complete: ${individualResult.rowCount ?? 0} individual + ${congregationalResult.rowCount ?? 0} congregational alerts`);
  return total;
}

async function stepCacheRebuild(): Promise<number> {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const currentWeekStart = getISOWeekStart(new Date());

  console.log(`[RollupWorker] Step 4: Cache rebuild for nodes active since ${fourHoursAgo}`);

  const activeNodes = await db.execute(sql`
    SELECT DISTINCT hierarchy_node_id
    FROM topic_engagement
    WHERE created_at >= ${fourHoursAgo}::timestamp
      AND hierarchy_node_id IS NOT NULL
  `);

  const rows = activeNodes.rows as Array<{ hierarchy_node_id: string }>;
  if (rows.length === 0) {
    console.log(`[RollupWorker] Step 4: No active nodes, skipping cache rebuild`);
    return 0;
  }

  let upsertCount = 0;

  for (const row of rows) {
    const nodeId = row.hierarchy_node_id;

    const statsResult = await db.execute(sql`
      SELECT
        COUNT(DISTINCT user_id)::int AS active_users,
        COUNT(*)::int AS total_engagements,
        COALESCE(SUM(duration_sec), 0)::int AS total_duration_sec,
        COUNT(*) FILTER (WHERE topic_type = 'reading_plan')::int AS bible_reading_sessions,
        COUNT(*) FILTER (WHERE topic_type = 'devotional')::int AS plans_completed,
        COUNT(*) FILTER (WHERE topic_type = 'video')::int AS videos_watched,
        COUNT(*) FILTER (WHERE topic_type = 'essentials' OR topic_type = 'signpost')::int AS study_sessions,
        COUNT(*) FILTER (WHERE topic_type = 'sabbath_school')::int AS prayer_requests
      FROM topic_engagement
      WHERE hierarchy_node_id = ${nodeId}
        AND created_at >= ${currentWeekStart}::date
    `);

    const stats = (statsResult.rows[0] as Record<string, number>) || {};

    const topTopicsResult = await db.execute(sql`
      SELECT
        ted.topic,
        SUM(ted.total_views)::int AS count,
        COALESCE(tt.trend_direction, 'stable') AS trend_direction
      FROM topic_engagement_daily ted
      LEFT JOIN topic_trend tt
        ON tt.hierarchy_node_id = ted.hierarchy_node_id
        AND tt.topic = ted.topic
        AND tt.week_start_date = ${currentWeekStart}
      WHERE ted.hierarchy_node_id = ${nodeId}
        AND ted.date >= ${currentWeekStart}
      GROUP BY ted.topic, tt.trend_direction
      ORDER BY count DESC
      LIMIT 10
    `);

    const topTopics = (topTopicsResult.rows as Array<{ topic: string; count: number; trend_direction: string }>).map(
      (r) => ({ topic: r.topic, count: r.count, trend_direction: r.trend_direction })
    );

    const cacheData = {
      active_users: stats.active_users ?? 0,
      total_engagements: stats.total_engagements ?? 0,
      total_duration_sec: stats.total_duration_sec ?? 0,
      bible_reading_sessions: stats.bible_reading_sessions ?? 0,
      plans_completed: stats.plans_completed ?? 0,
      videos_watched: stats.videos_watched ?? 0,
      study_sessions: stats.study_sessions ?? 0,
      prayer_requests: stats.prayer_requests ?? 0,
      new_members: 0,
      top_topics: topTopics,
      age_segments: {},
    };

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    await db.execute(sql`
      INSERT INTO analytics_cache (id, hierarchy_node_id, cache_type, time_range, data, expires_at, updated_at)
      VALUES (gen_random_uuid(), ${nodeId}, 'dashboard', ${currentWeekStart}, ${JSON.stringify(cacheData)}::jsonb, ${expiresAt}::timestamp, now())
      ON CONFLICT (hierarchy_node_id, cache_type, time_range)
      DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `);

    upsertCount++;
  }

  console.log(`[RollupWorker] Step 4 complete: ${upsertCount} cache rows upserted`);
  return upsertCount;
}

export async function runAnalyticsRollup(): Promise<void> {
  const startTime = Date.now();
  console.log(`[RollupWorker] ═══ Starting analytics rollup ═══`);

  try {
    const dailyCount = await stepDailyRollup();
    const trendCount = await stepWeeklyTrend();
    const alertCount = await stepPastoralCareAlerts();
    const cacheCount = await stepCacheRebuild();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[RollupWorker] ═══ Complete in ${elapsed}s — daily: ${dailyCount}, trends: ${trendCount}, alerts: ${alertCount}, cache: ${cacheCount} ═══`);
  } catch (err) {
    console.error(`[RollupWorker] FAILED:`, err);
    throw err;
  }
}
