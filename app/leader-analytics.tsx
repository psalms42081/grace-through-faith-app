import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import PastoralCareAlertList from "@/components/analytics/PastoralCareAlertList";
import type { PastoralCareAlertProps } from "@/components/analytics/PastoralCareAlertCard";
import TopicTrendingRow from "@/components/analytics/TopicTrendingRow";
import type { TopicTrendingCardProps } from "@/components/analytics/TopicTrendingCard";
import ActivityPatternHeatmap from "@/components/analytics/ActivityPatternHeatmap";
import type { ActivityTile } from "@/components/analytics/ActivityPatternHeatmap";
import GeographicHeatmap from "@/components/analytics/GeographicHeatmap";
import type { HeatmapPoint, ChurchMarker } from "@/components/analytics/GeographicHeatmap";

type TimeRange = "this_week" | "this_month" | "this_quarter";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
};

const TIER_DISPLAY: Record<string, string> = {
  local_church: "Pastor",
  conference: "Conference",
  union: "Union",
  division: "Division",
  general_conference: "General Conference",
};

function capEngagement(rate: number): number {
  return Math.min(Math.max(Math.round(rate * 10) / 10, 0), 100);
}

function SkeletonCard({ width, height }: { width: number | string; height: number }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        backgroundColor: "#1A1610",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(201, 147, 58, 0.15)",
        opacity: pulseAnim,
      }}
    />
  );
}

function SkeletonSection() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      <SkeletonCard width="60%" height={18} />
      <SkeletonCard width="100%" height={120} />
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color="#C9933A" style={{ marginBottom: 8 }} />
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <View style={styles.sectionHeadingWrapper}>
      <Text style={styles.sectionHeading}>{children}</Text>
      <View style={styles.sectionHeadingAccent} />
    </View>
  );
}

interface ChurchRankRow {
  id?: string;
  church_name?: string;
  name?: string;
  member_count: number;
  engagement_rate: number;
  trend_direction: string;
}

function RankingTable({
  title,
  rows,
  nameKey = "church_name",
  onDrillDown,
}: {
  title: string;
  rows: ChurchRankRow[];
  nameKey?: string;
  onDrillDown?: (nodeId: string) => void;
}) {
  const canDrill = !!onDrillDown;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Members</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Engagement</Text>
        <Text style={[styles.tableHeaderText, { width: 36, textAlign: "center" }]}>Trend</Text>
      </View>
      {rows.map((r, i) => {
        const name = (r as any)[nameKey] ?? r.name ?? r.church_name ?? "—";
        const rate = capEngagement(r.engagement_rate);
        const trendIcon: keyof typeof Ionicons.glyphMap =
          r.trend_direction === "rising" ? "arrow-up" :
          r.trend_direction === "falling" ? "arrow-down" : "remove";
        const trendColor =
          r.trend_direction === "rising" ? "#22C55E" :
          r.trend_direction === "falling" ? "#EF8C2C" : "#6B7280";
        const RowWrapper = canDrill && r.id ? TouchableOpacity : View;
        const rowProps = canDrill && r.id ? { onPress: () => onDrillDown!(r.id!), activeOpacity: 0.6 } : {};
        return (
          <RowWrapper key={i} {...(rowProps as any)} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: "#0D0E10" }]}>
            <Text style={[styles.tableCell, { flex: 2, color: canDrill && r.id ? "#C9933A" : "#E5E5E5" }]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{r.member_count}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{rate}%</Text>
            <View style={{ width: 36, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
              <Ionicons name={trendIcon} size={14} color={trendColor} />
              {canDrill && r.id && <Ionicons name="chevron-forward" size={12} color="#6B7280" style={{ marginLeft: 2 }} />}
            </View>
          </RowWrapper>
        );
      })}
      {rows.length === 0 && (
        <Text style={styles.emptyRowText}>No data available yet</Text>
      )}
    </View>
  );
}

function AlertSeveritySummary({ summary }: { summary: Record<string, number> }) {
  const items = [
    { key: "HIGH", label: "High Priority", color: "#EF8C2C", icon: "alert-circle" as const },
    { key: "MODERATE", label: "Moderate", color: "#C9933A", icon: "warning" as const },
    { key: "INFO", label: "Informational", color: "#3B82F6", icon: "information-circle" as const },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Pastoral Alert Summary</Text>
      {items.map((item) => (
        <View key={item.key} style={styles.alertSummaryRow}>
          <Ionicons name={item.icon} size={18} color={item.color} />
          <Text style={styles.alertSummaryLabel}>{item.label}</Text>
          <Text style={[styles.alertSummaryCount, { color: item.color }]}>
            {summary[item.key] ?? 0}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BroadcastList({ broadcasts, showCompose, showReadReceipts }: {
  broadcasts: any[];
  showCompose?: boolean;
  showReadReceipts?: boolean;
}) {
  if (broadcasts.length === 0 && !showCompose) return null;

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Text style={styles.cardTitle}>Broadcasts</Text>
        {showCompose && (
          <TouchableOpacity style={styles.composeButton} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={16} color="#C9933A" />
            <Text style={styles.composeButtonText}>Compose</Text>
          </TouchableOpacity>
        )}
      </View>
      {broadcasts.length === 0 ? (
        <Text style={styles.emptyRowText}>No broadcasts yet</Text>
      ) : (
        broadcasts.slice(0, 5).map((b: any, i: number) => (
          <View
            key={i}
            style={[
              styles.broadcastRow,
              b.unread && { borderLeftWidth: 3, borderLeftColor: "#C9933A", paddingLeft: 12 },
            ]}
          >
            <Text style={styles.broadcastTitle} numberOfLines={1}>{b.title ?? "Broadcast"}</Text>
            <Text style={styles.broadcastDate}>{b.date ?? ""}</Text>
            {showReadReceipts && b.read_count != null && (
              <Text style={styles.broadcastReceipt}>{b.read_count} read</Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}

function AgeGroupChart({ groups }: { groups: Array<{ name: string; count: number }> }) {
  const validGroups = groups.filter((g) => g.count >= 10);
  if (validGroups.length === 0) return null;

  const maxCount = Math.max(...validGroups.map((g) => g.count));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Age Group Breakdown</Text>
      {validGroups.map((g, i) => (
        <View key={i} style={styles.ageBarRow}>
          <Text style={styles.ageBarLabel}>{g.name}</Text>
          <View style={styles.ageBarTrack}>
            <View style={[styles.ageBarFill, { width: `${(g.count / maxCount) * 100}%` as any }]} />
          </View>
          <Text style={styles.ageBarCount}>{g.count}</Text>
        </View>
      ))}
    </View>
  );
}

function PastorView({ data }: { data: any }) {
  const alertsMapped: PastoralCareAlertProps[] = (data.pastoral_alerts ?? []).map((a: any) => ({
    alert_type: a.alert_type ?? "congregational",
    topic: a.topic,
    severity: a.severity,
    actual_count: a.actual_count ?? 0,
    created_at: a.created_at ?? new Date().toISOString(),
    opted_in_members: a.opted_in_members,
    status: a.status ?? "active",
    onMarkReviewed: () => {},
    onAssignToElder: () => {},
  }));

  const topicsMapped: TopicTrendingCardProps[] = (data.top_five_topics ?? []).map((t: any) => ({
    topic: t.topic,
    topic_type: t.topic_type ?? "essentials",
    trend_direction: t.trend_direction ?? "stable",
    trend_percent: t.trend_percent ?? 0,
    views: t.views ?? 0,
    completion_rate: t.completion_rate,
    top_age_group: t.top_age_group,
    top_age_group_count: t.top_age_group_count,
  }));

  const activityTiles: ActivityTile[] = (data.activity_pattern ?? []).map((t: any) => ({
    day_of_week: t.day_of_week,
    time_block: t.time_block,
    engagement_score: t.engagement_score,
  }));

  const alertCount = data.active_pastoral_alerts ?? 0;

  return (
    <>
      <View style={styles.summaryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
          <StatCard icon="people" label="Active Members" value={data.active_member_count ?? 0} />
          <StatCard icon="pulse" label="Avg Engagement" value={`${capEngagement(data.average_engagement_pct ?? 0)}%`} />
          <StatCard icon="play-circle" label="Content Views" value={data.content_views ?? 0} />
          <StatCard
            icon="heart"
            label="Pastoral Alerts"
            value={alertCount}
            valueColor={alertCount > 0 ? "#EF8C2C" : "#C9933A"}
          />
        </ScrollView>
      </View>

      {alertsMapped.length > 0 && (
        <View style={styles.section}>
          <SectionHeading>Pastoral Care</SectionHeading>
          <View style={{ paddingHorizontal: 16 }}>
            <PastoralCareAlertList alerts={alertsMapped} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeading>What Your Church Is Watching</SectionHeading>
        <TopicTrendingRow topics={topicsMapped} />
      </View>

      <View style={styles.section}>
        <SectionHeading>Weekly Activity Pattern</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <ActivityPatternHeatmap
            tiles={activityTiles}
            node_user_count={data.active_member_count ?? 0}
          />
        </View>
      </View>

      {data.age_groups && (
        <View style={styles.section}>
          <SectionHeading>Age Group Breakdown</SectionHeading>
          <View style={{ paddingHorizontal: 16 }}>
            <AgeGroupChart groups={data.age_groups ?? []} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeading>Broadcasts</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <BroadcastList broadcasts={data.broadcasts ?? []} />
        </View>
      </View>
    </>
  );
}

function ConferenceView({ data, onDrillDown }: { data: any; onDrillDown?: (nodeId: string) => void }) {
  const totalMembers = (data.church_ranking ?? []).reduce(
    (sum: number, r: any) => sum + (r.member_count ?? 0), 0
  );

  const topicsMapped: TopicTrendingCardProps[] = (data.topic_trends ?? []).map((t: any) => ({
    topic: t.topic,
    topic_type: t.topic_type ?? "essentials",
    trend_direction: t.trend_direction ?? "stable",
    trend_percent: t.trend_percent ?? 0,
    views: t.views ?? 0,
  }));

  const activityTiles: ActivityTile[] = (data.activity_pattern ?? []).map((t: any) => ({
    day_of_week: t.day_of_week,
    time_block: t.time_block,
    engagement_score: t.engagement_score,
  }));

  const alertTotal =
    (data.pastoral_alert_summary?.HIGH ?? 0) +
    (data.pastoral_alert_summary?.MODERATE ?? 0) +
    (data.pastoral_alert_summary?.INFO ?? 0);

  return (
    <>
      <View style={styles.summaryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
          <StatCard icon="business" label="Active Churches" value={data.active_church_count ?? 0} />
          <StatCard icon="people" label="Total Members" value={totalMembers} />
          <StatCard icon="pulse" label="Avg Engagement" value={`${capEngagement(data.aggregate_engagement_pct ?? 0)}%`} />
          <StatCard icon="heart" label="Alert Summary" value={alertTotal} valueColor={alertTotal > 0 ? "#EF8C2C" : "#C9933A"} />
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeading>Church Rankings</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <RankingTable title="Church Rankings" rows={data.church_ranking ?? []} nameKey="church_name" onDrillDown={onDrillDown} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading>Pastoral Alert Summary</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <AlertSeveritySummary summary={data.pastoral_alert_summary ?? {}} />
        </View>
      </View>

      {topicsMapped.length > 0 && (
        <View style={styles.section}>
          <SectionHeading>Topic Trends</SectionHeading>
          <TopicTrendingRow topics={topicsMapped} />
        </View>
      )}

      <View style={styles.section}>
        <SectionHeading>Weekly Activity Pattern</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <ActivityPatternHeatmap
            tiles={activityTiles}
            node_user_count={totalMembers}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading>Broadcasts</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <BroadcastList broadcasts={data.broadcasts ?? []} showCompose />
        </View>
      </View>
    </>
  );
}

function UnionDivisionView({ data, tier, onDrillDown }: { data: any; tier: string; onDrillDown?: (nodeId: string) => void }) {
  const [topicFilter, setTopicFilter] = useState<string | undefined>(undefined);

  const rankKey = tier === "union" ? "union_ranking" : "conference_ranking";
  const rankTitle = tier === "union" ? "Conference Rankings" : "Union Rankings";
  const ranking = data[rankKey] ?? data.division_ranking ?? [];
  const isDivision = tier === "division";

  const totalMembers = ranking.reduce(
    (sum: number, r: any) => sum + (r.member_count ?? 0), 0
  );

  const activityTiles: ActivityTile[] = (data.activity_pattern ?? []).map((t: any) => ({
    day_of_week: t.day_of_week,
    time_block: t.time_block,
    engagement_score: t.engagement_score,
  }));

  const topicsMapped: TopicTrendingCardProps[] = (data.topic_trends ?? data.global_topic_trends ?? []).map((t: any) => ({
    topic: t.topic,
    topic_type: t.topic_type ?? "essentials",
    trend_direction: t.trend_direction ?? "stable",
    trend_percent: t.trend_percent ?? 0,
    views: t.views ?? 0,
  }));

  const heatmapPoints: HeatmapPoint[] = (data.geographic_heatmap ?? []).map((h: any) => ({
    lat: h.lat,
    lng: h.lng,
    intensity: h.intensity,
  }));

  const churchMarkers: ChurchMarker[] = (data.church_markers ?? []).map((m: any) => ({
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    member_count: m.membership_size ?? m.member_count,
  }));

  return (
    <>
      <View style={styles.summaryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
          <StatCard icon="business" label={tier === "union" ? "Conferences" : "Unions"} value={ranking.length} />
          <StatCard icon="people" label="Total Members" value={totalMembers} />
          <StatCard icon="pulse" label="Avg Engagement" value={`${capEngagement(data.aggregate_engagement_pct ?? 0)}%`} />
          <StatCard icon="heart" label="Active Alerts" value={data.alert_count ?? 0} />
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeading>{rankTitle}</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <RankingTable title={rankTitle} rows={ranking} nameKey="name" onDrillDown={onDrillDown} />
        </View>
      </View>

      {isDivision && (heatmapPoints.length > 0 || churchMarkers.length > 0) && (
        <View style={styles.section}>
          <SectionHeading>Geographic Engagement</SectionHeading>
          <View style={{ paddingHorizontal: 16 }}>
            <GeographicHeatmap
              heatmap_points={heatmapPoints}
              church_markers={churchMarkers}
              selected_topic={topicFilter}
              on_topic_change={setTopicFilter}
            />
          </View>
        </View>
      )}

      {topicsMapped.length > 0 && (
        <View style={styles.section}>
          <SectionHeading>Topic Trends</SectionHeading>
          <TopicTrendingRow topics={topicsMapped} />
        </View>
      )}

      <View style={styles.section}>
        <SectionHeading>Weekly Activity Pattern</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <ActivityPatternHeatmap
            tiles={activityTiles}
            node_user_count={totalMembers}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading>Broadcasts</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <BroadcastList broadcasts={data.broadcasts ?? []} showCompose />
        </View>
      </View>
    </>
  );
}

function GCView({ data, onDrillDown }: { data: any; onDrillDown?: (nodeId: string) => void }) {
  const [topicFilter, setTopicFilter] = useState<string | undefined>(undefined);
  const divisionRanking = data.division_ranking ?? [];

  const totalMembers = divisionRanking.reduce(
    (sum: number, r: any) => sum + (r.member_count ?? 0), 0
  );
  const totalDivisions = divisionRanking.length;

  const topicsMapped: TopicTrendingCardProps[] = (data.global_topic_trends ?? []).map((t: any) => ({
    topic: t.topic,
    topic_type: t.topic_type ?? "essentials",
    trend_direction: t.trend_direction ?? "stable",
    trend_percent: t.trend_percent ?? 0,
    views: t.views ?? 0,
  }));

  const heatmapPoints: HeatmapPoint[] = (data.geographic_heatmap ?? []).map((h: any) => ({
    lat: h.lat,
    lng: h.lng,
    intensity: h.intensity,
  }));

  const churchMarkers: ChurchMarker[] = (data.church_markers ?? []).map((m: any) => ({
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    member_count: m.membership_size ?? m.member_count,
  }));

  const alertTotal =
    (data.alert_summary?.HIGH ?? 0) +
    (data.alert_summary?.MODERATE ?? 0) +
    (data.alert_summary?.INFO ?? 0);

  const availableTopics = topicsMapped.map((t) => t.topic);

  return (
    <>
      <View style={styles.summaryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
          <StatCard icon="globe" label="Divisions" value={totalDivisions} />
          <StatCard icon="people" label="Total Members" value={totalMembers} />
          <StatCard icon="pulse" label="Global Engagement" value={`${capEngagement(data.global_engagement_pct ?? 0)}%`} />
          <StatCard icon="heart" label="Active Alerts" value={alertTotal} valueColor={alertTotal > 0 ? "#EF8C2C" : "#C9933A"} />
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeading>Division Rankings</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <RankingTable title="Division Rankings" rows={divisionRanking} nameKey="name" onDrillDown={onDrillDown} />
        </View>
      </View>

      {(heatmapPoints.length > 0 || churchMarkers.length > 0) && (
        <View style={styles.section}>
          <SectionHeading>Geographic Engagement</SectionHeading>
          <View style={{ paddingHorizontal: 16 }}>
            {availableTopics.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8 }}
              >
                <TouchableOpacity
                  style={[styles.filterPill, !topicFilter && styles.filterPillActive]}
                  onPress={() => setTopicFilter(undefined)}
                >
                  <Text style={[styles.filterPillText, !topicFilter && styles.filterPillTextActive]}>
                    All Topics
                  </Text>
                </TouchableOpacity>
                {availableTopics.slice(0, 8).map((topic) => (
                  <TouchableOpacity
                    key={topic}
                    style={[styles.filterPill, topicFilter === topic && styles.filterPillActive]}
                    onPress={() => setTopicFilter(topicFilter === topic ? undefined : topic)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        topicFilter === topic && styles.filterPillTextActive,
                      ]}
                    >
                      {topic.charAt(0).toUpperCase() + topic.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <GeographicHeatmap
              heatmap_points={heatmapPoints}
              church_markers={churchMarkers}
              selected_topic={topicFilter}
              on_topic_change={setTopicFilter}
            />
          </View>
        </View>
      )}

      {topicsMapped.length > 0 && (
        <View style={styles.section}>
          <SectionHeading>Global Topic Trends</SectionHeading>
          <TopicTrendingRow topics={topicsMapped} heading="Global Topic Trends (Top 20)" />
        </View>
      )}

      <View style={styles.section}>
        <SectionHeading>Broadcasts</SectionHeading>
        <View style={{ paddingHorizontal: 16 }}>
          <BroadcastList broadcasts={data.broadcasts ?? []} showCompose showReadReceipts />
        </View>
      </View>
    </>
  );
}

function BuildingState() {
  return (
    <View style={{ paddingTop: 16, gap: 20 }}>
      <View style={styles.summaryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
          <SkeletonCard width={120} height={100} />
          <SkeletonCard width={120} height={100} />
          <SkeletonCard width={120} height={100} />
          <SkeletonCard width={120} height={100} />
        </ScrollView>
      </View>
      <SkeletonSection />
      <SkeletonSection />
      <SkeletonSection />
    </View>
  );
}

function NoMembershipState() {
  return (
    <View style={styles.centeredState}>
      <Ionicons name="people-outline" size={48} color="#C9933A" />
      <Text style={styles.centeredTitle}>Your church account is being set up</Text>
      <Text style={styles.centeredSubtext}>
        Contact your pastor or church administrator to be added to your church.
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centeredState}>
      <Ionicons name="time-outline" size={48} color="#C9933A" />
      <Text style={styles.centeredTitle}>This data is being prepared</Text>
      <Text style={styles.centeredSubtext}>Please check back shortly</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
        <Ionicons name="refresh" size={18} color="#050507" />
        <Text style={styles.retryButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

interface DrillDownEntry {
  nodeId: string;
  nodeName: string;
}

export default function LeaderAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<TimeRange>("this_week");
  const [refreshing, setRefreshing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [drillStack, setDrillStack] = useState<DrillDownEntry[]>([]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isDrilledDown = drillStack.length > 0;
  const currentDrill = isDrilledDown ? drillStack[drillStack.length - 1] : null;

  const { data: demoStatus } = useQuery<{ demo_data_loaded: boolean }>({
    queryKey: ["/api/demo/status"],
  });

  const demoAvailable = demoStatus?.demo_data_loaded ?? false;

  useEffect(() => {
    if (demoAvailable && !demoMode) {
      setDemoMode(true);
    }
  }, [demoAvailable]);

  const demoParam = demoMode && demoAvailable ? "&demo=true" : "";

  const dashboardPath = isDrilledDown
    ? `/api/analytics/dashboard/drilldown?node_id=${encodeURIComponent(currentDrill!.nodeId)}&time_range=${timeRange}${demoParam}`
    : `/api/analytics/dashboard?time_range=${timeRange}${demoParam}`;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [dashboardPath],
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes("/api/analytics/dashboard") });
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetch]);

  const handleDrillDown = useCallback((nodeId: string) => {
    const dashData = data as any;
    const allRanks = [
      ...(dashData?.division_ranking ?? []),
      ...(dashData?.union_ranking ?? []),
      ...(dashData?.conference_ranking ?? []),
      ...(dashData?.church_ranking ?? []),
    ];
    const match = allRanks.find((r: any) => r.id === nodeId);
    const nodeName = match?.name ?? match?.church_name ?? nodeId;
    setDrillStack((prev) => [...prev, { nodeId, nodeName }]);
  }, [data]);

  const router = useRouter();

  const handleBack = useCallback(() => {
    if (drillStack.length > 0) {
      setDrillStack((prev) => prev.slice(0, -1));
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [drillStack, router]);

  const dashboardData = data as any;
  const tier = dashboardData?.tier;
  const jurisdictionName = dashboardData?.jurisdiction_name ?? dashboardData?.node_name;
  const cacheStatus = dashboardData?.cache_status;
  const isBuilding = cacheStatus === "building" && !isLoading;
  const hasNoMembership = isError && (error?.message?.includes("403") || error?.message?.includes("hierarchy"));

  const tierBadgeLabel = (() => {
    if (!tier) return "";
    const display = TIER_DISPLAY[tier] ?? tier;
    if (jurisdictionName) return `${display} · ${jurisdictionName}`;
    if (tier === "general_conference") return "General Conference · Global";
    return display;
  })();

  const renderContent = () => {
    if (isLoading) {
      return <BuildingState />;
    }

    if (hasNoMembership) {
      return <NoMembershipState />;
    }

    if (isError) {
      return <ErrorState onRetry={onRefresh} />;
    }

    if (isBuilding) {
      return <BuildingState />;
    }

    if (tier === "local_church") return <PastorView data={dashboardData} />;
    if (tier === "conference") return <ConferenceView data={dashboardData} onDrillDown={handleDrillDown} />;
    if (tier === "union" || tier === "division") return <UnionDivisionView data={dashboardData} tier={tier} onDrillDown={handleDrillDown} />;
    if (tier === "general_conference") return <GCView data={dashboardData} onDrillDown={handleDrillDown} />;

    return <NoMembershipState />;
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === "web" && { paddingBottom: 34 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C9933A"
              colors={["#C9933A"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.header, Platform.OS === "web" && { paddingTop: webTopInset }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color="#C9933A" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Analytics</Text>
            </View>
          </View>

          {isDrilledDown && (
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity onPress={() => setDrillStack([])} activeOpacity={0.6}>
                <Text style={styles.breadcrumbLink}>Overview</Text>
              </TouchableOpacity>
              {drillStack.map((entry, i) => (
                <React.Fragment key={entry.nodeId}>
                  <Ionicons name="chevron-forward" size={12} color="#6B7280" style={{ marginHorizontal: 4 }} />
                  {i < drillStack.length - 1 ? (
                    <TouchableOpacity onPress={() => setDrillStack((prev) => prev.slice(0, i + 1))} activeOpacity={0.6}>
                      <Text style={styles.breadcrumbLink}>{entry.nodeName}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.breadcrumbCurrent} numberOfLines={1}>{entry.nodeName}</Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          )}

          {tierBadgeLabel.length > 0 && (
            <View style={styles.tierBadgeRow}>
              <View style={styles.tierBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#C9933A" />
                <Text style={styles.tierBadgeText}>{tierBadgeLabel}</Text>
              </View>
              {demoMode && demoAvailable && (
                <View style={[styles.tierBadge, { backgroundColor: "rgba(34, 197, 94, 0.15)", marginLeft: 8 }]}>
                  <Ionicons name="flask" size={14} color="#22C55E" />
                  <Text style={[styles.tierBadgeText, { color: "#22C55E" }]}>Demo Mode</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.timeRangeRow}>
            {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={styles.timePillWrapper}
                onPress={() => setTimeRange(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.timePillText, timeRange === key && styles.timePillTextActive]}>
                  {label}
                </Text>
                {timeRange === key && <View style={styles.timeUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050507",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#050507",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201, 147, 58, 0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: "#F5F5F0",
  },
  breadcrumbRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexWrap: "wrap" as const,
  },
  breadcrumbLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#C9933A",
  },
  breadcrumbCurrent: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#E5E5E5",
    maxWidth: 180,
  },
  tierBadgeRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#141518",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#C9933A",
  },
  tierBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#F5F5F0",
  },
  timeRangeRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 20,
    marginBottom: 20,
  },
  timePillWrapper: {
    alignItems: "center",
    paddingBottom: 6,
  },
  timePillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#6B7280",
  },
  timePillTextActive: {
    color: "#F5F5F0",
  },
  timeUnderline: {
    marginTop: 4,
    width: "100%" as any,
    height: 2,
    backgroundColor: "#C9933A",
    borderRadius: 1,
  },
  summaryRow: {
    marginBottom: 4,
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    width: 120,
    backgroundColor: "#141518",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1F24",
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#F5F5F0",
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    marginTop: 20,
  },
  sectionHeadingWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#F5F5F0",
    marginBottom: 4,
  },
  sectionHeadingAccent: {
    width: 32,
    height: 2,
    backgroundColor: "#C9933A",
    borderRadius: 1,
  },
  card: {
    backgroundColor: "#141518",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1F24",
    padding: 16,
  },
  cardTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    color: "#C9933A",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F24",
    marginBottom: 4,
  },
  tableHeaderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  tableCell: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#E8E9ED",
  },
  emptyRowText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 20,
  },
  alertSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F24",
    gap: 10,
  },
  alertSummaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#E8E9ED",
    flex: 1,
  },
  alertSummaryCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E1F24",
    backgroundColor: "#141518",
  },
  filterPillActive: {
    backgroundColor: "#C9933A",
    borderColor: "#C9933A",
  },
  filterPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#050507",
  },
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 14,
  },
  centeredTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 18,
    color: "#C9933A",
    textAlign: "center",
  },
  centeredSubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C9933A",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#050507",
  },
  composeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C9933A",
  },
  composeButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#C9933A",
  },
  broadcastRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1F24",
  },
  broadcastTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#E8E9ED",
    marginBottom: 2,
  },
  broadcastDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#6B7280",
  },
  broadcastReceipt: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#C9933A",
    marginTop: 2,
  },
  ageBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  ageBarLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#E8E9ED",
    width: 60,
  },
  ageBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#1E1F24",
    borderRadius: 6,
    overflow: "hidden",
  },
  ageBarFill: {
    height: "100%" as any,
    backgroundColor: "#C9933A",
    borderRadius: 6,
  },
  ageBarCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#6B7280",
    width: 36,
    textAlign: "right",
  },
});
