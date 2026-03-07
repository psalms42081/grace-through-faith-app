import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/components/ScreenHeader";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { GC_NODES, GCNode } from "@/data/great-controversy";
import { BELIEFS } from "@/data/beliefs";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function NodeCard({
  node,
  isExpanded,
  onToggle,
  theme,
  depth,
}: {
  node: GCNode;
  isExpanded: boolean;
  onToggle: () => void;
  theme: any;
  depth: string;
}) {
  const linkedBeliefData = node.linkedBeliefs
    .map((num) => BELIEFS.find((b) => b.number === num))
    .filter(Boolean);

  const [aiData, setAiData] = useState<{
    narrative: string;
    connections: { before: string; after: string } | null;
    reflection: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskAI = async () => {
    if (aiData) return;
    setAiLoading(true);
    try {
      const res = await apiRequest("POST", "/api/great-controversy/explore", {
        nodeId: node.id,
        depth,
      });
      const data = await res.json();
      setAiData({
        narrative: data.narrativeExplanation || "No insight available.",
        connections: data.connections || null,
        reflection: data.reflectionQuestion || "",
      });
    } catch {
      setAiData({
        narrative: "Unable to generate insight at this time.",
        connections: null,
        reflection: "",
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <View style={styles.nodeRow}>
      <View style={styles.spineColumn}>
        <View style={[styles.spineLine, { backgroundColor: "rgba(201, 147, 58, 0.3)" }]} />
        <View
          style={[
            styles.nodeDot,
            {
              backgroundColor: node.color,
              borderColor: node.isCurrentEra ? "#C9933A" : "rgba(245, 240, 232, 0.2)",
              borderWidth: node.isCurrentEra ? 3 : 1.5,
            },
          ]}
        >
          <Ionicons name={node.icon as any} size={14} color="#fff" />
        </View>
        {node.isCurrentEra && (
          <View style={styles.youAreHereBadge}>
            <Text style={styles.youAreHereText}>NOW</Text>
          </View>
        )}
      </View>

      <View style={styles.cardColumn}>
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onToggle();
          }}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: isExpanded
                ? "rgba(201, 147, 58, 0.12)"
                : theme.backgroundCard,
              borderColor: isExpanded
                ? "rgba(201, 147, 58, 0.3)"
                : theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.yearLabel, { color: node.color }]}>
                {node.yearLabel}
              </Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {node.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                {node.subtitle}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textMuted}
            />
          </View>

          {!isExpanded && (
            <Text
              style={[styles.cardPreview, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {node.description}
            </Text>
          )}

          {isExpanded && (
            <View style={styles.expandedContent}>
              <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                {node.description}
              </Text>

              {depth !== "quick" && (
                <View style={[styles.significanceBox, { backgroundColor: "rgba(201, 147, 58, 0.08)" }]}>
                  <View style={styles.significanceHeader}>
                    <Ionicons name="diamond-outline" size={14} color="#C9933A" />
                    <Text style={[styles.significanceLabel, { color: "#C9933A" }]}>
                      Why This Matters
                    </Text>
                  </View>
                  <Text style={[styles.significanceText, { color: theme.textSecondary }]}>
                    {node.significance}
                  </Text>
                </View>
              )}

              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="book-outline" size={14} color={theme.accent} />
                  <Text style={[styles.sectionLabel, { color: theme.accent }]}>
                    Key Scriptures
                  </Text>
                </View>
                <View style={styles.scriptureChips}>
                  {node.scriptureRefs.map((s) => (
                    <Pressable
                      key={s.ref}
                      onPress={() =>
                        router.push(`/read/${s.bookId}/${s.chapter}` as any)
                      }
                      style={({ pressed }) => [
                        styles.scriptureChip,
                        {
                          backgroundColor: "rgba(201, 147, 58, 0.1)",
                          borderColor: "rgba(201, 147, 58, 0.2)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.scriptureChipText, { color: "#C9933A" }]}>
                        {s.ref}
                      </Text>
                      <Ionicons name="open-outline" size={10} color="#C9933A" />
                    </Pressable>
                  ))}
                </View>
              </View>

              {depth !== "quick" && linkedBeliefData.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#2E7D32" />
                    <Text style={[styles.sectionLabel, { color: "#2E7D32" }]}>
                      Connected Beliefs
                    </Text>
                  </View>
                  {linkedBeliefData.map((belief) =>
                    belief ? (
                      <Pressable
                        key={belief.number}
                        onPress={() => router.push("/sda-studies" as any)}
                        style={({ pressed }) => [
                          styles.beliefRow,
                          {
                            backgroundColor: "rgba(46, 125, 50, 0.06)",
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View style={styles.beliefNum}>
                          <Text style={styles.beliefNumText}>
                            {belief.number}
                          </Text>
                        </View>
                        <Text
                          style={[styles.beliefTitle, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {belief.title}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                      </Pressable>
                    ) : null
                  )}
                </View>
              )}

              {node.linkedTrackId && depth !== "quick" && (
                <Pressable
                  onPress={() =>
                    router.push(`/study-path/${node.linkedTrackId}` as any)
                  }
                  style={({ pressed }) => [
                    styles.studyPathLink,
                    {
                      backgroundColor: "rgba(124, 58, 237, 0.1)",
                      borderColor: "rgba(124, 58, 237, 0.2)",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="school-outline" size={16} color="#7C3AED" />
                  <Text style={[styles.studyPathLinkText, { color: "#7C3AED" }]}>
                    Continue Studying This Topic
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#7C3AED" />
                </Pressable>
              )}

              {depth === "deep" && (
                <View style={styles.sectionBlock}>
                  <Pressable
                    onPress={handleAskAI}
                    disabled={aiLoading}
                    style={({ pressed }) => [
                      styles.aiButton,
                      {
                        backgroundColor: "rgba(201, 147, 58, 0.12)",
                        borderColor: "rgba(201, 147, 58, 0.3)",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {aiLoading ? (
                      <ActivityIndicator size="small" color="#C9933A" />
                    ) : (
                      <Ionicons name="sparkles" size={16} color="#C9933A" />
                    )}
                    <Text style={[styles.aiButtonText, { color: "#C9933A" }]}>
                      {aiData ? "AI Insight" : "Explore with AI Guide"}
                    </Text>
                  </Pressable>
                  {aiData && (
                    <View style={[styles.aiInsightBox, { backgroundColor: "rgba(201, 147, 58, 0.06)" }]}>
                      <Text style={[styles.aiInsightText, { color: theme.textSecondary }]}>
                        {aiData.narrative}
                      </Text>
                      {aiData.connections && (
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {aiData.connections.before ? (
                            <Text style={[styles.aiInsightText, { color: theme.textMuted, fontSize: 12, fontStyle: "italic" }]}>
                              Connection to previous: {aiData.connections.before}
                            </Text>
                          ) : null}
                          {aiData.connections.after ? (
                            <Text style={[styles.aiInsightText, { color: theme.textMuted, fontSize: 12, fontStyle: "italic" }]}>
                              Connection to next: {aiData.connections.after}
                            </Text>
                          ) : null}
                        </View>
                      )}
                      {aiData.reflection ? (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(201, 147, 58, 0.15)" }}>
                          <Text style={[styles.aiInsightText, { color: "#C9933A", fontFamily: "Lora_400Regular_Italic", fontSize: 13 }]}>
                            {aiData.reflection}
                          </Text>
                        </View>
                      ) : null}
                      <SDAVerifiedBadge variant="compact" />
                    </View>
                  )}
                </View>
              )}

              {node.linkedDevotionalTheme && (
                <Pressable
                  onPress={() => router.push("/devotionals" as any)}
                  style={({ pressed }) => [
                    styles.devotionalLink,
                    {
                      backgroundColor: "rgba(59, 130, 246, 0.08)",
                      borderColor: "rgba(59, 130, 246, 0.2)",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={14} color="#3B82F6" />
                  <Text style={[styles.devotionalLinkText, { color: "#3B82F6" }]}>
                    Start a Reading Plan on This Topic
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function GreatControversyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { depth } = useStudyDepth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggleNode = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="The Great Controversy"
        subtitle="The Cosmic Conflict Unveiled"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            From Creation to the New Earth, trace the cosmic conflict between
            Christ and Satan through the lens of Adventist theology. Tap any
            event to explore its scriptures, connected beliefs, and significance.
          </Text>
          <SDAVerifiedBadge />
        </View>

        <View style={styles.timeline}>
          {GC_NODES.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isExpanded={expandedId === node.id}
              onToggle={() => toggleNode(node.id)}
              theme={theme}
              depth={depth}
            />
          ))}
        </View>

        <View style={[styles.closingCard, { backgroundColor: "rgba(34, 197, 94, 0.08)", borderColor: "rgba(34, 197, 94, 0.2)" }]}>
          <Ionicons name="sparkles" size={24} color="#22C55E" />
          <Text style={[styles.closingTitle, { color: "#22C55E" }]}>
            Sin Will Never Rise Again
          </Text>
          <Text style={[styles.closingText, { color: theme.textSecondary }]}>
            "Affliction shall not rise up the second time." {"\u2014"} Nahum 1:9
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  introBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  introText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  timeline: {
    paddingTop: 8,
  },
  nodeRow: {
    flexDirection: "row",
    minHeight: 80,
  },
  spineColumn: {
    width: 44,
    alignItems: "center",
    position: "relative",
  },
  spineLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    left: 21,
  },
  nodeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    zIndex: 2,
  },
  youAreHereBadge: {
    position: "absolute",
    top: 50,
    left: -2,
    backgroundColor: "#C9933A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 3,
  },
  youAreHereText: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#050507",
    letterSpacing: 1,
  },
  cardColumn: {
    flex: 1,
    paddingRight: 8,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  yearLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  cardPreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  expandedContent: {
    marginTop: 12,
    gap: 14,
  },
  descriptionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  significanceBox: {
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  significanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  significanceLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  significanceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  scriptureChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  scriptureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scriptureChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  beliefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  beliefNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  beliefNumText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#fff",
  },
  beliefTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  studyPathLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  studyPathLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flex: 1,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  aiButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  aiInsightBox: {
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  aiInsightText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  devotionalLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  devotionalLinkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
  },
  closingCard: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  closingTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 16,
  },
  closingText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
