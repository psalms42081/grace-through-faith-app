import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

interface Track {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  totalModules: number;
  totalWeeks: number;
  difficulty: string;
  modulesCount?: number;
  lessonsCount?: number;
}

interface TrackProgress {
  id: string;
  userId: string;
  trackId: string;
  percentComplete: number;
  completedAt: string | null;
  track?: {
    title: string;
    icon: string;
    color: string;
    category: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  beliefs: "Adventist Beliefs",
  prophecy: "Prophecy",
  "new-believer": "New Believers",
  discipleship: "Discipleship",
};

const CATEGORY_ORDER = ["beliefs", "new-believer", "prophecy", "discipleship"];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#2E7D32",
  intermediate: "#E65100",
  advanced: "#C2185B",
};

function getDifficultyLabel(d: string) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function getIconName(icon: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    school: "school",
    heart: "heart",
    telescope: "telescope",
    "trail-sign": "trail-sign",
    book: "book",
    flame: "flame",
    star: "star",
  };
  return map[icon] || "book";
}

export default function StudyPathsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const tracksQuery = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const progressQuery = useQuery<TrackProgress[]>({
    queryKey: [`/api/tracks/progress?userId=${userId}`],
  });

  const enrollMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const res = await apiRequest("POST", "/api/tracks/enroll", { userId, trackId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/progress?userId=${userId}`] });
    },
  });

  const tracks = tracksQuery.data || [];
  const progressList = progressQuery.data || [];
  const progressMap = new Map<string, TrackProgress>();
  progressList.forEach((p) => progressMap.set(p.trackId, p));

  const groupedTracks = new Map<string, Track[]>();
  tracks.forEach((t) => {
    const list = groupedTracks.get(t.category) || [];
    list.push(t);
    groupedTracks.set(t.category, list);
  });

  const sortedCategories = CATEGORY_ORDER.filter((c) => groupedTracks.has(c));
  groupedTracks.forEach((_, key) => {
    if (!sortedCategories.includes(key)) sortedCategories.push(key);
  });

  const handleEnroll = async (trackId: string) => {
    setEnrollingId(trackId);
    try {
      await enrollMutation.mutateAsync(trackId);
    } catch {}
    setEnrollingId(null);
  };

  const isLoading = tracksQuery.isLoading || progressQuery.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Study Paths</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trail-sign" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No study paths available yet
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {sortedCategories.map((category) => {
            const categoryTracks = groupedTracks.get(category) || [];
            return (
              <View key={category} style={styles.categorySection}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                  {CATEGORY_LABELS[category] || category}
                </Text>

                {categoryTracks.map((track) => {
                  const progress = progressMap.get(track.id);
                  const isEnrolled = !!progress;
                  const isEnrolling = enrollingId === track.id;

                  return (
                    <Pressable
                      key={track.id}
                      onPress={() => router.push(`/study-path/${track.id}` as any)}
                      style={({ pressed }) => [
                        styles.trackCard,
                        { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <View style={styles.trackRow}>
                        <View style={[styles.iconCircle, { backgroundColor: track.color + "18" }]}>
                          <Ionicons name={getIconName(track.icon)} size={22} color={track.color} />
                        </View>
                        <View style={styles.trackInfo}>
                          <Text
                            style={[styles.trackTitle, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {track.title}
                          </Text>
                          <Text
                            style={[styles.trackDesc, { color: theme.textMuted }]}
                            numberOfLines={2}
                          >
                            {track.description}
                          </Text>
                          <View style={styles.trackMeta}>
                            <View style={styles.metaItem}>
                              <Ionicons name="layers" size={13} color={theme.textMuted} />
                              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                {track.modulesCount ?? track.totalModules} modules
                              </Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons name="calendar" size={13} color={theme.textMuted} />
                              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                {track.totalWeeks} weeks
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.difficultyBadge,
                                {
                                  backgroundColor:
                                    (DIFFICULTY_COLORS[track.difficulty] || "#666") + "18",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.difficultyText,
                                  { color: DIFFICULTY_COLORS[track.difficulty] || "#666" },
                                ]}
                              >
                                {getDifficultyLabel(track.difficulty)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {isEnrolled && (
                        <View style={styles.progressSection}>
                          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  backgroundColor: theme.accent,
                                  width: `${progress!.percentComplete}%` as any,
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.progressRow}>
                            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                              {progress!.percentComplete}% complete
                            </Text>
                            <Pressable
                              onPress={() => router.push(`/study-path/${track.id}` as any)}
                              style={[styles.continueBtn, { backgroundColor: theme.accent + "18" }]}
                            >
                              <Text style={[styles.continueBtnText, { color: theme.accent }]}>
                                Continue
                              </Text>
                              <Ionicons name="arrow-forward" size={14} color={theme.accent} />
                            </Pressable>
                          </View>
                        </View>
                      )}

                      {!isEnrolled && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleEnroll(track.id);
                          }}
                          disabled={isEnrolling}
                          style={({ pressed }) => [
                            styles.enrollBtn,
                            {
                              backgroundColor: track.color,
                              opacity: pressed || isEnrolling ? 0.7 : 1,
                            },
                          ]}
                        >
                          {isEnrolling ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="add-circle" size={16} color="#fff" />
                              <Text style={styles.enrollBtnText}>Enroll</Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontFamily: "Lora_700Bold",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  categorySection: {
    marginBottom: 28,
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    marginBottom: 14,
  },
  trackCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: "row",
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  trackDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  trackMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  difficultyBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  difficultyText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  continueBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  enrollBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
