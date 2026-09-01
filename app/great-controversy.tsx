import React, { useState, useCallback, useRef, useEffect } from "react";
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "@/components/ScreenHeader";
import { apiRequest } from "@/lib/query-client";
import { PathB } from "@/constants/colors";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { GC_NODES, GCNode } from "@/data/great-controversy";
import { BELIEFS } from "@/data/beliefs";
import { navigateToScripture } from "@/lib/scripture-nav";
import { useTranslation } from "@/context/TranslationContext";
import { PROPHECY_TEACHING_VIDEOS as PROPHECY_VIDEOS } from "@/data/curatedYoutubeVideos";

const GC_PROGRESS_KEY = "gc_timeline_progress";

const TIMELINE_PHASES = [
  { id: "creation", label: "Creation", nodeIds: ["creation"] },
  { id: "fall", label: "Fall", nodeIds: ["fall"] },
  { id: "patriarchs", label: "Patriarchs", nodeIds: ["patriarchs"] },
  { id: "israel", label: "Israel & Sanctuary", nodeIds: ["sanctuary-type", "prophets"] },
  { id: "christ", label: "Christ's Ministry", nodeIds: ["christ-ministry", "resurrection"] },
  { id: "early-church", label: "Early Church", nodeIds: ["early-church"] },
  { id: "apostasy", label: "Apostasy & Reform", nodeIds: ["apostasy", "reformation"] },
  { id: "advent", label: "Advent Movement", nodeIds: ["1844", "investigative-judgment"] },
  { id: "remnant", label: "Remnant Mission", nodeIds: ["three-angels"] },
  { id: "second-coming", label: "Second Coming", nodeIds: ["second-coming"] },
  { id: "new-earth", label: "New Earth", nodeIds: ["new-earth"] },
];

const LEGEND_ITEMS = [
  { label: "Scripture", color: PathB.coralInk },
  { label: "History", color: "#3B82F6" },
  { label: "Prophecy", color: "#8B5CF6" },
  { label: "Belief", color: "#2E7D32" },
  { label: "Hope", color: "#14B8A6" },
];

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
  translation,
}: {
  node: GCNode;
  isExpanded: boolean;
  onToggle: () => void;
  theme: any;
  depth: string;
  translation: string;
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
        <View style={[styles.spineLine, { backgroundColor: PathB.coral + "4D" }]} />
        <View
          style={[
            styles.nodeDot,
            {
              backgroundColor: node.color,
              borderColor: node.isCurrentEra ? PathB.coral : theme.border,
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
                ? PathB.coral + "14"
                : theme.backgroundCard,
              borderColor: isExpanded
                ? PathB.coral + "4D"
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
                <View style={[styles.significanceBox, { backgroundColor: SWEEP_LIGHT.backgroundSecondary }]}>
                  <View style={styles.significanceHeader}>
                    <Ionicons name="diamond-outline" size={14} color={PathB.ink} />
                    <Text style={[styles.significanceLabel, { color: PathB.ink }]}>
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
                  <Ionicons name="book-outline" size={14} color={PathB.ink} />
                  <Text style={[styles.sectionLabel, { color: PathB.ink }]}>
                    Key Scriptures
                  </Text>
                </View>
                <View style={styles.scriptureChips}>
                  {node.scriptureRefs.map((s) => (
                    <Pressable
                      key={s.ref}
                      onPress={() => navigateToScripture(s, translation)}
                      style={({ pressed }) => [
                        styles.scriptureChip,
                        {
                          backgroundColor: SWEEP_LIGHT.backgroundSecondary,
                          borderColor: theme.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.scriptureChipText, { color: PathB.ink }]}>
                        {s.ref}
                      </Text>
                      <Ionicons name="open-outline" size={10} color={PathB.ink} />
                    </Pressable>
                  ))}
                </View>
              </View>

              {depth !== "quick" && node.conflictThread && (
                <View style={[styles.conflictThreadBox, { backgroundColor: "rgba(139, 92, 246, 0.08)" }]}>
                  <View style={styles.conflictThreadHeader}>
                    <Ionicons name="git-merge-outline" size={14} color="#8B5CF6" />
                    <Text style={[styles.conflictThreadLabel, { color: "#8B5CF6" }]}>
                      Conflict Thread
                    </Text>
                  </View>
                  <Text style={[styles.conflictThreadText, { color: theme.textSecondary }]}>
                    {node.conflictThread}
                  </Text>
                </View>
              )}

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
                        backgroundColor: SWEEP_LIGHT.backgroundSecondary,
                        borderColor: theme.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    {aiLoading ? (
                      <ActivityIndicator size="small" color={PathB.ink} />
                    ) : (
                      <Ionicons name="sparkles" size={16} color={PathB.ink} />
                    )}
                    <Text style={[styles.aiButtonText, { color: PathB.ink }]}>
                      {aiData ? "AI Insight" : "Explore with AI Guide"}
                    </Text>
                  </Pressable>
                  {aiData && (
                    <View style={[styles.aiInsightBox, { backgroundColor: SWEEP_LIGHT.backgroundSecondary }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                        <Ionicons name="sparkles" size={10} color={PathB.ink} />
                        <Text style={{ fontSize: 10, color: PathB.ink, fontFamily: "Inter_500Medium" }}>AI-assisted -- verify with Scripture</Text>
                      </View>
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
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                          <Text style={[styles.aiInsightText, { color: PathB.ink, fontFamily: "Lora_400Regular_Italic", fontSize: 13 }]}>
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
                  onPress={() => router.push("/devotions" as any)}
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

              {node.egwLink && (
                <Pressable
                  onPress={() => Linking.openURL(node.egwLink!.url)}
                  style={({ pressed }) => [
                    styles.egwLink,
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="library-outline" size={12} color={theme.textMuted} />
                  <Text style={[styles.egwLinkText, { color: theme.textMuted }]} numberOfLines={1}>
                    {node.egwLink.title}
                  </Text>
                  <Ionicons name="open-outline" size={10} color={theme.textMuted} />
                </Pressable>
              )}

              <View style={[styles.nextStepsSection, { borderTopColor: theme.border }]}>
                <View style={styles.nextStepsHeader}>
                  <Ionicons name="arrow-forward-circle-outline" size={14} color={PathB.ink} />
                  <Text style={[styles.nextStepsLabel, { color: PathB.ink }]}>
                    Next Steps
                  </Text>
                </View>
                <View style={styles.nextStepsGrid}>
                  {node.scriptureRefs.length > 0 && (
                    <Pressable
                      onPress={() => navigateToScripture(node.scriptureRefs[0], translation)}
                      style={({ pressed }) => [
                        styles.nextStepButton,
                        {
                          backgroundColor: SWEEP_LIGHT.backgroundSecondary,
                          borderColor: theme.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="book-outline" size={16} color={PathB.ink} />
                      <Text style={[styles.nextStepText, { color: PathB.ink }]} numberOfLines={1}>
                        Read the key passage
                      </Text>
                    </Pressable>
                  )}
                  {node.linkedProphecyIds.length > 0 && (
                    <Pressable
                      onPress={() => router.push("/prophecy-explorer" as any)}
                      style={({ pressed }) => [
                        styles.nextStepButton,
                        {
                          backgroundColor: "rgba(139, 92, 246, 0.08)",
                          borderColor: "rgba(139, 92, 246, 0.2)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="telescope-outline" size={16} color="#8B5CF6" />
                      <Text style={[styles.nextStepText, { color: "#8B5CF6" }]} numberOfLines={1}>
                        Explore related prophecy
                      </Text>
                    </Pressable>
                  )}
                  {linkedBeliefData.length > 0 && (
                    <Pressable
                      onPress={() => router.push("/sda-studies" as any)}
                      style={({ pressed }) => [
                        styles.nextStepButton,
                        {
                          backgroundColor: "rgba(46, 125, 50, 0.08)",
                          borderColor: "rgba(46, 125, 50, 0.2)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#2E7D32" />
                      <Text style={[styles.nextStepText, { color: "#2E7D32" }]} numberOfLines={1}>
                        Open related belief
                      </Text>
                    </Pressable>
                  )}
                  {(node.linkedTrackId || node.linkedDevotionalTheme) && (
                    <Pressable
                      onPress={() =>
                        node.linkedTrackId
                          ? router.push(`/study-path/${node.linkedTrackId}` as any)
                          : router.push("/devotions" as any)
                      }
                      style={({ pressed }) => [
                        styles.nextStepButton,
                        {
                          backgroundColor: "rgba(59, 130, 246, 0.08)",
                          borderColor: "rgba(59, 130, 246, 0.2)",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="compass-outline" size={16} color="#3B82F6" />
                      <Text style={[styles.nextStepText, { color: "#3B82F6" }]} numberOfLines={1}>
                        Begin a guided study
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function GreatControversyScreen() {
  const theme = SWEEP_LIGHT;
  const insets = useSafeAreaInsets();
  const { depth } = useStudyDepth();
  const { translation } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string>(TIMELINE_PHASES[0].id);
  const [viewedNodes, setViewedNodes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const phaseScrollRef = useRef<ScrollView>(null);
  const nodePositions = useRef<Record<string, number>>({});
  const phaseChipPositions = useRef<Record<string, number>>({});

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const restoredPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(GC_PROGRESS_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.viewedNodes) setViewedNodes(new Set(data.viewedNodes));
          if (data.lastPhase) {
            setActivePhaseId(data.lastPhase);
            restoredPhaseRef.current = data.lastPhase;
          }
        }
      } catch {}
    })();
  }, []);

  const markNodeViewed = useCallback(async (nodeId: string) => {
    setViewedNodes((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      AsyncStorage.setItem(GC_PROGRESS_KEY, JSON.stringify({
        viewedNodes: Array.from(next),
        lastPhase: activePhaseId,
      })).catch(() => {});
      return next;
    });
  }, [activePhaseId]);

  const isPhaseViewed = useCallback((phaseId: string) => {
    const phase = TIMELINE_PHASES.find((p) => p.id === phaseId);
    if (!phase) return false;
    return phase.nodeIds.every((nid) => viewedNodes.has(nid));
  }, [viewedNodes]);

  const toggleNode = useCallback((id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) markNodeViewed(id);
      return next;
    });
  }, [markNodeViewed]);

  const handleNodeLayout = useCallback((nodeId: string, y: number) => {
    nodePositions.current[nodeId] = y;
  }, []);

  const scrollToPhase = useCallback((phaseId: string) => {
    const phase = TIMELINE_PHASES.find((p) => p.id === phaseId);
    if (!phase) return;
    const firstNodeId = phase.nodeIds[0];
    const y = nodePositions.current[firstNodeId];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: y - 10, animated: true });
    }
    setActivePhaseId(phaseId);
    const chipX = phaseChipPositions.current[phaseId];
    if (chipX !== undefined && phaseScrollRef.current) {
      phaseScrollRef.current.scrollTo({ x: Math.max(0, chipX - 40), animated: true });
    }
  }, []);

  useEffect(() => {
    if (!restoredPhaseRef.current) return;
    const timer = setTimeout(() => {
      if (restoredPhaseRef.current) {
        scrollToPhase(restoredPhaseRef.current);
        restoredPhaseRef.current = null;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [scrollToPhase]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y + 120;
    let currentPhase = TIMELINE_PHASES[0].id;
    for (const phase of TIMELINE_PHASES) {
      const firstNodeY = nodePositions.current[phase.nodeIds[0]];
      if (firstNodeY !== undefined && scrollY >= firstNodeY) {
        currentPhase = phase.id;
      }
    }
    if (currentPhase !== activePhaseId) {
      setActivePhaseId(currentPhase);
      AsyncStorage.setItem(GC_PROGRESS_KEY, JSON.stringify({
        viewedNodes: Array.from(viewedNodes),
        lastPhase: currentPhase,
      })).catch(() => {});
    }
  }, [activePhaseId, viewedNodes]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="The Great Controversy"
        subtitle="The Cosmic Conflict Unveiled"
      />

      <View style={[styles.phaseBarContainer, { borderBottomColor: theme.border }]}>
        <ScrollView
          ref={phaseScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseBarContent}
        >
          {TIMELINE_PHASES.map((phase) => {
            const isActive = phase.id === activePhaseId;
            const viewed = isPhaseViewed(phase.id);
            return (
              <Pressable
                key={phase.id}
                onPress={() => scrollToPhase(phase.id)}
                onLayout={(e) => {
                  phaseChipPositions.current[phase.id] = e.nativeEvent.layout.x;
                }}
                style={[
                  styles.phaseChip,
                  {
                    backgroundColor: isActive
                      ? SWEEP_LIGHT.backgroundSecondary
                      : viewed
                      ? "rgba(46, 125, 50, 0.08)"
                      : PathB.surfaceCard,
                    borderColor: isActive
                      ? PathB.ink
                      : viewed
                      ? "rgba(46, 125, 50, 0.3)"
                      : theme.border,
                  },
                ]}
              >
                {viewed && !isActive && (
                  <Ionicons name="checkmark-circle" size={12} color="#2E7D32" style={{ marginRight: 2 }} />
                )}
                <Text
                  style={[
                    styles.phaseChipText,
                    {
                      color: isActive ? PathB.ink : viewed ? "#2E7D32" : theme.textMuted,
                    },
                  ]}
                >
                  {phase.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.legendRow}>
          {LEGEND_ITEMS.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={64}
      >
        <View style={styles.introBlock}>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            From Creation to the New Earth, trace the cosmic conflict between
            Christ and Satan through the lens of Adventist theology. Tap any
            event to explore its scriptures, connected beliefs, and significance.
          </Text>
          <SDAVerifiedBadge />
        </View>

        <View style={styles.teacherVideosSection}>
          <Text style={styles.teacherVideosHeading}>From SDA Teachers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.teacherVideosRow}
          >
            {PROPHECY_VIDEOS.greatControversy.map((video) => (
              <Pressable
                key={video.id}
                onPress={() =>
                  router.push({
                    pathname: "/sermon-player",
                    params: {
                      videoId: video.id,
                      title: video.title,
                      speaker: video.teacher,
                    },
                  })
                }
                style={styles.teacherVideoCard}
              >
                <View style={styles.teacherThumbWrap}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` }}
                    style={styles.teacherThumb}
                  />
                  <View style={styles.teacherPlayOverlay}>
                    <View style={styles.teacherPlayCircle}>
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.teacherDurationBadge}>
                    <Text style={styles.teacherDurationText}>{video.duration}</Text>
                  </View>
                </View>
                <Text style={[styles.teacherVideoTitle, { color: theme.text }]} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={[styles.teacherVideoTeacher, { color: theme.textMuted }]} numberOfLines={1}>
                  {video.teacher}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.timeline}>
          {GC_NODES.map((node) => (
            <View
              key={node.id}
              onLayout={(e) => handleNodeLayout(node.id, e.nativeEvent.layout.y)}
            >
              <NodeCard
                node={node}
                isExpanded={expandedId === node.id}
                onToggle={() => toggleNode(node.id)}
                theme={theme}
                depth={depth}
                translation={translation}
              />
            </View>
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
  teacherVideosSection: {
    paddingHorizontal: 8,
    marginBottom: 12,
    gap: 10,
  },
  teacherVideosHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: 16,
    lineHeight: 22,
    color: PathB.ink,
    marginLeft: 16,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  teacherVideosRow: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 12,
  },
  teacherVideoCard: {
    width: 220,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    padding: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  teacherThumbWrap: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  teacherThumb: {
    width: "100%",
    height: 124,
    backgroundColor: "#1F2937",
  },
  teacherPlayOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherPlayCircle: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    padding: 8,
  },
  teacherDurationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: PathB.ink,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  teacherDurationText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  teacherVideoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
  },
  teacherVideoTeacher: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: PathB.coral,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 3,
  },
  youAreHereText: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#FFFFFF",
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
  conflictThreadBox: {
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  conflictThreadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  conflictThreadLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  conflictThreadText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  egwLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  egwLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    flex: 1,
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
  nextStepsSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  nextStepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nextStepsLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  nextStepsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  nextStepButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  nextStepText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
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
  phaseBarContainer: {
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  phaseBarContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 6,
  },
  phaseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  phaseChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 12,
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
  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
});
