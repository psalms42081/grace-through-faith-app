import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { queryClient } from "@/lib/query-client";
import Colors, { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";

interface ChapterContext {
  locations: { name: string; modernName: string; latitude: number; longitude: number; significance: string; type: string }[];
  timelineEvents: { title: string; yearLabel: string; description: string; period: string }[];
  keyFigures: { name: string; role: string; significance: string }[];
  culturalInsights: string;
  geographicalNotes: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ContextPanelProps {
  bookId: number;
  chapter: number;
  theme: typeof Colors.dark;
  isDark: boolean;
  isPro: boolean;
  showProGate: () => void;
}

export default function ContextPanel({
  bookId,
  chapter,
  theme,
  isDark,
  isPro,
  showProGate,
}: ContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<"locations" | "timeline" | "figures" | "insights">("locations");
  const fabScale = useSharedValue(1);
  const fabGlow = useSharedValue(0);
  const hadDataRef = useRef(false);

  const hasCachedContext = !!queryClient.getQueryData([`/api/chapter-context/${bookId}/${chapter}`]);

  const { data, isLoading } = useQuery<ChapterContext>({
    queryKey: [`/api/chapter-context/${bookId}/${chapter}`],
    enabled: expanded || hasCachedContext,
  });

  useEffect(() => {
    if (data && !hadDataRef.current && !expanded) {
      hadDataRef.current = true;
      fabScale.value = withSequence(
        withTiming(1.18, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0.94, { duration: 150, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.06, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) })
      );
      fabGlow.value = withSequence(
        withTiming(1, { duration: 250 }),
        withDelay(400, withTiming(0, { duration: 600 }))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [data, expanded, fabScale, fabGlow]);

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
    shadowOpacity: 0.15 + fabGlow.value * 0.35,
    shadowRadius: 6 + fabGlow.value * 10,
  }));

  if (!expanded) {
    return (
      <AnimatedPressable
        onPress={() => {
          if (!isPro) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            showProGate();
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(true);
        }}
        style={[contextStyles.fab, { backgroundColor: PathB.coral }, fabAnimStyle]}
        testID="context-panel-toggle"
      >
        <Ionicons name="layers" size={22} color="#fff" />
      </AnimatedPressable>
    );
  }

  const sections = [
    { id: "locations" as const, icon: "location" as const, label: "Places" },
    { id: "timeline" as const, icon: "time" as const, label: "Timeline" },
    { id: "figures" as const, icon: "people" as const, label: "Figures" },
    { id: "insights" as const, icon: "bulb" as const, label: "Culture" },
  ];

  return (
    <View style={[contextStyles.panel, { backgroundColor: isDark ? theme.backgroundCard : PathB.surfaceCard }]}>
      <View style={contextStyles.panelHeader}>
        <Ionicons name="layers" size={18} color={PathB.ink} />
        <Text style={[contextStyles.panelTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Chapter Insights
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, position: "absolute", top: 18, right: 40 }}>
          <Ionicons name="sparkles" size={9} color={HV2.inkMutedText} />
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: "Inter_400Regular" }}>AI-assisted</Text>
        </View>
        <Pressable
          onPress={() => setExpanded(false)}
          hitSlop={8}
          testID="close-context-panel"
        >
          <Ionicons name="close" size={20} color={theme.textMuted} />
        </Pressable>
      </View>

      <View style={contextStyles.sectionTabs}>
        {sections.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setActiveSection(s.id)}
            style={[
              contextStyles.sectionTab,
              { backgroundColor: activeSection === s.id ? "rgba(31,26,18,0.08)" : "transparent" },
            ]}
          >
            <Ionicons
              name={s.icon}
              size={14}
              color={activeSection === s.id ? PathB.ink : theme.textMuted}
            />
            <Text
              style={[
                contextStyles.sectionTabText,
                {
                  color: activeSection === s.id ? PathB.ink : theme.textMuted,
                  fontFamily: activeSection === s.id ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={contextStyles.loadingArea}>
          <ActivityIndicator size="small" color={PathB.ink} />
          <Text style={[contextStyles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Generating context...
          </Text>
        </View>
      ) : !data ? (
        <Text style={[contextStyles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          No context available
        </Text>
      ) : (
        <View style={contextStyles.sectionContent}>
          {activeSection === "locations" && (
            <>
              {(data.locations || []).length === 0 ? (
                <Text style={[contextStyles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  No locations identified
                </Text>
              ) : (
                (data.locations || []).map((loc, i) => (
                  <Pressable
                    key={i}
                    onPress={() => router.push("/maps-timeline?tab=maps")}
                    style={[contextStyles.contextItem, { backgroundColor: isDark ? theme.background : "#F8F6F0" }]}
                  >
                    <View style={[contextStyles.contextIconCircle, { backgroundColor: "#1565C020" }]}>
                      <Ionicons name="location" size={14} color="#1565C0" />
                    </View>
                    <View style={contextStyles.contextItemInfo}>
                      <Text style={[contextStyles.contextItemTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {loc.name}
                      </Text>
                      {loc.modernName ? (
                        <Text style={[contextStyles.contextItemMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                          Today: {loc.modernName}
                        </Text>
                      ) : null}
                      <Text style={[contextStyles.contextItemDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {loc.significance}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          )}

          {activeSection === "timeline" && (
            <>
              {(data.timelineEvents || []).length === 0 ? (
                <Text style={[contextStyles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  No timeline events
                </Text>
              ) : (
                (data.timelineEvents || []).map((evt, i) => (
                  <Pressable
                    key={i}
                    onPress={() => router.push("/maps-timeline?tab=timeline")}
                    style={[contextStyles.contextItem, { backgroundColor: isDark ? theme.background : "#F8F6F0" }]}
                  >
                    <View style={[contextStyles.contextIconCircle, { backgroundColor: "#2E7D3220" }]}>
                      <Ionicons name="time" size={14} color="#2E7D32" />
                    </View>
                    <View style={contextStyles.contextItemInfo}>
                      <View style={contextStyles.contextItemRow}>
                        <Text style={[contextStyles.contextItemTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                          {evt.title}
                        </Text>
                        <Text style={[contextStyles.yearBadge, { color: "#2E7D32", backgroundColor: "#2E7D3215", fontFamily: "Inter_600SemiBold" }]}>
                          {evt.yearLabel}
                        </Text>
                      </View>
                      <Text style={[contextStyles.contextItemDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {evt.description}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          )}

          {activeSection === "figures" && (
            <>
              {(data.keyFigures || []).length === 0 ? (
                <Text style={[contextStyles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  No key figures
                </Text>
              ) : (
                (data.keyFigures || []).map((fig, i) => (
                  <View
                    key={i}
                    style={[contextStyles.contextItem, { backgroundColor: isDark ? theme.background : "#F8F6F0" }]}
                  >
                    <View style={[contextStyles.avatarCircle, { backgroundColor: "rgba(31,26,18,0.08)" }]}>
                      <Text style={[contextStyles.avatarText, { color: PathB.ink, fontFamily: "Inter_700Bold" }]}>
                        {fig.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={contextStyles.contextItemInfo}>
                      <Text style={[contextStyles.contextItemTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {fig.name}
                      </Text>
                      <Text style={[contextStyles.contextItemMeta, { color: HV2.inkMutedText, fontFamily: "Inter_500Medium" }]}>
                        {fig.role}
                      </Text>
                      <Text style={[contextStyles.contextItemDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {fig.significance}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {activeSection === "insights" && (
            <View style={contextStyles.insightsArea}>
              {data.geographicalNotes ? (
                <View style={[contextStyles.insightBlock, { backgroundColor: isDark ? theme.background : "#F8F6F0" }]}>
                  <View style={contextStyles.insightHeader}>
                    <Ionicons name="earth" size={14} color="#1565C0" />
                    <Text style={[contextStyles.insightLabel, { color: "#1565C0", fontFamily: "Inter_600SemiBold" }]}>
                      Geography
                    </Text>
                  </View>
                  <Text style={[contextStyles.insightText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {data.geographicalNotes}
                  </Text>
                </View>
              ) : null}
              {data.culturalInsights ? (
                <View style={[contextStyles.insightBlock, { backgroundColor: isDark ? theme.background : "#F8F6F0" }]}>
                  <View style={contextStyles.insightHeader}>
                    <Ionicons name="bulb" size={14} color={PathB.ink} />
                    <Text style={[contextStyles.insightLabel, { color: PathB.ink, fontFamily: "Inter_600SemiBold" }]}>
                      Cultural Context
                    </Text>
                  </View>
                  <Text style={[contextStyles.insightText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {data.culturalInsights}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const contextStyles = StyleSheet.create({
  fab: {
    position: "absolute" as const,
    right: 20,
    top: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  panel: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  panelTitle: { flex: 1, fontSize: 18 },
  sectionTabs: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  sectionTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sectionTabText: { fontSize: 11 },
  loadingArea: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: { fontSize: 13 },
  emptyText: { fontSize: 13, textAlign: "center" as const, paddingVertical: 16 },
  sectionContent: { gap: 8 },
  contextItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  contextIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  contextItemInfo: { flex: 1, gap: 2 },
  contextItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  contextItemTitle: { fontSize: 14 },
  contextItemMeta: { fontSize: 11, marginTop: 1 },
  contextItemDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  yearBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatarText: { fontSize: 16 },
  insightsArea: { gap: 10 },
  insightBlock: {
    padding: 12,
    borderRadius: 12,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  insightLabel: { fontSize: 12 },
  insightText: { fontSize: 13, lineHeight: 20 },
});
