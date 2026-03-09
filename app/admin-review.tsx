import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

interface PipelineOverview {
  sourcePackets: { byStatus: Record<string, number>; total: number };
  companions: {
    byGenerationStatus: Record<string, number>;
    byReviewStatus: Record<string, number>;
    total: number;
  };
  coverage: { totalLessons: number; lessonsWithCompanions: number; coveragePercent: number };
  promptVersionDistribution: Record<string, number>;
  failedGenerations: Array<{ id: string; title: string; updatedAt: string }>;
  pendingReview: Array<{
    id: string;
    title: string;
    slug: string;
    generationStatus: string;
    reviewStatus: string;
    promptVersion: string;
    createdAt: string;
  }>;
}

interface QuarterInfo {
  id: string;
  quarterCode: string;
  title: string;
  lessonCount: number;
  companionCount: number;
}

interface QuarterDetail {
  quarter: { id: string; code: string; title: string; humanDate: string };
  summary: {
    totalLessons: number;
    packetsBuilt: number;
    companionsGenerated: number;
    published: number;
    pendingReview: number;
    failed: number;
  };
  lessons: Array<{
    lessonId: string;
    lessonNumber: number;
    title: string;
    packet: { id: string; status: string; hash: string; updatedAt: string } | null;
    companion: {
      id: string;
      slug: string;
      status: string;
      generationStatus: string;
      reviewStatus: string;
      promptVersion: string;
      createdAt: string;
      publishedAt: string | null;
    } | null;
  }>;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status, type }: { status: string; type: "generation" | "review" | "resource" }) {
  const colorMap: Record<string, string> = {
    completed: "#10B981",
    approved: "#10B981",
    published: "#10B981",
    pending: "#F59E0B",
    draft: "#6B7280",
    failed: "#EF4444",
    rejected: "#EF4444",
    needs_revision: "#F97316",
    generating: "#3B82F6",
    regenerating: "#8B5CF6",
  };
  const bg = colorMap[status] || "#6B7280";
  return (
    <View style={[styles.badge, { backgroundColor: bg + "20", borderColor: bg }]}>
      <Text style={[styles.badgeText, { color: bg }]}>{status}</Text>
    </View>
  );
}

export default function AdminReviewScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "quarter" | "pending">("overview");

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor" || isAdmin;

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<PipelineOverview>({
    queryKey: ["/api/admin/pipeline/overview"],
    enabled: isEditor,
  });

  const { data: quarters, isLoading: quartersLoading } = useQuery<QuarterInfo[]>({
    queryKey: ["/api/admin/pipeline/quarters"],
    enabled: isEditor,
  });

  const { data: quarterDetail, isLoading: quarterLoading } = useQuery<QuarterDetail>({
    queryKey: ["/api/admin/pipeline/quarter", selectedQuarter],
    enabled: !!selectedQuarter && isEditor,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const url = new URL(`/api/resources/${id}/review`, getApiUrl());
      return apiRequest(url.toString(), { method: "POST", body: JSON.stringify({ action }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline/overview"] });
      if (selectedQuarter) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/pipeline/quarter", selectedQuarter] });
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (quarterCode: string) => {
      const url = new URL("/api/admin/pipeline/generate-quarter", getApiUrl());
      return apiRequest(url.toString(), {
        method: "POST",
        body: JSON.stringify({ quarterCode }),
      });
    },
  });

  const handleReview = useCallback((id: string, action: string, title: string) => {
    const actionLabel = action === "approved" ? "Approve & Publish" : action === "rejected" ? "Reject" : "Request Revision";
    if (Platform.OS === "web") {
      if (confirm(`${actionLabel}: "${title}"?`)) {
        reviewMutation.mutate({ id, action });
      }
    } else {
      Alert.alert(actionLabel, `"${title}"`, [
        { text: "Cancel", style: "cancel" },
        { text: actionLabel, onPress: () => reviewMutation.mutate({ id, action }), style: action === "rejected" ? "destructive" : "default" },
      ]);
    }
  }, [reviewMutation]);

  const handleGenerate = useCallback((quarterCode: string) => {
    if (Platform.OS === "web") {
      if (confirm(`Generate all companions for ${quarterCode}? This may take several minutes.`)) {
        generateMutation.mutate(quarterCode);
      }
    } else {
      Alert.alert("Generate Quarter", `Generate all companions for ${quarterCode}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: () => generateMutation.mutate(quarterCode) },
      ]);
    }
  }, [generateMutation]);

  if (!isEditor) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: "Access Denied", headerShown: true }} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Editor or admin access required
          </Text>
        </View>
      </View>
    );
  }

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: "Content Pipeline",
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />

      <View style={[styles.tabBar, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border, marginTop: Platform.OS === "web" ? webTopInset : 0 }]}>
        {(["overview", "pending", "quarter"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.accent : theme.textSecondary }]}>
              {tab === "overview" ? "Overview" : tab === "pending" ? `Review (${overview?.pendingReview?.length || 0})` : "Quarter"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === "web" ? 34 : insets.bottom) }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetchOverview()} tintColor={theme.accent} />}
      >
        {activeTab === "overview" && (
          <OverviewTab
            overview={overview}
            isLoading={overviewLoading}
            theme={theme}
          />
        )}

        {activeTab === "pending" && (
          <PendingTab
            pending={overview?.pendingReview || []}
            isLoading={overviewLoading}
            isAdmin={isAdmin}
            onReview={handleReview}
            reviewLoading={reviewMutation.isPending}
            theme={theme}
          />
        )}

        {activeTab === "quarter" && (
          <QuarterTab
            quarters={quarters || []}
            selectedQuarter={selectedQuarter}
            quarterDetail={quarterDetail}
            quartersLoading={quartersLoading}
            quarterLoading={quarterLoading}
            isAdmin={isAdmin}
            onSelectQuarter={setSelectedQuarter}
            onGenerate={handleGenerate}
            generateLoading={generateMutation.isPending}
            generateSuccess={generateMutation.isSuccess}
            onReview={handleReview}
            reviewLoading={reviewMutation.isPending}
            theme={theme}
          />
        )}
      </ScrollView>
    </View>
  );
}

function OverviewTab({ overview, isLoading, theme }: { overview?: PipelineOverview; isLoading: boolean; theme: any }) {
  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }
  if (!overview) {
    return <View style={styles.centered}><Text style={{ color: theme.textSecondary }}>No data available</Text></View>;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Pipeline Status</Text>
      <View style={styles.statsRow}>
        <StatCard label="Source Packets" value={overview.sourcePackets.total} color="#3B82F6" />
        <StatCard label="Companions" value={overview.companions.total} color="#10B981" />
        <StatCard label="Coverage" value={`${overview.coverage.coveragePercent}%`} color="#C9933A" />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Generation Status</Text>
      <View style={styles.statsRow}>
        {Object.entries(overview.companions.byGenerationStatus).map(([status, count]) => (
          <StatCard key={status} label={status} value={count} color={status === "completed" ? "#10B981" : status === "failed" ? "#EF4444" : "#6B7280"} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Review Status</Text>
      <View style={styles.statsRow}>
        {Object.entries(overview.companions.byReviewStatus).map(([status, count]) => (
          <StatCard key={status} label={status} value={count} color={status === "approved" ? "#10B981" : status === "pending" ? "#F59E0B" : "#EF4444"} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Prompt Versions</Text>
      <View style={styles.statsRow}>
        {Object.entries(overview.promptVersionDistribution).map(([version, count]) => (
          <StatCard key={version} label={version} value={count} color="#8B5CF6" />
        ))}
      </View>

      {overview.failedGenerations.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: "#EF4444", marginTop: 20 }]}>Failed Generations</Text>
          {overview.failedGenerations.map((item) => (
            <View key={item.id} style={[styles.listItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Text style={[styles.listTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.listSub, { color: theme.textMuted }]}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function PendingTab({
  pending, isLoading, isAdmin, onReview, reviewLoading, theme
}: {
  pending: PipelineOverview["pendingReview"];
  isLoading: boolean;
  isAdmin: boolean;
  onReview: (id: string, action: string, title: string) => void;
  reviewLoading: boolean;
  theme: any;
}) {
  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }
  if (pending.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No pending reviews</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {pending.length} Pending Review
      </Text>
      {pending.map((item) => (
        <View key={item.id} style={[styles.reviewCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={styles.reviewHeader}>
            <Text style={[styles.reviewTitle, { color: theme.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <StatusBadge status={item.reviewStatus} type="review" />
          </View>
          <View style={styles.reviewMeta}>
            <Text style={[styles.reviewMetaText, { color: theme.textMuted }]}>
              {item.promptVersion}
            </Text>
            <Text style={[styles.reviewMetaText, { color: theme.textMuted }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.reviewActions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
              onPress={() => onReview(item.id, "approved", item.title)}
              disabled={reviewLoading}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#F97316" }]}
              onPress={() => onReview(item.id, "needs_revision", item.title)}
              disabled={reviewLoading}
            >
              <Ionicons name="create" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Revise</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => onReview(item.id, "rejected", item.title)}
              disabled={reviewLoading}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function QuarterTab({
  quarters, selectedQuarter, quarterDetail, quartersLoading, quarterLoading,
  isAdmin, onSelectQuarter, onGenerate, generateLoading, generateSuccess,
  onReview, reviewLoading, theme
}: {
  quarters: QuarterInfo[];
  selectedQuarter: string | null;
  quarterDetail?: QuarterDetail;
  quartersLoading: boolean;
  quarterLoading: boolean;
  isAdmin: boolean;
  onSelectQuarter: (code: string) => void;
  onGenerate: (code: string) => void;
  generateLoading: boolean;
  generateSuccess: boolean;
  onReview: (id: string, action: string, title: string) => void;
  reviewLoading: boolean;
  theme: any;
}) {
  if (quartersLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Quarters</Text>
      {quarters.map((q) => (
        <Pressable
          key={q.quarterCode}
          style={[
            styles.quarterCard,
            { backgroundColor: theme.backgroundCard, borderColor: selectedQuarter === q.quarterCode ? theme.accent : theme.border },
          ]}
          onPress={() => onSelectQuarter(q.quarterCode)}
        >
          <View style={styles.quarterHeader}>
            <Text style={[styles.quarterCode, { color: theme.accent }]}>{q.quarterCode}</Text>
            <Text style={[styles.quarterCoverage, { color: theme.textSecondary }]}>
              {q.companionCount}/{q.lessonCount}
            </Text>
          </View>
          <Text style={[styles.quarterTitle, { color: theme.text }]} numberOfLines={2}>
            {q.title}
          </Text>
          {isAdmin && (
            <Pressable
              style={[styles.generateBtn, { backgroundColor: theme.accent, opacity: generateLoading ? 0.6 : 1 }]}
              onPress={() => onGenerate(q.quarterCode)}
              disabled={generateLoading}
            >
              {generateLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={14} color="#fff" />
                  <Text style={styles.generateBtnText}>
                    {generateSuccess ? "Started" : "Generate All"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </Pressable>
      ))}

      {selectedQuarter && quarterLoading && (
        <View style={[styles.centered, { marginTop: 20 }]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}

      {selectedQuarter && quarterDetail && !quarterLoading && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
            Lessons ({quarterDetail.summary.totalLessons})
          </Text>
          <View style={styles.summaryRow}>
            <StatCard label="Packets" value={quarterDetail.summary.packetsBuilt} color="#3B82F6" />
            <StatCard label="Generated" value={quarterDetail.summary.companionsGenerated} color="#10B981" />
            <StatCard label="Published" value={quarterDetail.summary.published} color="#C9933A" />
          </View>

          {quarterDetail.lessons.map((lesson) => (
            <View
              key={lesson.lessonId}
              style={[styles.lessonRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
            >
              <View style={styles.lessonHeader}>
                <View style={[styles.lessonNum, { backgroundColor: lesson.companion ? "#10B981" : theme.border }]}>
                  <Text style={[styles.lessonNumText, { color: lesson.companion ? "#fff" : theme.textMuted }]}>
                    {lesson.lessonNumber}
                  </Text>
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTitle, { color: theme.text }]} numberOfLines={1}>
                    {lesson.title}
                  </Text>
                  <View style={styles.lessonBadges}>
                    {lesson.packet && <StatusBadge status={lesson.packet.status} type="resource" />}
                    {lesson.companion && (
                      <>
                        <StatusBadge status={lesson.companion.status} type="resource" />
                        <StatusBadge status={lesson.companion.reviewStatus} type="review" />
                      </>
                    )}
                    {!lesson.companion && (
                      <Text style={[styles.noCompanion, { color: theme.textMuted }]}>No companion</Text>
                    )}
                  </View>
                </View>
              </View>

              {lesson.companion && lesson.companion.reviewStatus === "pending" && (
                <View style={[styles.reviewActions, { marginTop: 8 }]}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => onReview(lesson.companion!.id, "approved", lesson.title)}
                    disabled={reviewLoading}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() => onReview(lesson.companion!.id, "rejected", lesson.title)}
                    disabled={reviewLoading}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12, textAlign: "center" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scrollContent: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    minWidth: 90,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2, textTransform: "capitalize" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginRight: 4 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  listItem: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  listTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listSub: { fontSize: 12, marginTop: 2 },
  reviewCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reviewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  reviewMeta: { flexDirection: "row", gap: 12, marginTop: 6 },
  reviewMetaText: { fontSize: 12 },
  reviewActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  quarterCard: { padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 10 },
  quarterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quarterCode: { fontSize: 13, fontFamily: "Inter_700Bold" },
  quarterCoverage: { fontSize: 12, fontFamily: "Inter_500Medium" },
  quarterTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  generateBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  lessonRow: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  lessonHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  lessonNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lessonNumText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  lessonBadges: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  noCompanion: { fontSize: 11, fontStyle: "italic" },
});
