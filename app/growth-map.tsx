import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

interface DimensionData {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  current: number;
  levelIndex: number;
  levels: string[];
  thresholds: number[];
  progressToNext: number;
  nextRequirement: string;
}

interface GrowthMapResponse {
  prayer: { count: number };
  scripture: { chaptersRead: number };
  service: { groupCount: number; discussionCount: number };
  character: { completionRate: number };
  wisdom: { studyDepthUsage: number; studyPathProgress: number };
}

const DIMENSIONS_CONFIG = [
  {
    key: "prayer",
    label: "Prayer Life",
    icon: "hand-left" as const,
    color: "#8B5CF6",
    levels: ["Beginner", "Consistent", "Intercessor", "Prayer Warrior"],
    thresholds: [0, 5, 20, 50],
    nextReqs: ["Add your first prayer", "Add 5 prayers", "Add 20 prayers", "Add 50 prayers"],
  },
  {
    key: "scripture",
    label: "Scripture",
    icon: "book" as const,
    color: "#5B8DEF",
    levels: ["Reader", "Student", "Scholar", "Teacher"],
    thresholds: [0, 10, 50, 150],
    nextReqs: ["Read your first chapter", "Read 10 chapters", "Read 50 chapters", "Read 150 chapters"],
  },
  {
    key: "service",
    label: "Service",
    icon: "people" as const,
    color: "#4ECCA3",
    levels: ["Observer", "Helper", "Servant", "Minister"],
    thresholds: [0, 3, 10, 30],
    nextReqs: ["Join a group or post", "3 group interactions", "10 group interactions", "30 group interactions"],
  },
  {
    key: "character",
    label: "Character",
    icon: "leaf" as const,
    color: "#E8A838",
    levels: ["Seedling", "Growing", "Maturing", "Fruit-bearing"],
    thresholds: [0, 25, 50, 80],
    nextReqs: ["Start daily goals", "25% daily goals", "50% daily goals", "80% daily goals"],
  },
  {
    key: "wisdom",
    label: "Wisdom",
    icon: "bulb" as const,
    color: "#E8456B",
    levels: ["Seeker", "Learner", "Disciple", "Mentor"],
    thresholds: [0, 5, 20, 50],
    nextReqs: ["Begin a study path", "5 study activities", "20 study activities", "50 study activities"],
  },
];

function computeDimension(
  config: (typeof DIMENSIONS_CONFIG)[0],
  value: number
): DimensionData {
  let levelIndex = 0;
  for (let i = config.thresholds.length - 1; i >= 0; i--) {
    if (value >= config.thresholds[i]) {
      levelIndex = i;
      break;
    }
  }

  let progressToNext = 1;
  let nextRequirement = "Maximum level reached";
  if (levelIndex < config.levels.length - 1) {
    const currentThreshold = config.thresholds[levelIndex];
    const nextThreshold = config.thresholds[levelIndex + 1];
    progressToNext = Math.min(
      (value - currentThreshold) / (nextThreshold - currentThreshold),
      1
    );
    nextRequirement = config.nextReqs[levelIndex + 1];
  }

  return {
    key: config.key,
    label: config.label,
    icon: config.icon,
    color: config.color,
    current: value,
    levelIndex,
    levels: config.levels,
    thresholds: config.thresholds,
    progressToNext,
    nextRequirement,
  };
}

const RING_SIZE = 200;
const RING_CENTER = RING_SIZE / 2;
const RING_STROKE = 10;

function GrowthRings({ dimensions }: { dimensions: DimensionData[] }) {
  const radii = [85, 72, 59, 46, 33];

  return (
    <View style={ringStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {dimensions.map((dim, i) => {
          const r = radii[i];
          const circumference = 2 * Math.PI * r;
          const overallProgress =
            dim.levelIndex / (dim.levels.length - 1) +
            dim.progressToNext / (dim.levels.length - 1);
          const dashOffset = circumference * (1 - Math.min(overallProgress, 1));

          return (
            <React.Fragment key={dim.key}>
              <Circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={r}
                stroke={dim.color + "20"}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={r}
                stroke={dim.color}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={ringStyles.centerLabel}>
        <Ionicons name="trending-up" size={22} color="#C9933A" />
        <Text style={ringStyles.centerText}>Growth</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  centerText: {
    color: "#C9933A",
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
  },
});

function PathNode({
  dim,
  index,
  totalCount,
  isDark,
}: {
  dim: DimensionData;
  index: number;
  totalCount: number;
  isDark: boolean;
}) {
  const isLeft = index % 2 === 0;
  const overallPct = Math.round(
    ((dim.levelIndex / (dim.levels.length - 1)) +
      (dim.progressToNext / (dim.levels.length - 1))) *
      100
  );

  return (
    <View style={[pathStyles.nodeContainer, isLeft ? pathStyles.nodeLeft : pathStyles.nodeRight]}>
      <View style={pathStyles.nodeRow}>
        {isLeft && (
          <View style={pathStyles.nodeContent}>
            <Text style={[pathStyles.nodeLabel, { color: "#F0EBE0" }]}>{dim.label}</Text>
            <View style={pathStyles.levelRow}>
              <View style={[pathStyles.levelBadge, { backgroundColor: dim.color + "20" }]}>
                <Text style={[pathStyles.levelText, { color: dim.color }]}>
                  {dim.levels[dim.levelIndex]}
                </Text>
              </View>
            </View>
            <View style={pathStyles.progressBarBg}>
              <View
                style={[
                  pathStyles.progressBarFill,
                  {
                    width: `${Math.max(dim.progressToNext * 100, 2)}%` as any,
                    backgroundColor: dim.color,
                  },
                ]}
              />
            </View>
            {dim.levelIndex < dim.levels.length - 1 && (
              <Text style={pathStyles.nextReq}>{dim.nextRequirement}</Text>
            )}
          </View>
        )}

        <View style={[pathStyles.nodeCircle, { borderColor: dim.color, backgroundColor: dim.color + "15" }]}>
          <Ionicons name={dim.icon} size={20} color={dim.color} />
        </View>

        {!isLeft && (
          <View style={pathStyles.nodeContent}>
            <Text style={[pathStyles.nodeLabel, { color: "#F0EBE0" }]}>{dim.label}</Text>
            <View style={pathStyles.levelRow}>
              <View style={[pathStyles.levelBadge, { backgroundColor: dim.color + "20" }]}>
                <Text style={[pathStyles.levelText, { color: dim.color }]}>
                  {dim.levels[dim.levelIndex]}
                </Text>
              </View>
            </View>
            <View style={pathStyles.progressBarBg}>
              <View
                style={[
                  pathStyles.progressBarFill,
                  {
                    width: `${Math.max(dim.progressToNext * 100, 2)}%` as any,
                    backgroundColor: dim.color,
                  },
                ]}
              />
            </View>
            {dim.levelIndex < dim.levels.length - 1 && (
              <Text style={pathStyles.nextReq}>{dim.nextRequirement}</Text>
            )}
          </View>
        )}
      </View>

      {index < totalCount - 1 && (
        <View style={pathStyles.connectorLine}>
          <View style={[pathStyles.dotLine, { backgroundColor: isDark ? "#2A2A2F" : "#DDD0B8" }]} />
        </View>
      )}
    </View>
  );
}

const pathStyles = StyleSheet.create({
  nodeContainer: {
    marginBottom: 0,
  },
  nodeLeft: {
    alignItems: "flex-start",
    paddingLeft: 12,
  },
  nodeRight: {
    alignItems: "flex-end",
    paddingRight: 12,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  nodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeContent: {
    flex: 1,
    maxWidth: 220,
  },
  nodeLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    marginBottom: 4,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  nextReq: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#5C5549",
    lineHeight: 16,
  },
  connectorLine: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
  },
  dotLine: {
    width: 2,
    height: 32,
    borderRadius: 1,
  },
});

export default function GrowthMapScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery<GrowthMapResponse>({
    queryKey: [userId ? `/api/growth-map?userId=${userId}` : `/api/growth-map`],
  });

  const dimensions = useMemo(() => {
    if (!data) return DIMENSIONS_CONFIG.map((c) => computeDimension(c, 0));

    const prayerVal = data.prayer?.count ?? 0;
    const scriptureVal = data.scripture?.chaptersRead ?? 0;
    const serviceVal = (data.service?.groupCount ?? 0) + (data.service?.discussionCount ?? 0);
    const characterVal = data.character?.completionRate ?? 0;
    const wisdomVal = (data.wisdom?.studyDepthUsage ?? 0) + (data.wisdom?.studyPathProgress ?? 0);

    return [
      computeDimension(DIMENSIONS_CONFIG[0], prayerVal),
      computeDimension(DIMENSIONS_CONFIG[1], scriptureVal),
      computeDimension(DIMENSIONS_CONFIG[2], serviceVal),
      computeDimension(DIMENSIONS_CONFIG[3], characterVal),
      computeDimension(DIMENSIONS_CONFIG[4], wisdomVal),
    ];
  }, [data]);

  const overallLevel = useMemo(() => {
    const totalLevels = dimensions.reduce((sum, d) => sum + d.levelIndex, 0);
    const maxPossible = dimensions.length * 3;
    return Math.round((totalLevels / maxPossible) * 100);
  }, [dimensions]);

  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={st.headerTitle}>Spiritual Growth</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color="#C9933A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[st.summaryCard, { backgroundColor: theme.backgroundCard }]}>
            <GrowthRings dimensions={dimensions} />
            <Text style={st.summaryTitle}>Your Journey</Text>
            <Text style={st.summarySubtitle}>
              {overallLevel}% overall spiritual growth
            </Text>
            <View style={st.legendRow}>
              {dimensions.map((dim) => (
                <View key={dim.key} style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: dim.color }]} />
                  <Text style={st.legendLabel}>{dim.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={st.pathSection}>
            <Text style={st.pathTitle}>Growth Path</Text>
            {dimensions.map((dim, i) => (
              <PathNode
                key={dim.key}
                dim={dim}
                index={i}
                totalCount={dimensions.length}
                isDark={isDark}
              />
            ))}
          </View>

          <View style={st.detailSection}>
            <Text style={st.detailHeader}>Detailed Breakdown</Text>
            {dimensions.map((dim) => (
              <View key={dim.key} style={[st.detailCard, { backgroundColor: theme.backgroundCard }]}>
                <View style={st.detailTop}>
                  <View style={[st.detailIconWrap, { backgroundColor: dim.color + "15" }]}>
                    <Ionicons name={dim.icon} size={20} color={dim.color} />
                  </View>
                  <View style={st.detailInfo}>
                    <Text style={st.detailLabel}>{dim.label}</Text>
                    <Text style={[st.detailLevel, { color: dim.color }]}>
                      {dim.levels[dim.levelIndex]}
                    </Text>
                  </View>
                  <Text style={st.detailValue}>{dim.current}</Text>
                </View>
                <View style={st.detailLevelsRow}>
                  {dim.levels.map((lvl, li) => (
                    <View
                      key={lvl}
                      style={[
                        st.detailLevelPill,
                        li <= dim.levelIndex && { backgroundColor: dim.color + "25" },
                      ]}
                    >
                      <Text
                        style={[
                          st.detailLevelPillText,
                          li <= dim.levelIndex && { color: dim.color },
                        ]}
                      >
                        {lvl}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={st.detailProgressBg}>
                  <View
                    style={[
                      st.detailProgressFill,
                      {
                        width: `${Math.max(dim.progressToNext * 100, 2)}%` as any,
                        backgroundColor: dim.color,
                      },
                    ]}
                  />
                </View>
                {dim.levelIndex < dim.levels.length - 1 && (
                  <Text style={st.detailNextReq}>
                    Next: {dim.nextRequirement}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 20,
    color: "#F0EBE0",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: undefined,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  summaryTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: "#F0EBE0",
    marginTop: 4,
  },
  summarySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#5C5549",
    marginTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#5C5549",
  },
  pathSection: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  pathTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: "#F0EBE0",
    marginBottom: 20,
  },
  detailSection: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  detailHeader: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: "#F0EBE0",
    marginBottom: 14,
  },
  detailCard: {
    backgroundColor: undefined,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#F0EBE0",
  },
  detailLevel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  detailValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#C9933A",
  },
  detailLevelsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  detailLevelPill: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  detailLevelPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#5C5549",
  },
  detailProgressBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  detailProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  detailNextReq: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#5C5549",
    marginTop: 8,
  },
});
