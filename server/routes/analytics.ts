import { Router, Request, Response } from "express";
import { requireHierarchyAccess } from "../middleware/hierarchyAccess";
import { db } from "../db";
import {
  topicEngagement,
  hierarchyMembership,
  analyticsCache,
  topicTrend,
  pastoralCareAlert,
  heatmapTile,
  activityPatternTile,
  churchHierarchy,
  sdaChurches,
  users,
} from "../../shared/schema";
import { eq, and, inArray, sql, desc, gte, like } from "drizzle-orm";
import type { MergedHierarchyScope } from "../services/hierarchyScope";

function sqlArray(ids: string[]) {
  if (ids.length === 0) return sql`ARRAY[]::text[]`;
  return sql`ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]`;
}

const router = Router();

const VALID_TOPIC_TYPES = [
  "signpost",
  "essentials",
  "video",
  "reading_plan",
  "devotional",
  "search",
  "sabbath_school",
] as const;

const SENSITIVE_TOPICS = new Set([
  "depression",
  "loneliness",
  "grief",
  "anxiety",
  "suffering",
  "doubt",
  "addiction",
  "abandonment",
  "fear",
  "anger",
  "suicide",
  "self-harm",
  "divorce",
  "abuse",
  "trauma",
]);

function isSensitiveTopic(topic: string): boolean {
  return SENSITIVE_TOPICS.has(topic.toLowerCase().trim());
}

router.post(
  "/engagement",
  requireHierarchyAccess(),
  async (req: Request, res: Response) => {
    try {
      const { user_id, topic, topic_type, content_id, duration_sec } = req.body;

      if (!user_id || typeof user_id !== "string") {
        return res.status(400).json({ error: "user_id is required" });
      }
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "topic is required" });
      }
      if (
        !topic_type ||
        !VALID_TOPIC_TYPES.includes(topic_type as (typeof VALID_TOPIC_TYPES)[number])
      ) {
        return res.status(400).json({
          error: `topic_type must be one of: ${VALID_TOPIC_TYPES.join(", ")}`,
        });
      }
      if (duration_sec !== undefined && (typeof duration_sec !== "number" || duration_sec < 0)) {
        return res.status(400).json({ error: "duration_sec must be a non-negative number" });
      }

      const scope = req.hierarchyScope!;

      let primaryNodeId: string | null = null;
      for (const s of scope.scopes) {
        const [membership] = await db
          .select({ nodeId: hierarchyMembership.hierarchyNodeId })
          .from(hierarchyMembership)
          .where(
            and(
              eq(hierarchyMembership.userId, user_id),
              eq(hierarchyMembership.hierarchyNodeId, s.nodeId),
              eq(hierarchyMembership.isPrimary, true)
            )
          )
          .limit(1);
        if (membership) {
          primaryNodeId = membership.nodeId;
          break;
        }
      }

      if (!primaryNodeId) {
        const firstScope = scope.scopes[0];
        primaryNodeId = firstScope?.nodeId ?? null;
      }

      const normalizedTopic = topic.toLowerCase().trim();
      const sensitive = isSensitiveTopic(topic);

      res.status(201).json({ accepted: true });

      db.insert(topicEngagement)
        .values({
          userId: user_id,
          topic: normalizedTopic,
          topicType: topic_type,
          contentId: content_id ?? null,
          durationSec: duration_sec ?? 0,
          isSensitive: sensitive,
          hierarchyNodeId: primaryNodeId,
        })
        .then(() => {})
        .catch((err) => {
          console.error("[Engagement] Async write failed:", err);
        });
    } catch (err) {
      console.error("[Engagement] Endpoint error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

const VALID_TIME_RANGES = ["this_week", "this_month", "this_quarter"] as const;
type TimeRange = (typeof VALID_TIME_RANGES)[number];

const TIER_NAMES: Record<number, string> = {
  1: "general_conference",
  2: "division",
  3: "union",
  4: "conference",
  5: "conference",
  6: "local_church",
  7: "local_church",
};

async function getDemoScope(): Promise<MergedHierarchyScope | null> {
  const demoGc = await db.select({ id: churchHierarchy.id, path: churchHierarchy.path, tier: churchHierarchy.tier })
    .from(churchHierarchy)
    .where(eq(churchHierarchy.id, "demo-gc"))
    .limit(1);

  if (demoGc.length === 0) return null;

  const descendants = await db.select({ id: churchHierarchy.id })
    .from(churchHierarchy)
    .where(sql`${churchHierarchy.path} LIKE ${demoGc[0].path + "%"}`);

  return {
    scopes: [{
      nodeId: "demo-gc",
      tier: 1,
      role: "gc_admin",
      descendantNodeIds: descendants.map(d => d.id),
    }],
    allNodeIds: descendants.map(d => d.id),
    highestTier: 1,
    highestRole: "gc_admin",
  };
}

function getISOWeekStart(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

function getTimeRangeStart(range: TimeRange): string {
  const now = new Date();
  if (range === "this_week") return getISOWeekStart(now);
  if (range === "this_month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const qMonth = Math.floor(now.getMonth() / 3) * 3;
  return `${now.getFullYear()}-${String(qMonth + 1).padStart(2, "0")}-01`;
}

function emptyDashboard(tier: string, timeRange: string) {
  const base = { cache_status: "building" as const, time_range: timeRange, tier };
  if (tier === "local_church") {
    return {
      ...base,
      active_member_count: 0,
      average_engagement_pct: 0,
      content_views: 0,
      active_pastoral_alerts: 0,
      top_five_topics: [],
      activity_pattern: [],
    };
  }
  if (tier === "conference") {
    return {
      ...base,
      active_church_count: 0,
      aggregate_engagement_pct: 0,
      church_ranking: [],
      pastoral_alert_summary: { HIGH: 0, MODERATE: 0, INFO: 0 },
    };
  }
  const rankKey =
    tier === "union" ? "conference_ranking" :
    tier === "division" ? "union_ranking" :
    "division_ranking";
  const resp: Record<string, unknown> = {
    ...base,
    [rankKey]: [],
  };
  if (tier === "general_conference") {
    resp.geographic_heatmap = [];
    resp.church_markers = [];
    resp.global_topic_trends = [];
  }
  return resp;
}

async function buildPastorDashboard(
  scope: { scopes: Array<{ nodeId: string; descendantNodeIds: string[] }>; allNodeIds: string[] },
  timeRange: TimeRange,
  rangeStart: string,
) {
  const primaryScope = scope.scopes[0];
  const nodeId = primaryScope.nodeId;

  const cached = await db
    .select()
    .from(analyticsCache)
    .where(
      and(
        eq(analyticsCache.hierarchyNodeId, nodeId),
        eq(analyticsCache.cacheType, "dashboard"),
      )
    )
    .limit(1);

  const cacheData = (cached[0]?.data ?? {}) as Record<string, unknown>;

  const alertCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pastoralCareAlert)
    .where(
      and(
        eq(pastoralCareAlert.hierarchyNodeId, nodeId),
        eq(pastoralCareAlert.isReviewed, false),
      )
    );

  const topTopics = await db
    .select({
      topic: topicTrend.topic,
      views: topicTrend.currentWeekViews,
      trend_direction: topicTrend.trendDirection,
      trend_percent: topicTrend.trendPercent,
      topic_type: topicTrend.topicType,
    })
    .from(topicTrend)
    .where(eq(topicTrend.hierarchyNodeId, nodeId))
    .orderBy(desc(topicTrend.currentWeekViews))
    .limit(5);

  const activityGrid = await db
    .select({
      day_of_week: activityPatternTile.dayOfWeek,
      time_block: activityPatternTile.timeBlock,
      engagement_score: activityPatternTile.engagementScore,
      engagement_count: activityPatternTile.engagementCount,
    })
    .from(activityPatternTile)
    .where(eq(activityPatternTile.hierarchyNodeId, nodeId));

  return {
    cache_status: cached[0] ? "fresh" : "building",
    time_range: timeRange,
    tier: "local_church",
    active_member_count: (cacheData.active_users as number) ?? 0,
    average_engagement_pct: (() => {
      const unique = (cacheData.active_users as number) ?? 0;
      const total = (cacheData.total_member_count as number) || unique || 1;
      return Math.min(Math.round((unique / total) * 1000) / 10, 100);
    })(),
    content_views: (cacheData.total_engagements as number) ?? 0,
    active_pastoral_alerts: alertCount[0]?.count ?? 0,
    top_five_topics: topTopics.map((t) => ({
      topic: t.topic,
      views: t.views,
      trend_direction: t.trend_direction,
      trend_percent: t.trend_percent,
      topic_type: t.topic_type,
    })),
    activity_pattern: activityGrid.map((g) => ({
      day_of_week: g.day_of_week,
      time_block: g.time_block,
      engagement_score: g.engagement_score,
      engagement_count: g.engagement_count,
    })),
  };
}

async function buildConferenceDashboard(
  scope: { scopes: Array<{ nodeId: string; descendantNodeIds: string[] }>; allNodeIds: string[] },
  timeRange: TimeRange,
) {
  const primaryScope = scope.scopes[0];
  const nodeId = primaryScope.nodeId;
  const descendantIds = primaryScope.descendantNodeIds;

  const childChurches = await db
    .select({
      id: churchHierarchy.id,
      name: churchHierarchy.name,
      tier: churchHierarchy.tier,
    })
    .from(churchHierarchy)
    .where(
      and(
        inArray(churchHierarchy.id, descendantIds.length > 0 ? descendantIds : [nodeId]),
        eq(churchHierarchy.tier, 7),
      )
    );

  const churchIds = childChurches.map((c) => c.id);

  let churchRanking: Array<{
    id: string;
    church_name: string;
    member_count: number;
    engagement_rate: number;
    trend_direction: string;
  }> = [];

  if (churchIds.length > 0) {
    const churchStats = await db.execute(sql`
      SELECT
        ch.id,
        ch.name AS church_name,
        COALESCE((ac.data->>'active_users')::int, 0) AS member_count,
        COALESCE((ac.data->>'total_engagements')::int, 0) AS engagement_count
      FROM church_hierarchy ch
      LEFT JOIN analytics_cache ac ON ac.hierarchy_node_id = ch.id AND ac.cache_type = 'dashboard'
      WHERE ch.id = ANY(${sqlArray(churchIds)})
      ORDER BY engagement_count DESC
    `);

    churchRanking = (churchStats.rows as Array<{
      id: string;
      church_name: string;
      member_count: number;
      engagement_count: number;
    }>).map((r) => ({
      id: r.id,
      church_name: r.church_name,
      member_count: r.member_count ?? 0,
      engagement_rate: r.member_count > 0
        ? Math.min(Math.round((r.engagement_count / r.member_count) * 1000) / 10, 100)
        : 0,
      trend_direction: "stable",
    }));
  }

  let aggregateEngagement = 0;
  if (descendantIds.length > 0) {
    const agg = await db.execute(sql`
      SELECT COALESCE(SUM((data->>'total_engagements')::int), 0)::int AS total
      FROM analytics_cache
      WHERE hierarchy_node_id = ANY(${sqlArray(descendantIds)})
        AND cache_type = 'dashboard'
    `);
    aggregateEngagement = (agg.rows[0] as { total: number })?.total ?? 0;
  }

  const alertSummary = await db.execute(sql`
    SELECT
      severity,
      count(*)::int AS count
    FROM pastoral_care_alert
    WHERE hierarchy_node_id = ANY(${sqlArray(descendantIds.length > 0 ? descendantIds : [nodeId])})
      AND is_reviewed = false
    GROUP BY severity
  `);

  const alertMap: Record<string, number> = { HIGH: 0, MODERATE: 0, INFO: 0 };
  for (const row of alertSummary.rows as Array<{ severity: string; count: number }>) {
    alertMap[row.severity] = row.count;
  }

  const confNodeRow = await db.select({ name: churchHierarchy.name }).from(churchHierarchy).where(eq(churchHierarchy.id, nodeId)).limit(1);

  return {
    cache_status: "fresh",
    time_range: timeRange,
    tier: "conference",
    node_id: nodeId,
    node_name: confNodeRow[0]?.name ?? nodeId,
    active_church_count: churchIds.length,
    aggregate_engagement_pct: aggregateEngagement,
    church_ranking: churchRanking,
    pastoral_alert_summary: alertMap,
  };
}

async function buildUpperTierDashboard(
  scope: { scopes: Array<{ nodeId: string; tier: number; descendantNodeIds: string[] }>; allNodeIds: string[]; highestTier: number },
  timeRange: TimeRange,
) {
  const primaryScope = scope.scopes[0];
  const nodeId = primaryScope.nodeId;
  const descendantIds = primaryScope.descendantNodeIds;
  const tier = primaryScope.tier;

  const tierName = TIER_NAMES[tier] ?? "general_conference";

  let childTier: number;
  let rankKey: string;
  if (tier <= 1) {
    childTier = 2;
    rankKey = "division_ranking";
  } else if (tier === 2) {
    childTier = 3;
    rankKey = "union_ranking";
  } else {
    childTier = 4;
    rankKey = "conference_ranking";
  }

  const childNodes = await db
    .select({
      id: churchHierarchy.id,
      name: churchHierarchy.name,
    })
    .from(churchHierarchy)
    .where(
      and(
        inArray(churchHierarchy.id, descendantIds.length > 0 ? descendantIds : [nodeId]),
        eq(churchHierarchy.tier, childTier),
      )
    );

  let ranking: Array<{
    id: string;
    name: string;
    member_count: number;
    engagement_rate: number;
    trend_direction: string;
  }> = [];

  if (childNodes.length > 0) {
    const childIds = childNodes.map((c) => c.id);
    const childStats = await db.execute(sql`
      SELECT
        ch.id,
        ch.name,
        COALESCE(SUM((ac.data->>'active_users')::int), 0)::int AS member_count,
        COALESCE(SUM((ac.data->>'total_engagements')::int), 0)::int AS engagement_count
      FROM church_hierarchy ch
      LEFT JOIN church_hierarchy descendant ON descendant.path LIKE ch.path || '%'
      LEFT JOIN analytics_cache ac ON ac.hierarchy_node_id = descendant.id AND ac.cache_type = 'dashboard'
      WHERE ch.id = ANY(${sqlArray(childIds)})
      GROUP BY ch.id, ch.name
      ORDER BY engagement_count DESC
    `);

    ranking = (childStats.rows as Array<{
      id: string;
      name: string;
      member_count: number;
      engagement_count: number;
    }>).map((r) => ({
      id: r.id,
      name: r.name,
      member_count: r.member_count ?? 0,
      engagement_rate: r.member_count > 0
        ? Math.min(Math.round((r.engagement_count / r.member_count) * 1000) / 10, 100)
        : 0,
      trend_direction: "stable",
    }));
  }

  const nodeRow = await db.select({ name: churchHierarchy.name }).from(churchHierarchy).where(eq(churchHierarchy.id, nodeId)).limit(1);

  const result: Record<string, unknown> = {
    cache_status: "fresh",
    time_range: timeRange,
    tier: tierName,
    node_id: nodeId,
    node_name: nodeRow[0]?.name ?? nodeId,
    [rankKey]: ranking,
  };

  if (tier <= 1) {
    const heatmapNodeIds = descendantIds.length > 0 ? descendantIds : [nodeId];
    const heatmapData = await db
      .select({
        lat: heatmapTile.latitude,
        lng: heatmapTile.longitude,
        engagement_score: heatmapTile.engagementScore,
      })
      .from(heatmapTile)
      .where(inArray(heatmapTile.hierarchyNodeId, heatmapNodeIds));

    result.geographic_heatmap = heatmapData.map((h) => ({
      lat: h.lat,
      lng: h.lng,
      intensity: Math.round((h.engagement_score / 100) * 100) / 100,
    }));

    const churches = await db
      .select({
        name: sdaChurches.name,
        lat: sdaChurches.lat,
        lng: sdaChurches.lng,
        city: sdaChurches.city,
        country: sdaChurches.country,
        membership_size: sdaChurches.membershipSize,
      })
      .from(sdaChurches)
      .limit(5000);

    result.church_markers = churches.map((c) => ({
      name: c.name,
      lat: parseFloat(c.lat),
      lng: parseFloat(c.lng),
      city: c.city,
      country: c.country,
      membership_size: c.membership_size,
    }));

    const globalTrends = await db
      .select({
        topic: topicTrend.topic,
        views: topicTrend.currentWeekViews,
        trend_direction: topicTrend.trendDirection,
        trend_percent: topicTrend.trendPercent,
        topic_type: topicTrend.topicType,
      })
      .from(topicTrend)
      .orderBy(desc(topicTrend.currentWeekViews))
      .limit(20);

    result.global_topic_trends = globalTrends.map((t) => ({
      topic: t.topic,
      views: t.views,
      trend_direction: t.trend_direction,
      trend_percent: t.trend_percent,
      topic_type: t.topic_type,
    }));
  }

  if (tier === 2) {
    const divHeatmapNodeIds = descendantIds.length > 0 ? descendantIds : [nodeId];
    const heatmapData = await db
      .select({
        lat: heatmapTile.latitude,
        lng: heatmapTile.longitude,
        engagement_score: heatmapTile.engagementScore,
      })
      .from(heatmapTile)
      .where(inArray(heatmapTile.hierarchyNodeId, divHeatmapNodeIds));

    result.geographic_heatmap = heatmapData.map((h) => ({
      lat: h.lat,
      lng: h.lng,
      intensity: Math.round((h.engagement_score / 100) * 100) / 100,
    }));
  }

  return result;
}

router.get(
  "/dashboard",
  requireHierarchyAccess("pastor"),
  async (req: Request, res: Response) => {
    try {
      let scope = req.hierarchyScope!;
      const timeRange = (
        VALID_TIME_RANGES.includes(req.query.time_range as TimeRange)
          ? req.query.time_range
          : "this_week"
      ) as TimeRange;

      if (req.query.demo === "true") {
        const userRow = await db.select({ role: users.role }).from(users).where(eq(users.id, req.authUserId!)).limit(1);
        if (userRow.length > 0 && userRow[0].role === "admin") {
          const demoScope = await getDemoScope();
          if (demoScope) {
            scope = demoScope;
          }
        }
      }

      const tier = scope.highestTier;
      const tierName = TIER_NAMES[tier] ?? "local_church";

      if (tier >= 6) {
        const data = await buildPastorDashboard(scope, timeRange, getTimeRangeStart(timeRange));
        return res.json(data);
      }

      if (tier >= 4) {
        const data = await buildConferenceDashboard(scope, timeRange);
        return res.json(data);
      }

      const data = await buildUpperTierDashboard(scope as any, timeRange);
      return res.json(data);
    } catch (err) {
      console.error("[Dashboard] Endpoint error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/dashboard/drilldown",
  requireHierarchyAccess("pastor"),
  async (req: Request, res: Response) => {
    try {
      const nodeId = req.query.node_id as string;
      if (!nodeId) {
        return res.status(400).json({ error: "node_id is required" });
      }

      const timeRange = (
        VALID_TIME_RANGES.includes(req.query.time_range as TimeRange)
          ? req.query.time_range
          : "this_week"
      ) as TimeRange;

      const isDemoRequest = req.query.demo === "true";
      if (isDemoRequest) {
        const userRow = await db.select({ role: users.role }).from(users).where(eq(users.id, req.authUserId!)).limit(1);
        if (!userRow.length || userRow[0].role !== "admin") {
          return res.status(403).json({ error: "Admin access required for demo drill-down" });
        }
        if (!nodeId.startsWith("demo-")) {
          return res.status(400).json({ error: "Invalid demo node" });
        }
      } else {
        const userScope = req.hierarchyScope;
        if (!userScope || !userScope.allNodeIds.includes(nodeId)) {
          return res.status(403).json({ error: "You do not have access to this node" });
        }
      }

      const nodeRow = await db.select({
        id: churchHierarchy.id,
        name: churchHierarchy.name,
        tier: churchHierarchy.tier,
        path: churchHierarchy.path,
        parentId: churchHierarchy.parentId,
      }).from(churchHierarchy).where(eq(churchHierarchy.id, nodeId)).limit(1);

      if (!nodeRow.length) {
        return res.status(404).json({ error: "Node not found" });
      }

      const node = nodeRow[0];

      const descendants = await db.select({ id: churchHierarchy.id })
        .from(churchHierarchy)
        .where(sql`${churchHierarchy.path} LIKE ${node.path + "%"} AND ${churchHierarchy.id} != ${node.id}`);

      const descendantIds = descendants.map(d => d.id);

      const scope = {
        scopes: [{
          nodeId: node.id,
          tier: node.tier,
          role: "admin",
          descendantNodeIds: descendantIds,
        }],
        allNodeIds: [node.id, ...descendantIds],
        highestTier: node.tier,
      };

      let parentName: string | null = null;
      if (node.parentId) {
        const parentRow = await db.select({ name: churchHierarchy.name }).from(churchHierarchy).where(eq(churchHierarchy.id, node.parentId)).limit(1);
        parentName = parentRow[0]?.name ?? null;
      }

      if (node.tier >= 6) {
        const data = await buildPastorDashboard(scope as any, timeRange, getTimeRangeStart(timeRange));
        return res.json({ ...data, node_id: node.id, node_name: node.name, parent_id: node.parentId, parent_name: parentName });
      }

      if (node.tier >= 4) {
        const data = await buildConferenceDashboard(scope as any, timeRange);
        return res.json({ ...data, node_id: node.id, node_name: node.name, parent_id: node.parentId, parent_name: parentName });
      }

      const data = await buildUpperTierDashboard(scope as any, timeRange);
      return res.json({ ...data, parent_id: node.parentId, parent_name: parentName });
    } catch (err) {
      console.error("[Dashboard Drilldown] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post("/events", (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: "events must be an array" });
    }
    const capped = events.slice(0, 50);
    for (const evt of capped) {
      const props = evt.properties ? ` ${JSON.stringify(evt.properties)}` : "";
      console.log(`[Analytics] ${evt.event}${props} (${evt.platform || "unknown"}, ${new Date(evt.timestamp).toISOString()})`);
    }
    res.json({ received: capped.length });
  } catch (err) {
    console.error("Analytics events error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/error", (req: Request, res: Response) => {
  try {
    const { error, componentStack, timestamp, platform } = req.body;
    console.error(`[CrashReport] ${error} (${platform || "unknown"}, ${new Date(timestamp).toISOString()})`);
    if (componentStack) {
      console.error(`[CrashReport] Stack: ${String(componentStack).substring(0, 500)}`);
    }
    res.json({ reported: true });
  } catch (err) {
    console.error("Analytics error report error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

export { SENSITIVE_TOPICS, isSensitiveTopic, VALID_TOPIC_TYPES };
