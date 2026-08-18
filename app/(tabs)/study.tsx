import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { safeGoBack } from "@/lib/safe-back";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import StudyDepthSelector from "@/components/StudyDepthSelector";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import { useTutorial } from "@/contexts/TutorialContext";

type Tab = "word" | "context" | "voices" | "application";

const LAYER_ORDER: Tab[] = ["word", "context", "voices", "application"];
const LAYER_LABELS: Record<Tab, string> = {
  word: "Observe",
  context: "Context",
  voices: "Insight",
  application: "Respond",
};

const LAYER_GUIDANCE: Record<Tab, string> = {
  word: "Notice what the passage says.",
  context: "Understand when, why, and to whom it was written.",
  voices: "Discern what the passage teaches.",
  application: "Let Scripture shape your life and prayer.",
};

const LAYER_PURPOSE: Record<Tab, string> = {
  word: "Read slowly. What stands out to you?",
  context: "Who wrote this, and why? How does that change what you see?",
  voices: "What does this passage teach? Let trusted voices sharpen your reading.",
  application: "What will you do with what you've learned?",
};

const DEPTH_INFO: Record<string, { encouragement: string; description: string }> = {
  Emerging: { encouragement: "You've begun reflecting on this passage.\nContinue responding to deepen your study.", description: "First steps into the Word" },
  Growing: { encouragement: "Your study is gaining depth.\nKeep engaging with Insight and Respond layers.", description: "Building understanding" },
  Deep: { encouragement: "You're dwelling richly in the Word.\nScripture is taking root in your thinking.", description: "Rooted in the Word" },
  Transforming: { encouragement: "Scripture is shaping how you see and live.\nThis is the heart of discipleship.", description: "The Word at work in you" },
};

const DEPTH_LEVELS = ["Emerging", "Growing", "Deep", "Transforming"];

interface LayerCompletionEntry {
  bookId: number;
  chapter: number;
  layer: string;
  completedAt: string;
}

interface LayerProgress {
  layer: Tab;
  filledSections: number;
  totalSections: number;
}

function computeNextStep(
  completedLayers: Set<string>,
  layerProgress: Map<Tab, LayerProgress>,
  activeTab: Tab,
): string | null {
  for (const layer of LAYER_ORDER) {
    if (completedLayers.has(layer)) continue;
    const progress = layerProgress.get(layer);
    if (layer === "voices" || layer === "application") {
      if (progress && progress.filledSections < progress.totalSections) {
        const remaining = progress.totalSections - progress.filledSections;
        return `Continue ${LAYER_LABELS[layer]}: ${remaining} prompt${remaining > 1 ? "s" : ""} remaining`;
      }
      if (progress && progress.filledSections >= progress.totalSections) {
        return `Finish ${LAYER_LABELS[layer]}: Mark layer complete`;
      }
    }
    return `Next: Complete ${LAYER_LABELS[layer]}`;
  }
  return null;
}

function isLayerAccessible(layer: Tab, completedLayers: Set<string>): boolean {
  const idx = LAYER_ORDER.indexOf(layer);
  if (idx === 0) return true;
  return completedLayers.has(LAYER_ORDER[idx - 1]);
}

function LayerProgressBar({
  activeTab,
  completedLayers,
  onTabPress,
  theme,
  nextStepText,
  depthLabel,
}: {
  activeTab: Tab;
  completedLayers: Set<string>;
  onTabPress: (tab: Tab) => void;
  theme: typeof Colors.light;
  nextStepText: string | null;
  depthLabel: string | null;
}) {
  const allDone = LAYER_ORDER.every((l) => completedLayers.has(l));

  const depthColor = depthLabel === "Transforming" ? "#C24431" : depthLabel === "Deep" ? "#8B5CF6" : depthLabel === "Growing" ? "#C24431" : theme.textMuted;

  return (
    <View style={lpStyles.container}>
      {depthLabel && (
        <View style={lpStyles.depthRow}>
          <Ionicons
            name={depthLabel === "Transforming" ? "diamond" : depthLabel === "Deep" ? "flame" : depthLabel === "Growing" ? "trending-up" : "leaf-outline"}
            size={13}
            color={depthColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={[lpStyles.depthLabel, { color: depthColor, fontFamily: "Inter_500Medium" }]}>
              Study Depth: {depthLabel}
            </Text>
            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              {DEPTH_INFO[depthLabel]?.encouragement.split("\n")[0]}
            </Text>
          </View>
        </View>
      )}
      <View style={lpStyles.bar}>
        {LAYER_ORDER.map((layer, i) => {
          const isActive = activeTab === layer;
          const isCompleted = completedLayers.has(layer);
          const accessible = isLayerAccessible(layer, completedLayers);
          const isLocked = !accessible && !isCompleted;
          return (
            <Pressable
              key={layer}
              onPress={() => {
                if (isLocked) return;
                onTabPress(layer);
              }}
              style={[
                lpStyles.segment,
                i === 0 && lpStyles.segmentFirst,
                i === LAYER_ORDER.length - 1 && lpStyles.segmentLast,
                isActive && { backgroundColor: theme.accentDark },
                !isActive && { backgroundColor: theme.backgroundSecondary },
                isLocked && { opacity: 0.4 },
              ]}
            >
              {isLocked && (
                <Ionicons name="lock-closed" size={10} color={theme.textMuted} style={lpStyles.check} />
              )}
              {!isLocked && isCompleted && !isActive && (
                <Ionicons name="checkmark-circle" size={12} color={theme.accent} style={lpStyles.check} />
              )}
              {!isLocked && isCompleted && isActive && (
                <Ionicons name="checkmark-circle" size={12} color="#fff" style={lpStyles.check} />
              )}
              <Text
                style={[
                  lpStyles.label,
                  { color: isActive ? "#fff" : isLocked ? theme.textMuted : theme.textSecondary },
                  isActive && { fontFamily: "Inter_600SemiBold" },
                  !isActive && { fontFamily: "Inter_400Regular" },
                ]}
                numberOfLines={1}
              >
                {LAYER_LABELS[layer]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {nextStepText && !allDone && (
        <View style={lpStyles.nextStepRow}>
          <Ionicons name="arrow-forward-circle-outline" size={14} color={theme.accent} />
          <Text style={[lpStyles.nextStepText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {nextStepText}
          </Text>
        </View>
      )}
      {allDone && (
        <View style={lpStyles.nextStepRow}>
          <Ionicons name="checkmark-done-circle" size={14} color={theme.accent} />
          <Text style={[lpStyles.nextStepText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
            All 4 layers complete
          </Text>
        </View>
      )}
    </View>
  );
}

function NextLayerCTA({
  activeTab,
  completedLayers,
  onMarkComplete,
  onNextLayer,
  onAllComplete,
  isCompleted,
  canComplete,
  hasEntries,
  theme,
}: {
  activeTab: Tab;
  completedLayers: Set<string>;
  onMarkComplete: () => void;
  onNextLayer: () => void;
  onAllComplete: () => void;
  isCompleted: boolean;
  canComplete: boolean;
  hasEntries: boolean;
  theme: typeof Colors.light;
}) {
  const currentIndex = LAYER_ORDER.indexOf(activeTab);
  const hasNext = currentIndex < LAYER_ORDER.length - 1;
  const nextLabel = hasNext ? LAYER_LABELS[LAYER_ORDER[currentIndex + 1]] : null;
  const isReflectiveLayer = activeTab === "voices" || activeTab === "application";
  const allDone = LAYER_ORDER.every((l) => completedLayers.has(l));

  const isLastLayer = !hasNext;
  const actionLabel = allDone
    ? "Complete Study"
    : !isCompleted
    ? (hasNext ? `Continue to ${nextLabel}` : "Complete Study")
    : (hasNext ? `Continue to ${nextLabel}` : "Complete Study");

  const handlePress = () => {
    if (allDone) {
      onAllComplete();
    } else if (!isCompleted) {
      onMarkComplete();
      if (hasNext) {
        setTimeout(() => onNextLayer(), 200);
      } else {
        setTimeout(() => onAllComplete(), 200);
      }
    } else if (hasNext) {
      onNextLayer();
    } else {
      onAllComplete();
    }
  };

  if (!canComplete) return null;

  return (
    <View style={ctaStyles.container}>
      {!isCompleted && isReflectiveLayer && !hasEntries && (
        <Text style={[ctaStyles.gentleNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Your study deepens when you write a response.
        </Text>
      )}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [ctaStyles.btn, { backgroundColor: theme.accentDark, opacity: pressed ? 0.88 : 1 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID={allDone || isLastLayer ? "view-study-complete" : isCompleted ? "next-layer" : "mark-layer-complete"}
      >
        <Text style={ctaStyles.btnText}>{actionLabel}</Text>
        <Ionicons name={allDone || isLastLayer ? "checkmark-done" : "arrow-forward"} size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const LAYER_COACH_TIPS: Record<Tab, { id: string; icon: keyof typeof Ionicons.glyphMap; title: string; description: string }> = {
  word: {
    id: "study_layer_observe",
    icon: "eye-outline",
    title: "Step 1: Observe",
    description: "Read the passage slowly and carefully. Notice repeated words, key phrases, and what stands out. Mark the text complete when you've studied it thoroughly.",
  },
  context: {
    id: "study_layer_context",
    icon: "time-outline",
    title: "Step 2: Context",
    description: "Explore the historical and literary context. Who wrote this? When and why? Understanding the setting reveals deeper meaning in God's Word.",
  },
  voices: {
    id: "study_layer_insight",
    icon: "people-outline",
    title: "Step 3: Insight",
    description: "Learn from trusted commentators and Bible scholars. See how the passage connects to the full story of Scripture and points to Christ.",
  },
  application: {
    id: "study_layer_respond",
    icon: "heart-outline",
    title: "Step 4: Respond",
    description: "Let Scripture transform your life. Write a personal response, form a prayer, and identify one thing you'll do differently because of what God has shown you.",
  },
};

function LayerCoachBanner({ activeTab, theme }: { activeTab: Tab; theme: typeof Colors.light }) {
  const { hasSeenTutorial, markTutorialSeen } = useTutorial();
  const tip = LAYER_COACH_TIPS[activeTab];
  const tutId = tip.id as any;

  if (hasSeenTutorial(tutId)) return null;

  return (
    <View style={{
      backgroundColor: theme.accent + "10",
      borderWidth: 1,
      borderColor: theme.accent + "25",
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      gap: 8,
    }}>
      <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 10 }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.accent + "20",
          alignItems: "center" as const,
          justifyContent: "center" as const,
        }}>
          <Ionicons name={tip.icon} size={16} color={theme.accent} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: theme.accentDark }}>
          {tip.title}
        </Text>
        <Pressable
          onPress={() => markTutorialSeen(tutId)}
          hitSlop={12}
          style={{ padding: 4 }}
        >
          <Ionicons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
      <Text style={{ fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
        {tip.description}
      </Text>
    </View>
  );
}

function StudyCompletionScreen({
  reference,
  completedLayers,
  depthLabel,
  observeJournalMap,
  contextJournalMap,
  insightJournalMap,
  transformJournalMap,
  onStudyAnother,
  onReview,
  onSavePrayer,
  onNextChapter,
  hasPrayerContent,
  hasNextChapter,
  theme,
}: {
  reference: string;
  completedLayers: Set<string>;
  depthLabel: string | null;
  observeJournalMap: Map<string, string>;
  contextJournalMap: Map<string, string>;
  insightJournalMap: Map<string, string>;
  transformJournalMap: Map<string, string>;
  onStudyAnother: () => void;
  onReview: () => void;
  onSavePrayer: () => void;
  onNextChapter: () => void;
  hasPrayerContent: boolean;
  hasNextChapter: boolean;
  theme: typeof Colors.light;
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const depthColor = depthLabel === "Transforming" ? "#C24431" : depthLabel === "Deep" ? "#8B5CF6" : depthLabel === "Growing" ? "#C24431" : theme.textMuted;

  const observeFilled = OBSERVE_SECTIONS.filter((s) => observeJournalMap.has(s.key));
  const contextFilled = CONTEXT_SECTIONS.filter((s) => contextJournalMap.has(s.key));
  const insightFilled = INSIGHT_SECTIONS.filter((s) => insightJournalMap.has(s.key));
  const transformFilled = TRANSFORMATION_SECTIONS.filter((s) => transformJournalMap.has(s.key));
  const allEntries = [
    ...observeFilled.map((s) => ({ ...s, content: observeJournalMap.get(s.key) ?? "", layerLabel: "Observe" })),
    ...contextFilled.map((s) => ({ ...s, content: contextJournalMap.get(s.key) ?? "", layerLabel: "Context" })),
    ...insightFilled.map((s) => ({ ...s, content: insightJournalMap.get(s.key) ?? "", layerLabel: "Insight" })),
    ...transformFilled.map((s) => ({ ...s, content: transformJournalMap.get(s.key) ?? "", layerLabel: "Respond" })),
  ];
  const summaryText = useMemo(
    () => formatStudySummary(reference, completedLayers, observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap, depthLabel),
    [reference, completedLayers, observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap, depthLabel]
  );

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [summaryText]);

  const handleShare = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return;
      const fileUri = FileSystem.cacheDirectory + "study-summary.txt";
      await FileSystem.writeAsStringAsync(fileUri, summaryText, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: "Share Study Summary" });
    } catch {}
  }, [summaryText]);

  const WRAP_UP_LABELS: Record<string, string> = {
    Observe: "What you noticed",
    Context: "What the context clarified",
    Insight: "What truth stood out",
    Respond: "What you will carry forward",
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >

      <Pressable
        onPress={() => router.push("/(tabs)/explore")}
        hitSlop={12}
        style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginBottom: 12 }}
      >
        <Ionicons name="chevron-back" size={18} color={theme.accent} />
        <Text style={{ fontSize: 13, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>Back to Study</Text>
      </Pressable>
      <View style={{ alignItems: "center" as const, marginBottom: 24 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent + "18", alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 14, marginTop: 8 }}>
          <Ionicons name="ribbon" size={28} color={theme.accent} />
        </View>
        <Text style={{ fontSize: 20, color: theme.text, fontFamily: "Lora_700Bold", textAlign: "center" as const, marginBottom: 4 }}>
          Study Complete
        </Text>
        <Text style={{ fontSize: 15, color: theme.accentDark, fontFamily: "Lora_600SemiBold", textAlign: "center" as const, marginBottom: 10 }}>
          {reference}
        </Text>
        {depthLabel && (
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" as const, lineHeight: 19 }}>
            {DEPTH_INFO[depthLabel]?.encouragement?.replace("\n", " ")}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row" as const, gap: 6, marginBottom: 20 }}>
        {LAYER_ORDER.map((layer) => {
          const done = completedLayers.has(layer);
          return (
            <View key={layer} style={{ flex: 1, alignItems: "center" as const, gap: 4 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? theme.accent : theme.backgroundSecondary, alignItems: "center" as const, justifyContent: "center" as const }}>
                {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.textMuted + "40" }} />}
              </View>
              <Text style={{ fontSize: 10, color: done ? theme.text : theme.textMuted, fontFamily: done ? "Inter_600SemiBold" : "Inter_400Regular" }}>
                {LAYER_LABELS[layer]}
              </Text>
            </View>
          );
        })}
      </View>

      {allEntries.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          {(["Observe", "Context", "Insight", "Respond"] as const).map((layerLabel) => {
            const layerEntries = allEntries.filter((e) => e.layerLabel === layerLabel);
            if (layerEntries.length === 0) return null;
            return (
              <View key={layerLabel} style={{ backgroundColor: theme.backgroundCard, borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 10 }}>
                  {WRAP_UP_LABELS[layerLabel] ?? layerLabel}
                </Text>
                {layerEntries.map((entry, i) => (
                  <View key={entry.key} style={{ marginBottom: i < layerEntries.length - 1 ? 10 : 0 }}>
                    <Text style={{ fontSize: 14, lineHeight: 21, color: theme.text, fontFamily: "Inter_400Regular" }}>
                      {entry.content}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      <View style={{ backgroundColor: theme.backgroundCard, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, marginBottom: 20, overflow: "hidden" as const }}>
        <Pressable
          onPress={() => setSummaryExpanded(!summaryExpanded)}
          style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 16 }}
        >
          <Ionicons name="document-text-outline" size={16} color={theme.accent} />
          <Text style={{ flex: 1, fontSize: 14, color: theme.text, fontFamily: "Inter_600SemiBold" }}>
            Full Study Record
          </Text>
          <Ionicons name={summaryExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
        </Pressable>
        {summaryExpanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 20 }} selectable>
              {summaryText}
            </Text>
            <View style={{ flexDirection: "row" as const, gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.85 : 1 })}
                testID="copy-study-summary"
              >
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={copied ? "#2E7D32" : theme.accent} />
                <Text style={{ fontSize: 13, color: copied ? "#2E7D32" : theme.accent, fontFamily: "Inter_500Medium" }}>
                  {copied ? "Copied" : "Copy"}
                </Text>
              </Pressable>
              {Platform.OS !== "web" && (
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.85 : 1 })}
                  testID="share-study-summary"
                >
                  <Ionicons name="share-outline" size={15} color={theme.accent} />
                  <Text style={{ fontSize: 13, color: theme.accentDark, fontFamily: "Inter_500Medium" }}>
                    Share
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {hasPrayerContent && (
        <Pressable
          onPress={onSavePrayer}
          style={({ pressed }) => ({ width: "100%" as const, borderWidth: 1, borderColor: theme.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 8, opacity: pressed ? 0.85 : 1, marginBottom: 10 })}
          testID="save-prayer-from-completion"
        >
          <Ionicons name="bookmark-outline" size={16} color={theme.accent} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: theme.accentDark }}>
            Save Prayer Response
          </Text>
        </Pressable>
      )}

      {hasNextChapter && (
        <Pressable
          onPress={onNextChapter}
          style={({ pressed }) => ({ width: "100%" as const, backgroundColor: theme.accentDark, borderRadius: 14, paddingVertical: 16, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 8, opacity: pressed ? 0.85 : 1, marginBottom: 10 })}
          testID="study-next-chapter"
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
            Study the Next Chapter
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onStudyAnother}
        style={({ pressed }) => ({ width: "100%" as const, backgroundColor: hasNextChapter ? theme.accent + "12" : theme.accentDark, borderRadius: 14, paddingVertical: hasNextChapter ? 14 : 16, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 8, opacity: pressed ? 0.85 : 1, marginBottom: 10 })}
        testID="study-another-passage"
      >
        <Ionicons name="book-outline" size={hasNextChapter ? 16 : 18} color={hasNextChapter ? theme.accent : "#fff"} />
        <Text style={{ fontSize: hasNextChapter ? 14 : 16, fontFamily: hasNextChapter ? "Inter_500Medium" : "Inter_600SemiBold", color: hasNextChapter ? theme.accentDark : "#fff" }}>
          Study Another Passage
        </Text>
      </Pressable>

      <Pressable
        onPress={onReview}
        style={({ pressed }) => ({ width: "100%" as const, backgroundColor: theme.accent + "12", borderRadius: 14, paddingVertical: 14, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 8, opacity: pressed ? 0.7 : 1 })}
        testID="review-study"
      >
        <Ionicons name="arrow-back" size={16} color={theme.accent} />
        <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.accentDark }}>
          Review This Study
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const DEEP_SESSION_KEY = "@grace-through-faith/deep-session";

type StudyFocus = "single" | "passage" | "chapter";

interface DeepSessionState {
  active: boolean;
  layerIndex: number;
  startedAt: number;
  completedLayersDuringSession: string[];
  bookId: number | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  studyFocus: StudyFocus;
}

function estimateSessionTime(completedLayers: Set<string>): string {
  let remaining = 0;
  for (const layer of LAYER_ORDER) {
    if (!completedLayers.has(layer)) {
      if (layer === "word" || layer === "context") remaining += 4;
      else remaining += 8;
    }
  }
  if (remaining <= 0) return "0 min";
  const low = Math.max(remaining - 3, 1);
  const high = remaining + 5;
  return `${low}\u2013${high} min`;
}

function DeepStudyEntryButton({
  completedLayers,
  onStart,
  theme,
  isPaused,
}: {
  completedLayers: Set<string>;
  onStart: () => void;
  theme: typeof Colors.light;
  isPaused?: boolean;
}) {
  const allDone = LAYER_ORDER.every((l) => completedLayers.has(l));
  if (allDone) return null;

  const timeEst = estimateSessionTime(completedLayers);

  return (
    <Pressable
      onPress={onStart}
      style={({ pressed }) => [
        dsStyles.entryBtn,
        { backgroundColor: theme.accentDark, opacity: pressed ? 0.9 : 1 },
      ]}
      testID="start-deep-study"
    >
      <View style={dsStyles.entryBtnContent}>
        <Ionicons name={isPaused ? "play-circle-outline" : "compass-outline"} size={20} color="#fff" />
        <View style={dsStyles.entryBtnTextWrap}>
          <Text style={[dsStyles.entryBtnTitle, { fontFamily: "Inter_600SemiBold" }]}>
            {isPaused ? "Resume Deep Dive" : "Start Deep Dive"}
          </Text>
          <Text style={[dsStyles.entryBtnSub, { fontFamily: "Inter_400Regular" }]}>
            {isPaused ? "Continue where you left off" : `Step-by-step walkthrough  ${timeEst}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </View>
    </Pressable>
  );
}

interface ChapterSummaryData {
  bigIdea: string;
  narrativeRole: string;
  focusThemes: string[];
  pastoralFrame: string;
  thesisStatement: string | null;
  doctrinalAnchor: string | null;
  narrativePlacement: string | null;
}

const DEEP_INTRO_SEEN_KEY = "@grace-through-faith/deep-intro-seen";

const FOUR_LAYERS = [
  {
    icon: "book-outline" as const,
    title: "Observe",
    desc: "Read the passage closely. What words stand out? What patterns emerge? Start with what the text actually says.",
    color: "#C24431",
  },
  {
    icon: "time-outline" as const,
    title: "Context",
    desc: "Who wrote this, and why? What was happening historically? Context transforms how you understand each verse.",
    color: "#C24431",
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    title: "Insight",
    desc: "What does this passage reveal about God? About us? Draw on commentary, word studies, and the broader story of Scripture.",
    color: "#7C3AED",
  },
  {
    icon: "heart-outline" as const,
    title: "Respond",
    desc: "Let what you have studied shape how you live. Write your response, your prayer, and one thing you will do this week.",
    color: "#E8456B",
  },
];

function FourLayerIntro({
  theme,
  hasPassage,
  onPickPassage,
  onContinue,
}: {
  theme: typeof Colors.light;
  hasPassage: boolean;
  onPickPassage: () => void;
  onContinue: () => void;
}) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DEEP_INTRO_SEEN_KEY).then(v => {
      if (v === "true" && hasPassage) {
        onContinue();
      } else {
        setChecked(true);
      }
    }).catch(() => setChecked(true));
  }, []);

  if (!checked) return null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: theme.accent + "18",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="layers" size={32} color={theme.accent} />
        </View>
        <Text
          style={{
            fontSize: 22,
            color: theme.text,
            fontFamily: "Lora_700Bold",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Deep Dive
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.textSecondary,
            fontFamily: "Inter_400Regular",
            textAlign: "center",
            lineHeight: 21,
            maxWidth: 320,
          }}
        >
          Go beyond surface reading. Four layers guide you from observation to personal response, building real understanding of any passage.
        </Text>
      </View>

      <View style={{ gap: 12, marginBottom: 28 }}>
        {FOUR_LAYERS.map((layer, i) => (
          <View
            key={layer.title}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 14,
              backgroundColor: theme.backgroundCard,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: layer.color + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_700Bold",
                  color: layer.color,
                }}
              >
                {i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Ionicons name={layer.icon} size={15} color={layer.color} />
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: theme.text,
                  }}
                >
                  {layer.title}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: theme.textSecondary,
                  lineHeight: 19,
                }}
              >
                {layer.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        testID="layer-intro-action"
        onPress={hasPassage ? onContinue : onPickPassage}
        style={({ pressed }) => ({
          backgroundColor: theme.accentDark,
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: pressed ? 0.85 : 1,
          marginBottom: 10,
        })}
      >
        <Ionicons
          name={hasPassage ? "arrow-forward" : "book-outline"}
          size={18}
          color="#fff"
        />
        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
          {hasPassage ? "Start Studying" : "Pick a Passage"}
        </Text>
      </Pressable>

      {hasPassage && (
        <Pressable
          onPress={onPickPassage}
          style={({ pressed }) => ({
            backgroundColor: theme.accent + "12",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="book-outline" size={16} color={theme.accent} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.accentDark }}>
            Choose a Different Passage
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

interface PassageSection {
  verseStart: number;
  verseEnd: number;
  label: string;
}

function DeepStudyIntro({
  reference,
  bookId,
  chapter,
  onBegin,
  onCancel,
  theme,
}: {
  reference: string;
  bookId: number | null;
  chapter: number | null;
  onBegin: (focus: StudyFocus, verseStart: number | null, verseEnd: number | null) => void;
  onCancel: () => void;
  theme: typeof Colors.light;
}) {
  const canFetch = bookId !== null && chapter !== null;
  const { data: passageSections, isLoading: sectionsLoading } = useQuery<PassageSection[]>({
    queryKey: [`/api/passage-sections?bookId=${bookId}&chapter=${chapter}`],
    enabled: canFetch,
  });

  const [studyFocus, setStudyFocus] = useState<StudyFocus>("passage");
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
  const [singleVerse, setSingleVerse] = useState(1);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DEEP_INTRO_SEEN_KEY).then(v => setHasSeenIntro(v === "true")).catch(() => setHasSeenIntro(false));
  }, []);

  const sections = passageSections ?? [];
  const selectedSection = sections[selectedSectionIdx] ?? null;
  const maxVerse = sections.length > 0 ? Math.max(...sections.map(s => s.verseEnd)) : 176;

  const focusLabel = useMemo(() => {
    if (studyFocus === "chapter") return "Whole Chapter";
    if (studyFocus === "single") return `Verse ${singleVerse}`;
    if (selectedSection) return `vv. ${selectedSection.verseStart}-${selectedSection.verseEnd}`;
    return "Short Passage";
  }, [studyFocus, singleVerse, selectedSection]);

  const handleBegin = useCallback(() => {
    AsyncStorage.setItem(DEEP_INTRO_SEEN_KEY, "true").catch(() => {});
    if (studyFocus === "chapter") {
      onBegin("chapter", null, null);
    } else if (studyFocus === "single") {
      onBegin("single", singleVerse, singleVerse);
    } else if (selectedSection) {
      onBegin("passage", selectedSection.verseStart, selectedSection.verseEnd);
    } else {
      onBegin("chapter", null, null);
    }
  }, [studyFocus, singleVerse, selectedSection, onBegin]);

  const focusOptions: { id: StudyFocus; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
    { id: "passage", label: "Short Passage", icon: "document-text-outline" },
    { id: "single", label: "Single Verse", icon: "create-outline" },
    { id: "chapter", label: "Whole Chapter", icon: "layers-outline" },
  ];

  if (hasSeenIntro === null) return null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={introStyles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={introStyles.header}>
        <View style={[introStyles.iconCircle, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="compass" size={28} color={theme.accent} />
        </View>
        <Text style={[introStyles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Deep Dive
        </Text>
        <Text style={[introStyles.reference, { color: theme.accent, fontFamily: "Lora_600SemiBold" }]}>
          {reference}
        </Text>
        {!hasSeenIntro && (
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" as const, lineHeight: 19, maxWidth: 300, marginTop: 6 }}>
            Four layers of study, each building on the last, taking you from reading to response.
          </Text>
        )}
      </View>

      {hasSeenIntro && (
        <View style={{ alignItems: "center" as const, gap: 8, marginBottom: 16 }}>
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 4, backgroundColor: theme.backgroundCard, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
            <Ionicons name="layers-outline" size={13} color={theme.textMuted} />
            <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: "Inter_500Medium" }}>Observe</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted }}>{">"}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: "Inter_500Medium" }}>Context</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted }}>{">"}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: "Inter_500Medium" }}>Insight</Text>
            <Text style={{ fontSize: 10, color: theme.textMuted }}>{">"}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: "Inter_500Medium" }}>Respond</Text>
          </View>
          <Pressable
            onPress={() => { AsyncStorage.removeItem(DEEP_INTRO_SEEN_KEY).catch(() => {}); setHasSeenIntro(false); }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular", textDecorationLine: "underline" as const }}>
              How Deep Dive works
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[introStyles.bigIdeaCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Text style={[introStyles.bigIdeaLabel, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
          STUDY FOCUS
        </Text>
        {!hasSeenIntro && (
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 }}>
            Choose how much Scripture to study in this session.
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, marginTop: hasSeenIntro ? 8 : 0 }}>
          {focusOptions.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setStudyFocus(opt.id)}
              style={[
                {
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  alignItems: "center" as const,
                  borderWidth: 1.5,
                  borderColor: studyFocus === opt.id ? theme.accent : theme.border,
                  backgroundColor: studyFocus === opt.id ? theme.accent + "14" : "transparent",
                },
              ]}
            >
              <Ionicons name={opt.icon} size={18} color={studyFocus === opt.id ? theme.accent : theme.textMuted} />
              <Text style={{ fontSize: 11, color: studyFocus === opt.id ? theme.accentDark : theme.textSecondary, fontFamily: "Inter_500Medium", marginTop: 4, textAlign: "center" as const }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {studyFocus === "passage" && (
          sectionsLoading ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 8 }} />
          ) : sections.length > 0 ? (
            <View style={{ gap: 6 }}>
              {sections.map((sec, i) => (
                <Pressable
                  key={i}
                  onPress={() => setSelectedSectionIdx(i)}
                  style={[
                    {
                      flexDirection: "row",
                      alignItems: "center" as const,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selectedSectionIdx === i ? theme.accent : theme.border,
                      backgroundColor: selectedSectionIdx === i ? theme.accent + "10" : "transparent",
                      gap: 10,
                    },
                  ]}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: selectedSectionIdx === i ? theme.accentDark : theme.textMuted + "30", alignItems: "center" as const, justifyContent: "center" as const }}>
                    <Text style={{ fontSize: 12, color: selectedSectionIdx === i ? "#fff" : theme.textMuted, fontFamily: "Inter_600SemiBold" }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: theme.text, fontFamily: "Inter_500Medium" }}>
                      vv. {sec.verseStart}-{sec.verseEnd}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontFamily: "Inter_400Regular" }} numberOfLines={1}>
                      {sec.label}
                    </Text>
                  </View>
                  {selectedSectionIdx === i && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          ) : null
        )}

        {studyFocus === "single" && (
          <View style={{ flexDirection: "row", alignItems: "center" as const, gap: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>
              Verse:
            </Text>
            <Pressable
              onPress={() => setSingleVerse(Math.max(1, singleVerse - 1))}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.accent + "18", alignItems: "center" as const, justifyContent: "center" as const }}
            >
              <Ionicons name="remove" size={18} color={theme.accent} />
            </Pressable>
            <Text style={{ fontSize: 18, color: theme.text, fontFamily: "Inter_600SemiBold", minWidth: 32, textAlign: "center" as const }}>
              {singleVerse}
            </Text>
            <Pressable
              onPress={() => setSingleVerse(Math.min(maxVerse, singleVerse + 1))}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.accent + "18", alignItems: "center" as const, justifyContent: "center" as const }}
            >
              <Ionicons name="add" size={18} color={theme.accent} />
            </Pressable>
          </View>
        )}

        {studyFocus === "chapter" && (
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", fontStyle: "italic" }}>
            Study every verse in the chapter -- best for shorter chapters.
          </Text>
        )}
      </View>

      {!hasSeenIntro && (
        <>
          <Text style={[introStyles.layersHeading, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            The Four Layers
          </Text>
          {[
            { icon: "book-outline" as const, title: "Observe", desc: "Read the passage carefully and notice what stands out" },
            { icon: "time-outline" as const, title: "Context", desc: "Discover the historical and cultural setting" },
            { icon: "chatbubble-ellipses-outline" as const, title: "Insight", desc: "Hear from theologians and historic voices" },
            { icon: "heart-outline" as const, title: "Respond", desc: "Apply the passage through reflection and prayer" },
          ].map((layer, i) => (
            <View key={i} style={[introStyles.layerRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={[introStyles.layerIcon, { backgroundColor: theme.accent + "12" }]}>
                <Ionicons name={layer.icon} size={18} color={theme.accent} />
              </View>
              <View style={introStyles.layerInfo}>
                <Text style={[introStyles.layerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {i + 1}. {layer.title}
                </Text>
                <Text style={[introStyles.layerDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {layer.desc}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      <Pressable
        onPress={handleBegin}
        style={({ pressed }) => [introStyles.beginBtn, { backgroundColor: theme.accentDark, opacity: pressed ? 0.9 : 1 }]}
        testID="begin-deep-study"
      >
        <Ionicons name="book-outline" size={18} color="#fff" />
        <Text style={[introStyles.beginBtnText, { fontFamily: "Inter_600SemiBold" }]}>
          Begin Study ({focusLabel})
        </Text>
      </Pressable>

      <Pressable onPress={onCancel} hitSlop={8} style={introStyles.cancelBtn}>
        <Text style={[introStyles.cancelText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          Study Without Guide
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const introStyles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    alignItems: "center" as const,
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 24,
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
  },
  reference: {
    fontSize: 18,
  },
  bigIdeaCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 24,
    width: "100%" as const,
  },
  bigIdeaLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  bigIdeaText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  focusLine: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic" as const,
  },
  layersHeading: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    alignSelf: "flex-start" as const,
    marginBottom: 12,
  },
  layerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
    width: "100%" as const,
    gap: 12,
  },
  layerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  layerInfo: {
    flex: 1,
  },
  layerTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  layerDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  beginBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    width: "100%" as const,
  },
  beginBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 14,
    padding: 8,
  },
  cancelText: {
    fontSize: 14,
  },
  themesRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  themeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  themeTagText: {
    fontSize: 12,
  },
  pastoralText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});

const lexicalStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
  },
  optionalTag: {
    fontSize: 11,
  },
  expandedSection: {
    marginTop: 4,
    marginBottom: 8,
  },
});

function DeepSessionBar({
  layerIndex,
  onExit,
  theme,
}: {
  layerIndex: number;
  onExit: () => void;
  theme: typeof Colors.light;
}) {
  return (
    <View style={[dsStyles.sessionBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
      <View style={dsStyles.sessionBarLeft}>
        <View style={[dsStyles.sessionBadge, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="compass" size={12} color={theme.accent} />
          <Text style={[dsStyles.sessionBadgeText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
            DEEP DIVE
          </Text>
        </View>
        <View style={dsStyles.sessionDots}>
          {LAYER_ORDER.map((_, i) => (
            <View
              key={i}
              style={[
                dsStyles.sessionDot,
                i <= layerIndex
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: theme.border },
                i === layerIndex && dsStyles.sessionDotActive,
              ]}
            />
          ))}
        </View>
        <Text style={[dsStyles.sessionStepText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Step {layerIndex + 1} of 4
        </Text>
      </View>
      <Pressable
        onPress={onExit}
        hitSlop={8}
        style={({ pressed }) => [dsStyles.exitSessionBtn, { opacity: pressed ? 0.7 : 1 }]}
        testID="exit-deep-session"
      >
        <Text style={[dsStyles.exitSessionText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          Pause Session
        </Text>
      </Pressable>
    </View>
  );
}

function DeepSessionAdvanceButton({
  layerIndex,
  isLastLayer,
  onAdvance,
  onFinish,
  onMarkComplete,
  isCompleted,
  theme,
}: {
  layerIndex: number;
  isLastLayer: boolean;
  onAdvance: () => void;
  onFinish: () => void;
  onMarkComplete: () => void;
  isCompleted: boolean;
  theme: typeof Colors.light;
}) {
  const handlePress = () => {
    if (!isCompleted) onMarkComplete();
    if (isLastLayer) onFinish();
    else onAdvance();
  };

  return (
    <View style={dsStyles.advanceContainer}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [dsStyles.advanceBtn, { backgroundColor: theme.accentDark, opacity: pressed ? 0.88 : 1 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="deep-study-advance"
      >
        <Text style={[dsStyles.advanceBtnText, { fontFamily: "Inter_600SemiBold" }]}>
          {isLastLayer ? "Complete Study" : `Continue to ${LAYER_LABELS[LAYER_ORDER[layerIndex + 1]]}`}
        </Text>
        <Ionicons name={isLastLayer ? "checkmark-done" : "arrow-forward"} size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const LAYER_FULL_NAMES: Record<Tab, string> = {
  word: "Observe",
  context: "Context",
  voices: "Insight",
  application: "Respond",
};

function formatStudySummary(
  reference: string,
  allCompletedLayers: Set<string>,
  observeJournalMap: Map<string, string>,
  contextJournalMap: Map<string, string>,
  insightJournalMap: Map<string, string>,
  transformJournalMap: Map<string, string>,
  depthLabel: string | null,
): string {
  const lines: string[] = [];
  lines.push("STUDY SUMMARY");
  lines.push(`Reference: ${reference}`);
  lines.push("");

  lines.push("LAYERS COMPLETED");
  for (const layer of LAYER_ORDER) {
    const status = allCompletedLayers.has(layer) ? "\u2713" : "\u2022";
    lines.push(`  ${status} ${LAYER_FULL_NAMES[layer]}`);
  }
  lines.push("");

  if (depthLabel) {
    lines.push(`Study Depth: ${depthLabel}`);
    lines.push("");
  }

  const filledObserve = OBSERVE_SECTIONS.filter((s) => observeJournalMap.has(s.key));
  if (filledObserve.length > 0) {
    lines.push("OBSERVE");
    for (const section of filledObserve) {
      const content = observeJournalMap.get(section.key) ?? "";
      lines.push(`  ${section.title}:`);
      lines.push(`    ${content.trim()}`);
    }
    lines.push("");
  }

  const filledContext = CONTEXT_SECTIONS.filter((s) => contextJournalMap.has(s.key));
  if (filledContext.length > 0) {
    lines.push("CONTEXT");
    for (const section of filledContext) {
      const content = contextJournalMap.get(section.key) ?? "";
      lines.push(`  ${section.title}:`);
      lines.push(`    ${content.trim()}`);
    }
    lines.push("");
  }

  const filledInsight = INSIGHT_SECTIONS.filter((s) => insightJournalMap.has(s.key));
  if (filledInsight.length > 0) {
    lines.push("INSIGHT");
    for (const section of filledInsight) {
      const content = insightJournalMap.get(section.key) ?? "";
      lines.push(`  ${section.title}:`);
      lines.push(`    ${content.trim()}`);
    }
    lines.push("");
  }

  const filledTransform = TRANSFORMATION_SECTIONS.filter(
    (s) => s.key !== "prayer_response" && transformJournalMap.has(s.key)
  );
  if (filledTransform.length > 0) {
    lines.push("RESPOND");
    for (const section of filledTransform) {
      const content = transformJournalMap.get(section.key) ?? "";
      lines.push(`  ${section.title}:`);
      lines.push(`    ${content.trim()}`);
    }
    lines.push("");
  }

  const prayer = transformJournalMap.get("prayer_response");
  if (prayer && prayer.trim()) {
    lines.push("PRAYER RESPONSE");
    lines.push(`  ${prayer.trim()}`);
    lines.push("");
  }

  return lines.join("\n");
}

function DeepSessionSummary({
  completedDuring,
  allCompletedLayers,
  observeJournalMap,
  contextJournalMap,
  insightJournalMap,
  transformJournalMap,
  startedAt,
  onDone,
  onSavePrayer,
  hasPrayerContent,
  theme,
  reference,
  depthLabel,
}: {
  completedDuring: string[];
  allCompletedLayers: Set<string>;
  observeJournalMap: Map<string, string>;
  contextJournalMap: Map<string, string>;
  insightJournalMap: Map<string, string>;
  transformJournalMap: Map<string, string>;
  startedAt: number;
  onDone: () => void;
  onSavePrayer: () => void;
  hasPrayerContent: boolean;
  theme: typeof Colors.light;
  reference: string;
  depthLabel: string | null;
}) {
  const elapsed = Math.round((Date.now() - startedAt) / 60000);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const observeFilled = OBSERVE_SECTIONS.filter((s) => observeJournalMap.has(s.key));
  const contextFilled = CONTEXT_SECTIONS.filter((s) => contextJournalMap.has(s.key));
  const insightFilled = INSIGHT_SECTIONS.filter((s) => insightJournalMap.has(s.key));
  const transformFilled = TRANSFORMATION_SECTIONS.filter((s) => transformJournalMap.has(s.key));
  const allEntries = [
    ...observeFilled.map((s) => ({ ...s, content: observeJournalMap.get(s.key) ?? "", layerLabel: "Observe" })),
    ...contextFilled.map((s) => ({ ...s, content: contextJournalMap.get(s.key) ?? "", layerLabel: "Context" })),
    ...insightFilled.map((s) => ({ ...s, content: insightJournalMap.get(s.key) ?? "", layerLabel: "Insight" })),
    ...transformFilled.map((s) => ({ ...s, content: transformJournalMap.get(s.key) ?? "", layerLabel: "Respond" })),
  ];

  const summaryText = useMemo(
    () => formatStudySummary(reference, allCompletedLayers, observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap, depthLabel),
    [reference, allCompletedLayers, observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap, depthLabel]
  );

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [summaryText]);

  const handleShare = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return;
      const fileUri = FileSystem.cacheDirectory + "study-summary.txt";
      await FileSystem.writeAsStringAsync(fileUri, summaryText, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: "Share Study Summary" });
    } catch {}
  }, [summaryText]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={dsStyles.summaryContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={dsStyles.summaryHeader}>
        <Ionicons name="compass" size={28} color={theme.accent} />
        <Text style={[dsStyles.summaryTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Deep Dive Complete
        </Text>
        <Text style={[dsStyles.summarySubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {elapsed > 0 ? `${elapsed} minute${elapsed !== 1 ? "s" : ""} of focused study` : "Session complete"}
        </Text>
        <Text style={{ fontSize: 14, color: theme.text, fontFamily: "Lora_400Regular", fontStyle: "italic" as const, textAlign: "center" as const, lineHeight: 21, marginTop: 6, maxWidth: 280 }}>
          You moved from reading to response. Scripture shaped both your understanding and your next step.
        </Text>
        {reference ? (
          <Text style={[dsStyles.summaryRef, { color: theme.accentDark, fontFamily: "Lora_700Bold" }]}>
            {reference}
          </Text>
        ) : null}
      </View>

      <View style={[dsStyles.summaryCard, { backgroundColor: theme.backgroundCard }]}>
        <Text style={[dsStyles.summaryCardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          Layers Covered
        </Text>
        <View style={dsStyles.summaryLayers}>
          {LAYER_ORDER.map((layer) => {
            const done = allCompletedLayers.has(layer);
            const visitedDuring = completedDuring.includes(layer);
            return (
              <View key={layer} style={dsStyles.summaryLayerRow}>
                <Ionicons
                  name={done ? "checkmark-circle" : visitedDuring ? "ellipse-outline" : "remove-outline"}
                  size={18}
                  color={done ? theme.accent : visitedDuring ? theme.textSecondary : theme.textMuted}
                />
                <Text style={[
                  dsStyles.summaryLayerLabel,
                  { color: done ? theme.text : theme.textMuted, fontFamily: done ? "Inter_600SemiBold" : "Inter_400Regular" },
                ]}>
                  {LAYER_FULL_NAMES[layer]}
                </Text>
                {done && <Text style={[dsStyles.summaryLayerCheck, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>Complete</Text>}
              </View>
            );
          })}
        </View>
        {depthLabel && (
          <View style={dsStyles.summaryDepthRow}>
            <Ionicons
              name={depthLabel === "Transforming" ? "diamond" : depthLabel === "Deep" ? "flame" : depthLabel === "Growing" ? "trending-up" : "leaf-outline"}
              size={14}
              color={depthLabel === "Transforming" ? "#C24431" : depthLabel === "Deep" ? "#8B5CF6" : depthLabel === "Growing" ? "#C24431" : theme.textMuted}
            />
            <Text style={[dsStyles.summaryDepthText, {
              color: depthLabel === "Transforming" ? "#C24431" : depthLabel === "Deep" ? "#8B5CF6" : depthLabel === "Growing" ? "#C24431" : theme.textMuted,
              fontFamily: "Inter_500Medium",
            }]}>
              Study Depth: {depthLabel}
            </Text>
          </View>
        )}
      </View>

      {allEntries.length > 0 && (
        <View style={[dsStyles.summaryCard, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[dsStyles.summaryCardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Your Reflections ({allEntries.length})
          </Text>
          {allEntries.map((entry) => (
            <Pressable
              key={entry.key}
              onPress={() => setExpandedSection(expandedSection === entry.key ? null : entry.key)}
              style={[dsStyles.summaryEntryRow, { borderBottomColor: theme.border }]}
            >
              <View style={dsStyles.summaryEntryHeader}>
                <Ionicons name={entry.icon as any} size={14} color={entry.color} />
                <Text style={[dsStyles.summaryEntryTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                  {entry.title}
                </Text>
                <Text style={[dsStyles.summaryEntryBadge, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {entry.layerLabel}
                </Text>
                <Ionicons name={expandedSection === entry.key ? "chevron-up" : "chevron-down"} size={14} color={theme.textMuted} />
              </View>
              {expandedSection === entry.key && (
                <Text style={[dsStyles.summaryEntryContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {entry.content}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <View style={[dsStyles.summaryCard, { backgroundColor: theme.backgroundCard }]}>
        <Pressable
          onPress={() => setSummaryExpanded(!summaryExpanded)}
          style={dsStyles.summaryToggleRow}
        >
          <Ionicons name="document-text-outline" size={16} color={theme.accent} />
          <Text style={[dsStyles.summaryCardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", flex: 1, marginBottom: 0 }]}>
            Full Study Record
          </Text>
          <Ionicons name={summaryExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
        </Pressable>
        {summaryExpanded && (
          <View style={dsStyles.summaryTextBlock}>
            <Text style={[dsStyles.summaryTextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} selectable>
              {summaryText}
            </Text>
            <View style={dsStyles.summaryActions}>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [dsStyles.summaryActionBtn, { borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}
                testID="copy-summary"
              >
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={copied ? "#2E7D32" : theme.accent} />
                <Text style={[dsStyles.summaryActionText, { color: copied ? "#2E7D32" : theme.accent, fontFamily: "Inter_500Medium" }]}>
                  {copied ? "Copied" : "Copy Summary"}
                </Text>
              </Pressable>
              {Platform.OS !== "web" && (
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [dsStyles.summaryActionBtn, { borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}
                  testID="share-summary"
                >
                  <Ionicons name="share-outline" size={15} color={theme.accent} />
                  <Text style={[dsStyles.summaryActionText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                    Share
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={dsStyles.summaryCTAs}>
        {hasPrayerContent && (
          <Pressable
            onPress={onSavePrayer}
            style={({ pressed }) => [dsStyles.summaryCTASecondary, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="bookmark-outline" size={16} color={theme.accent} />
            <Text style={[dsStyles.summaryCTASecondaryText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              Save Prayer Response
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onDone}
          style={({ pressed }) => [dsStyles.summaryCTAPrimary, { backgroundColor: theme.accentDark, opacity: pressed ? 0.9 : 1 }]}
          testID="deep-study-done"
        >
          <Text style={[dsStyles.summaryCTAPrimaryText, { fontFamily: "Inter_600SemiBold" }]}>
            Done
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

interface JournalEntry {
  id: string;
  sectionKey: string;
  layer: string;
  content: string;
  updatedAt: string;
}

interface PromptSection {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  placeholder: string;
}

const OBSERVE_SECTIONS: PromptSection[] = [
  { key: "observations", title: "What stands out?", icon: "eye-outline", color: "#C24431", placeholder: "What repeats, surprises, or feels important?" },
  { key: "questions_raised", title: "Questions", icon: "help-circle-outline", color: "#C24431", placeholder: "What questions come to mind?" },
];

const CONTEXT_SECTIONS: PromptSection[] = [
  { key: "context_notes", title: "What the context reveals", icon: "compass-outline", color: "#C24431", placeholder: "What do you notice about the author, audience, or setting?" },
  { key: "context_changes", title: "How it changes your reading", icon: "swap-horizontal-outline", color: "#8B5CF6", placeholder: "How does knowing this context change what you see in the passage?" },
];

const INSIGHT_SECTIONS: PromptSection[] = [
  { key: "revelation_of_god", title: "What does this reveal about God?", icon: "eye-outline", color: "#C24431", placeholder: "What does this passage show about God's character?" },
  { key: "revelation_of_humanity", title: "What does this reveal about us?", icon: "people-outline", color: "#2E7D32", placeholder: "What does this teach about the human condition?" },
  { key: "narrative_connection", title: "What biblical theme stands out?", icon: "git-merge-outline", color: "#8B5CF6", placeholder: "How does this connect to the larger biblical story?" },
];

const TRANSFORMATION_SECTIONS: PromptSection[] = [
  { key: "belief_challenged", title: "What is God calling me to notice or change?", icon: "bulb-outline", color: "#C24431", placeholder: "What conviction or challenge do you sense?" },
  { key: "habit_shaped", title: "What will I do this week?", icon: "footsteps-outline", color: "#2E7D32", placeholder: "One specific step you will take..." },
  { key: "prayer_response", title: "A short prayer", icon: "hand-left-outline", color: "#8B5CF6", placeholder: "Write a prayer in response to this passage..." },
];

function JournalPromptCard({
  section,
  journalMap,
  onSave,
  isSaving,
  theme,
  showPrayerLink,
  userId,
}: {
  section: PromptSection;
  journalMap: Map<string, string>;
  onSave: (sectionKey: string, content: string) => void;
  isSaving: boolean;
  theme: typeof Colors.light;
  showPrayerLink?: boolean;
  userId?: string;
}) {
  const savedContent = journalMap.get(section.key) ?? "";
  const [text, setText] = useState(savedContent);
  const [focused, setFocused] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const hasContent = savedContent.length > 0;
  const textDirty = text.trim() !== savedContent.trim();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!focused) setText(journalMap.get(section.key) ?? "");
  }, [journalMap, section.key]);

  const doAutoSave = useCallback((value: string) => {
    if (value.trim() === savedContent.trim()) return;
    if (!mountedRef.current) return;
    setSaveStatus("saving");
    onSave(section.key, value);
    statusTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setSaveStatus("saved");
      fadeTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSaveStatus("idle");
      }, 1500);
    }, 400);
  }, [section.key, savedContent, onSave]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doAutoSave(value), 1200);
  }, [doAutoSave]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (textDirty) doAutoSave(text);
  }, [text, textDirty, doAutoSave]);

  return (
    <View style={[jpStyles.card, { backgroundColor: theme.backgroundCard, borderColor: focused ? theme.accent + "60" : theme.border }]}>
      <View style={jpStyles.header}>
        <View style={[jpStyles.iconWrap, { backgroundColor: section.color + "18" }]}>
          <Ionicons name={section.icon} size={14} color={section.color} />
        </View>
        <Text style={[jpStyles.title, { color: theme.text, fontFamily: "Inter_600SemiBold", flex: 1 }]}>
          {section.title}
        </Text>
        {saveStatus === "saving" && (
          <ActivityIndicator size="small" color={theme.accent} style={{ width: 16, height: 16 }} />
        )}
        {saveStatus === "saved" && (
          <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
        )}
        {saveStatus === "idle" && hasContent && !focused && (
          <Ionicons name="checkmark-circle" size={16} color={theme.accent + "60"} />
        )}
      </View>

      <TextInput
        style={[
          jpStyles.input,
          {
            color: theme.text,
            backgroundColor: focused ? theme.background : (hasContent ? "transparent" : theme.background),
            borderColor: focused ? theme.accent + "30" : (hasContent ? "transparent" : theme.border),
            fontFamily: "Inter_400Regular",
            minHeight: focused || !hasContent ? 72 : 36,
          },
        ]}
        placeholder={section.placeholder}
        placeholderTextColor={theme.textMuted}
        multiline
        value={text}
        onChangeText={handleTextChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        textAlignVertical="top"
      />

      {showPrayerLink && section.key === "prayer_response" && hasContent && (
        <Pressable
          onPress={async () => {
            try {
              await apiRequest("POST", "/api/prayers", {
                userId: userId || "guest",
                title: "Study Prayer Response",
                content: savedContent,
                category: "study",
              });
            } catch {}
            router.push("/prayer-journal");
          }}
          style={[jpStyles.prayerLink, { backgroundColor: section.color + "12" }]}
        >
          <Ionicons name="bookmark-outline" size={14} color={section.color} />
          <Text style={[jpStyles.prayerLinkText, { color: section.color, fontFamily: "Inter_500Medium" }]}>
            Save to Prayer Journal
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function useJournalEntries(userId: string, bookId: number | null, chapter: number | null, layer: string, verseStart?: number | null, verseEnd?: number | null) {
  const queryClient = useQueryClient();
  const canFetch = bookId !== null && chapter !== null;
  const vs = verseStart ?? 0;
  const ve = verseEnd ?? 0;
  const vsParam = vs > 0 ? `&verseStart=${vs}` : "";
  const veParam = ve > 0 ? `&verseEnd=${ve}` : "";
  const queryKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=${layer}${vsParam}${veParam}`;

  const { data: entries } = useQuery<JournalEntry[]>({
    queryKey: [queryKey],
    enabled: canFetch,
  });

  const journalMap = useMemo(() => {
    const map = new Map<string, string>();
    (entries ?? []).forEach((e) => map.set(e.sectionKey, e.content));
    return map;
  }, [entries]);

  const saveMutation = useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: string }) => {
      const res = await apiRequest("POST", "/api/study-journal", {
        userId,
        bookId,
        chapter,
        layer,
        sectionKey,
        content,
        verseStart: vs,
        verseEnd: ve,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const handleSave = useCallback((sectionKey: string, content: string) => {
    if (canFetch) {
      saveMutation.mutate({ sectionKey, content });
    }
  }, [canFetch, saveMutation]);

  return { journalMap, handleSave, isSaving: saveMutation.isPending };
}

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "word", label: "Observe", icon: "book-outline" },
  { id: "context", label: "Context", icon: "time-outline" },
  { id: "voices", label: "Insight", icon: "chatbubble-ellipses-outline" },
  { id: "application", label: "Respond", icon: "heart-outline" },
];

interface Commentator {
  name: string;
  dates: string;
  tradition: string;
  isPublicDomain: boolean;
  externalUrl?: string;
}

const COMMENTATORS: Commentator[] = [
  { name: "Ellen G. White", dates: "1827\u20131915", tradition: "Adventist", isPublicDomain: false, externalUrl: "https://egwwritings.org" },
  { name: "Uriah Smith", dates: "1832\u20131903", tradition: "Adventist Pioneer", isPublicDomain: true },
  { name: "J.N. Andrews", dates: "1829\u20131883", tradition: "Adventist Pioneer", isPublicDomain: true },
  { name: "John Loughborough", dates: "1832\u20131924", tradition: "Adventist Pioneer", isPublicDomain: true },
  { name: "Joseph Bates", dates: "1792\u20131872", tradition: "Adventist Pioneer", isPublicDomain: true },
  { name: "James White", dates: "1821\u20131881", tradition: "Adventist Pioneer", isPublicDomain: true },
  { name: "Matthew Henry", dates: "1662\u20131714", tradition: "Reformed", isPublicDomain: true },
  { name: "Jamieson, Fausset & Brown", dates: "1871", tradition: "Presbyterian", isPublicDomain: true },
  { name: "Adam Clarke", dates: "1762\u20131832", tradition: "Wesleyan", isPublicDomain: true },
  { name: "John Gill", dates: "1697\u20131771", tradition: "Baptist", isPublicDomain: true },
];

interface StrongEntry {
  id: string;
  language: string;
  lemma: string;
  transliteration: string | null;
  pronunciation: string | null;
  definition: string;
  kjvUsage: string | null;
  derivation: string | null;
  extendedDefinition: string | null;
}

interface ContextCard {
  id: string;
  title: string;
  content: string;
  category?: string;
  historicalBackground?: string | null;
  culturalNotes?: string | null;
  authorInfo?: string | null;
  dateWritten?: string | null;
  audience?: string | null;
  themes: string[] | null;
}

interface AppTemplate {
  id: string;
  bookId: number;
  chapter: number;
  thenContext: string;
  nowApplication: string;
  reflectionQuestions: string[];
  prayerPrompt: string | null;
  keyTheme: string | null;
}

interface CommentaryResult {
  entry: {
    id: string;
    title: string | null;
    content: string;
    verseStart: number | null;
    verseEnd: number | null;
  };
  commentator: {
    id: string;
    name: string;
    tradition: string | null;
    dates: string | null;
  };
}


export default function StudyScreen() {
  useTheme();
  const theme = SWEEP_LIGHT;
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    tab?: string;
    bookId?: string;
    chapter?: string;
    verse?: string;
    verseId?: string;
    verseText?: string;
    bookName?: string;
    showIntro?: string;
  }>();
  const validTabs: Tab[] = ["word", "context", "voices", "application"];
  const [activeTab, setActiveTabRaw] = useState<Tab>("word");
  const [showDepthPicker, setShowDepthPicker] = useState(false);

  const paramBookId = params.bookId ? parseInt(params.bookId) : null;
  const paramChapter = params.chapter ? parseInt(params.chapter) : null;

  const { data: allBooks } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  const [sharedBook, setSharedBook] = useState<BibleBook | null>(null);
  const [sharedChapter, setSharedChapter] = useState<number | null>(paramChapter);
  const [sharedBookInit, setSharedBookInit] = useState(false);
  const [autoCompletionShown, setAutoCompletionShown] = useState(false);

  useEffect(() => {
    if (allBooks && paramBookId && !sharedBookInit) {
      const found = allBooks.find(b => b.id === paramBookId);
      if (found) {
        setSharedBook(found);
        setSharedBookInit(true);
      }
    }
  }, [allBooks, paramBookId, sharedBookInit]);

  const handleSharedBookChange = useCallback((book: BibleBook | null) => {
    setSharedBook(book);
    if (!book) setSharedChapter(null);
    setAutoCompletionShown(false);
  }, []);

  const handleSharedChapterChange = useCallback((ch: number | null) => {
    setSharedChapter(ch);
    setAutoCompletionShown(false);
    const hasNavIntent = params.tab && validTabs.includes(params.tab as Tab);
    if (!hasNavIntent) {
      setActiveTabRaw("word");
    }
    if (ch !== null && !hasNavIntent) {
      setShowDeepIntro(true);
    }
  }, [params.tab]);

  const bookId = sharedBook?.id ?? null;
  const chapter = sharedChapter;
  const canTrack = bookId !== null && chapter !== null;

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeTab]);

  const [deepSession, setDeepSessionRaw] = useState<DeepSessionState>({
    active: false,
    layerIndex: 0,
    startedAt: 0,
    completedLayersDuringSession: [],
    bookId: null,
    chapter: null,
    verseStart: null,
    verseEnd: null,
    studyFocus: "passage",
  });

  const dsVs = deepSession.verseStart ?? 0;
  const dsVe = deepSession.verseEnd ?? 0;
  const vsCompParam = dsVs > 0 ? `&verseStart=${dsVs}` : "";
  const veCompParam = dsVe > 0 ? `&verseEnd=${dsVe}` : "";
  const completionKey = `/api/layer-completions?userId=${userId}&bookId=${bookId}&chapter=${chapter}${vsCompParam}${veCompParam}`;
  const { data: completions } = useQuery<LayerCompletionEntry[]>({
    queryKey: [completionKey],
    enabled: canTrack,
  });

  const completedLayers = useMemo(
    () => new Set<string>((completions ?? []).map((c) => c.layer)),
    [completions]
  );

  const setActiveTab = useCallback((tab: Tab) => {
    if (isLayerAccessible(tab, completedLayers)) {
      setActiveTabRaw(tab);
    }
  }, [completedLayers]);

  useEffect(() => {
    const hasNavIntent = params.tab && validTabs.includes(params.tab as Tab) && activeTab === (params.tab as Tab);
    if (hasNavIntent) return;
    if (!isLayerAccessible(activeTab, completedLayers)) {
      const firstAccessible = LAYER_ORDER.find(l => isLayerAccessible(l, completedLayers)) ?? "word";
      setActiveTabRaw(firstAccessible);
    }
  }, [completedLayers, activeTab, bookId, chapter, params.tab]);

  useEffect(() => {
    if (params.tab && validTabs.includes(params.tab as Tab)) {
      const requested = params.tab as Tab;
      // When navigating directly from the Bible reader, skip the deep dive
      // intro and go straight to the requested tab regardless of layer order.
      // Use a short delay so this fires AFTER any async session restoration.
      const t = setTimeout(() => {
        setShowDeepIntro(false);
        setActiveTabRaw(requested);
      }, 80);
      return () => clearTimeout(t);
    }
  }, [params.tab, paramBookId, paramChapter]);

  const markCompleteMutation = useMutation({
    mutationFn: async (layer: string) => {
      const res = await apiRequest("POST", "/api/layer-completions", {
        userId,
        bookId,
        chapter,
        layer,
        verseStart: dsVs,
        verseEnd: dsVe,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [completionKey] });
    },
  });

  const handleMarkComplete = useCallback(() => {
    if (canTrack && !completedLayers.has(activeTab) && !markCompleteMutation.isPending) {
      markCompleteMutation.mutate(activeTab);
    }
  }, [canTrack, activeTab, completedLayers, markCompleteMutation]);

  const handleNextLayer = useCallback(() => {
    const idx = LAYER_ORDER.indexOf(activeTab);
    if (idx < LAYER_ORDER.length - 1) {
      setActiveTab(LAYER_ORDER[idx + 1]);
    }
  }, [activeTab]);
  const deepSessionRef = useRef(deepSession);
  const setDeepSession = useCallback((s: DeepSessionState) => {
    deepSessionRef.current = s;
    setDeepSessionRaw(s);
  }, []);
  const [showSummary, setShowSummary] = useState(false);
  const [showDeepIntro, setShowDeepIntro] = useState(false);
  const [showLayerIntro, setShowLayerIntro] = useState(params.showIntro === "true");

  useEffect(() => {
    if (params.showIntro === "true") {
      setShowLayerIntro(true);
    }
  }, [params.showIntro, (params as any)._t]);
  const [showStudyComplete, setShowStudyComplete] = useState(false);

  const [pausedLayerIndex, setPausedLayerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (bookId === null && paramBookId !== null) return;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DEEP_SESSION_KEY);
        if (saved) {
          const raw = JSON.parse(saved);
          const parsed: DeepSessionState = {
            ...raw,
            verseStart: raw.verseStart ?? null,
            verseEnd: raw.verseEnd ?? null,
            studyFocus: raw.studyFocus ?? "chapter",
          };
          if (parsed.bookId === bookId && parsed.chapter === chapter) {
            setShowDeepIntro(false);
            if (parsed.active) {
              setDeepSession(parsed);
              setActiveTab(LAYER_ORDER[parsed.layerIndex]);
            } else {
              setPausedLayerIndex(parsed.layerIndex);
              setDeepSession(parsed);
            }
          } else {
            await AsyncStorage.removeItem(DEEP_SESSION_KEY);
            setPausedLayerIndex(null);
          }
        }
      } catch {}
    })();
  }, [bookId, chapter, paramBookId]);

  const persistSession = useCallback(async (state: DeepSessionState, remove?: boolean) => {
    setDeepSession(state);
    if (remove || (!state.active && !state.bookId)) {
      await AsyncStorage.removeItem(DEEP_SESSION_KEY);
    } else {
      await AsyncStorage.setItem(DEEP_SESSION_KEY, JSON.stringify(state));
    }
  }, []);

  const startDeepSession = useCallback(() => {
    if (pausedLayerIndex !== null && pausedLayerIndex >= 0) {
      const ds = deepSessionRef.current;
      const resumeIdx = Math.min(pausedLayerIndex, LAYER_ORDER.length - 1);
      const resumed: DeepSessionState = {
        ...ds,
        active: true,
        layerIndex: resumeIdx,
        bookId: ds.bookId ?? bookId,
        chapter: ds.chapter ?? chapter,
        startedAt: ds.startedAt || Date.now(),
      };
      persistSession(resumed);
      setActiveTab(LAYER_ORDER[resumeIdx]);
      setPausedLayerIndex(null);
      setShowSummary(false);
      setShowDeepIntro(false);
      return;
    }
    setShowDeepIntro(true);
  }, [bookId, chapter, persistSession, pausedLayerIndex]);

  const beginDeepSessionFromIntro = useCallback((focus: StudyFocus, vs: number | null, ve: number | null) => {
    const firstIncomplete = LAYER_ORDER.findIndex((l) => !completedLayers.has(l));
    const startIdx = firstIncomplete >= 0 ? firstIncomplete : 0;
    const state: DeepSessionState = {
      active: true,
      layerIndex: startIdx,
      startedAt: Date.now(),
      completedLayersDuringSession: [],
      bookId,
      chapter,
      verseStart: vs,
      verseEnd: ve,
      studyFocus: focus,
    };
    persistSession(state);
    setActiveTab(LAYER_ORDER[startIdx]);
    setPausedLayerIndex(null);
    setShowSummary(false);
    setShowDeepIntro(false);
  }, [bookId, chapter, completedLayers, persistSession]);

  const exitDeepSession = useCallback((fromDone?: boolean) => {
    const current = deepSessionRef.current;
    if (fromDone) {
      persistSession({ active: false, layerIndex: 0, startedAt: 0, completedLayersDuringSession: [], bookId: null, chapter: null, verseStart: null, verseEnd: null, studyFocus: "passage" }, true);
      setShowSummary(false);
      setPausedLayerIndex(null);
      setActiveTab("word");
      setAutoCompletionShown(true);
    } else {
      setPausedLayerIndex(current.layerIndex);
      persistSession({ ...current, active: false });
      setShowSummary(false);
    }
  }, [persistSession]);

  const advanceDeepSession = useCallback(() => {
    const ds = deepSessionRef.current;
    if (ds.layerIndex >= LAYER_ORDER.length - 1) {
      const visited = [...ds.completedLayersDuringSession];
      const currentLayer = LAYER_ORDER[ds.layerIndex];
      if (!visited.includes(currentLayer)) visited.push(currentLayer);
      const final = { ...ds, active: false, completedLayersDuringSession: visited };
      setDeepSession(final);
      AsyncStorage.removeItem(DEEP_SESSION_KEY);
      setShowSummary(true);
      return;
    }
    const nextIdx = ds.layerIndex + 1;
    const visited = [...ds.completedLayersDuringSession];
    const currentLayer = LAYER_ORDER[ds.layerIndex];
    if (!visited.includes(currentLayer)) visited.push(currentLayer);
    const next: DeepSessionState = { ...ds, layerIndex: nextIdx, completedLayersDuringSession: visited };
    persistSession(next);
    setActiveTab(LAYER_ORDER[nextIdx]);
  }, [persistSession, setDeepSession]);

  const finishDeepSession = useCallback(() => {
    const ds = deepSessionRef.current;
    const visited = [...ds.completedLayersDuringSession];
    const currentLayer = LAYER_ORDER[ds.layerIndex];
    if (!visited.includes(currentLayer)) visited.push(currentLayer);
    const final = { ...ds, active: false, completedLayersDuringSession: visited };
    setAutoCompletionShown(true);
    setShowStudyComplete(false);
    setShowSummary(true);
    setDeepSession(final);
    AsyncStorage.removeItem(DEEP_SESSION_KEY);
  }, [setDeepSession]);

  const vsJournalParam = dsVs > 0 ? `&verseStart=${dsVs}` : "";
  const veJournalParam = dsVe > 0 ? `&verseEnd=${dsVe}` : "";
  const observeJournalKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=word${vsJournalParam}${veJournalParam}`;
  const { data: observeEntries } = useQuery<JournalEntry[]>({
    queryKey: [observeJournalKey],
    enabled: canTrack,
  });
  const observeJournalMap = useMemo(() => {
    const map = new Map<string, string>();
    (observeEntries ?? []).forEach((e) => map.set(e.sectionKey, e.content));
    return map;
  }, [observeEntries]);

  const contextJournalKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=context${vsJournalParam}${veJournalParam}`;
  const { data: contextEntries } = useQuery<JournalEntry[]>({
    queryKey: [contextJournalKey],
    enabled: canTrack,
  });
  const contextJournalMap = useMemo(() => {
    const map = new Map<string, string>();
    (contextEntries ?? []).forEach((e) => map.set(e.sectionKey, e.content));
    return map;
  }, [contextEntries]);

  const insightJournalKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=voices${vsJournalParam}${veJournalParam}`;
  const { data: insightEntries } = useQuery<JournalEntry[]>({
    queryKey: [insightJournalKey],
    enabled: canTrack,
  });
  const insightJournalMap = useMemo(() => {
    const map = new Map<string, string>();
    (insightEntries ?? []).forEach((e) => map.set(e.sectionKey, e.content));
    return map;
  }, [insightEntries]);

  const transformJournalKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=application${vsJournalParam}${veJournalParam}`;
  const { data: transformEntries } = useQuery<JournalEntry[]>({
    queryKey: [transformJournalKey],
    enabled: canTrack,
  });
  const transformJournalMap = useMemo(() => {
    const map = new Map<string, string>();
    (transformEntries ?? []).forEach((e) => map.set(e.sectionKey, e.content));
    return map;
  }, [transformEntries]);

  const prayerContent = transformJournalMap.get("prayer_response") ?? "";

  const layerProgress = useMemo(() => {
    const map = new Map<Tab, LayerProgress>();
    map.set("word", {
      layer: "word",
      filledSections: observeJournalMap.size,
      totalSections: OBSERVE_SECTIONS.length,
    });
    map.set("context", {
      layer: "context",
      filledSections: contextJournalMap.size,
      totalSections: CONTEXT_SECTIONS.length,
    });
    map.set("voices", {
      layer: "voices",
      filledSections: insightJournalMap.size,
      totalSections: INSIGHT_SECTIONS.length,
    });
    map.set("application", {
      layer: "application",
      filledSections: transformJournalMap.size,
      totalSections: TRANSFORMATION_SECTIONS.length,
    });
    return map;
  }, [observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap]);

  const nextStepText = useMemo(
    () => computeNextStep(completedLayers, layerProgress, activeTab),
    [completedLayers, layerProgress, activeTab]
  );

  const studyDepthLabel = useMemo(() => {
    const l1l2Done = completedLayers.has("word") && completedLayers.has("context");
    const l3l4Done = completedLayers.has("voices") && completedLayers.has("application");
    const allPromptsCount = observeJournalMap.size + contextJournalMap.size + insightJournalMap.size + transformJournalMap.size;
    const insightCount = insightJournalMap.size;
    if (l1l2Done && l3l4Done && allPromptsCount >= 10) return "Transforming";
    if (l1l2Done && l3l4Done && allPromptsCount >= 5) return "Deep";
    if (l1l2Done && insightCount >= 2) return "Growing";
    if (completedLayers.size > 0 || allPromptsCount > 0) return "Emerging";
    return null;
  }, [completedLayers, observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap]);

  const activeLayerHasEntries = useMemo(() => {
    if (activeTab === "word") return observeJournalMap.size > 0;
    if (activeTab === "context") return contextJournalMap.size > 0;
    if (activeTab === "voices") return insightJournalMap.size > 0;
    if (activeTab === "application") return transformJournalMap.size > 0;
    return true;
  }, [activeTab, observeJournalMap, contextJournalMap, insightJournalMap, transformJournalMap]);

  const handleSavePrayerFromSummary = useCallback(async () => {
    if (!prayerContent) return;
    try {
      await apiRequest("POST", "/api/prayers", {
        userId,
        title: "Study Prayer Response",
        content: prayerContent,
        category: "study",
      });
    } catch {}
    router.push("/prayer-journal");
  }, [userId, prayerContent]);

  useEffect(() => {
    if (!canTrack || !completions) return;
    const allDone = LAYER_ORDER.every((l) => completedLayers.has(l));
    if (showLayerIntro && completedLayers.size > 0 && !allDone) {
      setShowLayerIntro(false);
    }
    if (showLayerIntro && allDone) {
      setShowLayerIntro(false);
      setShowStudyComplete(true);
      setAutoCompletionShown(true);
    }
    if (!showLayerIntro && allDone && !autoCompletionShown && !showStudyComplete && !showSummary && !deepSession.active) {
      setShowStudyComplete(true);
      setAutoCompletionShown(true);
    }
  }, [canTrack, completions, completedLayers, showLayerIntro, autoCompletionShown, showStudyComplete, showSummary, deepSession.active]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  if (showLayerIntro) {
    if (paramBookId && (!canTrack || !completions)) {
      return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16, alignItems: "center" as const, justifyContent: "center" as const }]}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      );
    }
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16 }]}>
        <Pressable
          onPress={() => router.push("/(tabs)/explore")}
          hitSlop={12}
          style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 4, paddingHorizontal: 24, marginBottom: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={theme.accent} />
          <Text style={{ fontSize: 13, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>Back to Study</Text>
        </Pressable>
        <FourLayerIntro
          theme={theme}
          hasPassage={canTrack}
          onPickPassage={() => {
            setShowLayerIntro(false);
            setSharedBook(null);
            setSharedChapter(null);
          }}
          onContinue={() => { setShowLayerIntro(false); setShowDeepIntro(true); }}
        />
      </View>
    );
  }

  if (showDeepIntro) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16 }]}>
        <DeepStudyIntro
          reference={sharedBook?.name && chapter ? `${sharedBook.name} ${chapter}` : "Scripture"}
          bookId={bookId}
          chapter={chapter ? Number(chapter) : null}
          onBegin={beginDeepSessionFromIntro}
          onCancel={() => setShowDeepIntro(false)}
          theme={theme}
        />
      </View>
    );
  }

  if (showSummary) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16 }]}>
        <DeepSessionSummary
          completedDuring={deepSession.completedLayersDuringSession}
          allCompletedLayers={completedLayers}
          observeJournalMap={observeJournalMap}
          contextJournalMap={contextJournalMap}
          insightJournalMap={insightJournalMap}
          transformJournalMap={transformJournalMap}
          startedAt={deepSession.startedAt}
          onDone={() => exitDeepSession(true)}
          onSavePrayer={handleSavePrayerFromSummary}
          hasPrayerContent={prayerContent.length > 0}
          theme={theme}
          reference={sharedBook?.name && chapter ? `${sharedBook.name} ${chapter}` : "Study Session"}
          depthLabel={studyDepthLabel}
        />
      </View>
    );
  }

  if (showStudyComplete) {
    const nextChapterAvailable = !!(sharedBook && chapter && chapter < sharedBook.chapterCount);
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16 }]}>
        <StudyCompletionScreen
          reference={sharedBook?.name && chapter ? `${sharedBook.name} ${chapter}` : "This Passage"}
          completedLayers={completedLayers}
          depthLabel={studyDepthLabel}
          observeJournalMap={observeJournalMap}
          contextJournalMap={contextJournalMap}
          insightJournalMap={insightJournalMap}
          transformJournalMap={transformJournalMap}
          onStudyAnother={() => {
            setShowStudyComplete(false);
            setSharedBook(null);
            setSharedChapter(null);
            setActiveTab("word");
          }}
          onReview={() => {
            setShowStudyComplete(false);
          }}
          onNextChapter={() => {
            if (sharedBook && chapter) {
              setShowStudyComplete(false);
              setSharedChapter(chapter + 1);
              setActiveTab("word");
              setAutoCompletionShown(false);
            }
          }}
          onSavePrayer={handleSavePrayerFromSummary}
          hasPrayerContent={prayerContent.length > 0}
          hasNextChapter={nextChapterAvailable}
          theme={theme}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background, borderBottomColor: canTrack ? "transparent" : theme.border }]}
      >
        {canTrack ? (
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const }}>
            <Pressable
              onPress={() => {
                if (params.bookId && params.chapter) {
                  router.navigate(`/read/${params.bookId}/${params.chapter}` as any);
                } else {
                  setSharedBook(null);
                  setSharedChapter(null);
                }
              }}
              hitSlop={12}
              style={{ marginRight: 10, padding: 4 }}
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                {sharedBook?.name} {chapter}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Deep Dive
              </Text>
            </View>
            <Pressable
              onPress={() => setShowDepthPicker(p => !p)}
              hitSlop={8}
              testID="study-options-btn"
              accessibilityLabel="Study options"
              style={{ padding: 8, borderRadius: 8, backgroundColor: showDepthPicker ? theme.accent + "18" : "transparent" }}
            >
              <Ionicons name="options-outline" size={20} color={showDepthPicker ? theme.accent : theme.textMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => safeGoBack(router, "/(tabs)/explore")}
              style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 4, marginBottom: 6 }}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={16} color={theme.accent} />
              <Text style={{ fontSize: 13, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>
                Back to Study
              </Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Deep Dive
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Choose a passage to begin
            </Text>
          </>
        )}
      </View>

      {showDepthPicker && (
        <View>
          <StudyDepthSelector compact />
          {canTrack && !deepSession.active && (
            <Pressable
              onPress={() => { setShowDepthPicker(false); startDeepSession(); }}
              testID="start-guided-session"
              accessibilityLabel={pausedLayerIndex !== null ? "Resume Deep Dive" : "Start Deep Dive"}
              style={{ flexDirection: "row" as const, alignItems: "center" as const, paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 16, marginTop: 6, marginBottom: 4, borderRadius: 10, borderWidth: 1, borderColor: theme.accent + "40", gap: 10 }}
            >
              <Ionicons name="compass-outline" size={18} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.accentDark, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  {pausedLayerIndex !== null ? "Resume Deep Dive" : "Start Deep Dive"}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                  {pausedLayerIndex !== null ? "Continue your structured session" : "Step-by-step walkthrough with prompts"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.accent + "80"} />
            </Pressable>
          )}
        </View>
      )}

      {deepSession.active && (
        <DeepSessionBar
          layerIndex={deepSession.layerIndex}
          onExit={exitDeepSession}
          theme={theme}
        />
      )}

      {!deepSession.active && pausedLayerIndex !== null && canTrack && (
        <Pressable
          onPress={() => startDeepSession()}
          style={{ flexDirection: "row" as const, alignItems: "center" as const, marginHorizontal: 16, marginTop: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.accent + "12", gap: 8 }}
          testID="resume-guided-bar"
        >
          <Ionicons name="play-circle" size={18} color={theme.accent} />
          <Text style={{ flex: 1, fontSize: 13, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>
            Resume Deep Dive
          </Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: "Inter_400Regular" }}>
            Layer {(pausedLayerIndex ?? 0) + 1} of 4
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.accent + "80"} />
        </Pressable>
      )}

      {canTrack && !deepSession.active && (
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 }}>
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const }}>
            {LAYER_ORDER.map((layer, i) => {
              const isActive = activeTab === layer;
              const isCompleted = completedLayers.has(layer);
              const accessible = isLayerAccessible(layer, completedLayers);
              const isLocked = !accessible && !isCompleted;
              return (
                <React.Fragment key={layer}>
                  {i > 0 && (
                    <View style={{ flex: 1, height: 2, backgroundColor: completedLayers.has(LAYER_ORDER[i - 1]) ? theme.accent + "50" : theme.border, marginHorizontal: -1 }} />
                  )}
                  <Pressable
                    onPress={() => {
                      if (isLocked) return;
                      setActiveTab(layer);
                    }}
                    style={{ alignItems: "center" as const, width: 68, opacity: isLocked ? 0.35 : 1 }}
                    testID={`step-${layer}`}
                  >
                    <View style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      borderWidth: 2,
                      borderColor: isActive ? theme.accent : isCompleted ? theme.accent : theme.border,
                      backgroundColor: isActive ? theme.accentDark : "transparent",
                      alignItems: "center" as const,
                      justifyContent: "center" as const,
                      marginBottom: 5,
                    }}>
                      {isLocked ? (
                        <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
                      ) : isCompleted && !isActive ? (
                        <Ionicons name="checkmark" size={14} color={theme.accent} />
                      ) : (
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: isActive ? "#fff" : theme.textMuted }}>
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: isActive ? theme.accentDark : isLocked ? theme.textMuted : theme.textSecondary,
                        fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                      }}
                      numberOfLines={1}
                    >
                      {LAYER_LABELS[layer]}
                    </Text>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
          <View style={{ paddingTop: 10, paddingBottom: 2, paddingHorizontal: 2 }}>
            {LAYER_ORDER.every((l) => completedLayers.has(l)) ? (
              <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 6 }}>
                <Ionicons name="checkmark-done-circle" size={14} color={theme.accent} />
                <Text style={{ color: theme.accentDark, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  All four layers complete. Scroll down to view your summary.
                </Text>
              </View>
            ) : activeTab !== "word" ? (
              <Text style={{ color: theme.textMuted, fontFamily: "Inter_400Regular", fontSize: 13, fontStyle: "italic" as const }}>
                {LAYER_GUIDANCE[activeTab]}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {canTrack && <LayerCoachBanner activeTab={activeTab} theme={theme} />}
        {activeTab === "word" && <WordStudyTab theme={theme} sharedBook={sharedBook} sharedChapter={sharedChapter} onBookChange={handleSharedBookChange} onChapterChange={handleSharedChapterChange} initialVerse={params.verse} initialVerseId={params.verseId} initialVerseText={params.verseText} isDeepSession={deepSession.active} allBooks={allBooks} verseStart={dsVs} verseEnd={dsVe} />}
        {activeTab === "context" && <ContextTab theme={theme} sharedBook={sharedBook} sharedChapter={sharedChapter} onBookChange={handleSharedBookChange} onChapterChange={handleSharedChapterChange} allBooks={allBooks} verseStart={dsVs} verseEnd={dsVe} />}
        {activeTab === "voices" && <HistoricVoicesTab theme={theme} commentators={COMMENTATORS} sharedBook={sharedBook} sharedChapter={sharedChapter} onBookChange={handleSharedBookChange} onChapterChange={handleSharedChapterChange} allBooks={allBooks} verseStart={dsVs} verseEnd={dsVe} />}
        {activeTab === "application" && <ApplicationTab theme={theme} sharedBook={sharedBook} sharedChapter={sharedChapter} onBookChange={handleSharedBookChange} onChapterChange={handleSharedChapterChange} allBooks={allBooks} verseStart={dsVs} verseEnd={dsVe} />}

        {deepSession.active ? (
          <DeepSessionAdvanceButton
            layerIndex={deepSession.layerIndex}
            isLastLayer={deepSession.layerIndex >= LAYER_ORDER.length - 1}
            onAdvance={advanceDeepSession}
            onFinish={finishDeepSession}
            onMarkComplete={handleMarkComplete}
            isCompleted={completedLayers.has(activeTab)}
            theme={theme}
          />
        ) : (
          <NextLayerCTA
            activeTab={activeTab}
            completedLayers={completedLayers}
            onMarkComplete={handleMarkComplete}
            onNextLayer={handleNextLayer}
            onAllComplete={() => setShowStudyComplete(true)}
            isCompleted={completedLayers.has(activeTab)}
            canComplete={canTrack}
            hasEntries={activeLayerHasEntries}
            theme={theme}
          />
        )}
      </ScrollView>

    </View>
  );
}

interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
}

function WordStudyTab({ theme, sharedBook, sharedChapter, onBookChange, onChapterChange, initialVerse, initialVerseId, initialVerseText, isDeepSession, allBooks, verseStart, verseEnd }: { theme: typeof Colors.light; sharedBook: BibleBook | null; sharedChapter: number | null; onBookChange: (b: BibleBook | null) => void; onChapterChange: (c: number | null) => void; initialVerse?: string; initialVerseId?: string; initialVerseText?: string; isDeepSession?: boolean; allBooks?: BibleBook[]; verseStart?: number | null; verseEnd?: number | null }) {
  const [studyMode, setStudyMode] = useState<"verse" | "concordance">("verse");
  const [lexicalExpanded, setLexicalExpanded] = useState(false);
  const selectedBook = sharedBook;
  const selectedChapter = sharedChapter;
  const setSelectedBook = onBookChange;
  const setSelectedChapter = onChapterChange;
  const [selectedVerse, setSelectedVerse] = useState<number | null>(initialVerse ? parseInt(initialVerse) : null);
  const [concordanceSearch, setConcordanceSearch] = useState("");
  const [concordanceLang, setConcordanceLang] = useState<"all" | "he" | "gr">("all");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const books = allBooks;

  const passageQuery = useQuery<{ book: any; chapter: number; verses: { id: string; verse: number; text: string }[] }>({
    queryKey: [`/api/passage?book=${selectedBook?.id}&chapter=${selectedChapter}&translation=KJV`],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const targetVerse = passageQuery.data?.verses?.find(v => v.verse === selectedVerse);

  const qc = useQueryClient();

  const wordQuery = useQuery<{ map: any; entry: StrongEntry | null }[]>({
    queryKey: [`/api/strong/verse/${targetVerse?.id}`],
    enabled: !!targetVerse?.id,
  });

  const generateWordsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/strong/generate", {
        verseId: targetVerse!.id,
        bookName: selectedBook!.name,
        chapter: selectedChapter,
        verse: selectedVerse,
        verseText: targetVerse!.text,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [`/api/strong/verse/${targetVerse?.id}`],
      });
    },
  });

  const hasWords = wordQuery.data && wordQuery.data.length > 0;
  const [wordGenAttempted, setWordGenAttempted] = useState<string | null>(null);

  useEffect(() => {
    if (targetVerse && !wordQuery.isLoading && !hasWords && !generateWordsMutation.isPending && wordGenAttempted !== targetVerse.id) {
      setWordGenAttempted(targetVerse.id);
      generateWordsMutation.mutate();
    }
  }, [targetVerse?.id, wordQuery.isLoading, hasWords]);

  const concordanceQuery = useQuery<StrongEntry[]>({
    queryKey: [`/api/strong/search?q=${encodeURIComponent(concordanceSearch)}${concordanceLang !== "all" ? `&language=${concordanceLang}` : ""}`],
    enabled: studyMode === "concordance" && concordanceSearch.trim().length >= 2,
  });

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  const verses = passageQuery.data?.verses ?? [];

  const { userId } = useAuth();
  const observeBookId = selectedBook?.id ?? null;
  const { journalMap: observeJournalMap, handleSave: handleObserveSave, isSaving: isObserveSaving } = useJournalEntries(
    userId, observeBookId, selectedChapter, "word", verseStart, verseEnd
  );

  if (isDeepSession && selectedBook && selectedChapter) {
    const allVerses = passageQuery.data?.verses ?? [];
    const filteredVerses = (verseStart && verseStart > 0 && verseEnd && verseEnd > 0)
      ? allVerses.filter(v => v.verse >= verseStart && v.verse <= verseEnd)
      : allVerses;
    return (
      <View style={styles.tabContent}>
        <View style={{ backgroundColor: theme.accent + "08", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>
            OBSERVE
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
            {LAYER_PURPOSE.word}
          </Text>
        </View>

        {verseStart != null && verseStart > 0 && verseEnd != null && verseEnd > 0 && (
          <View style={{ backgroundColor: theme.accent + "0C", borderRadius: 8, padding: 10, marginBottom: 12, flexDirection: "row", alignItems: "center" as const, gap: 8 }}>
            <Ionicons name="filter-outline" size={14} color={theme.accent} />
            <Text style={{ fontSize: 12, color: theme.accentDark, fontFamily: "Inter_500Medium" }}>
              Studying verses {verseStart}{verseEnd !== verseStart ? `-${verseEnd}` : ""}
            </Text>
          </View>
        )}

        <View style={{ marginBottom: 20 }}>
          {passageQuery.isLoading ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 20 }} />
          ) : (
            <Text style={{ fontSize: 17, lineHeight: 30, color: theme.text, fontFamily: "Lora_400Regular" }}>
              {filteredVerses.map((v) => (
                <React.Fragment key={v.id}>
                  <Text style={{ color: theme.accentDark + "90", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                    {v.verse}{" "}
                  </Text>
                  {v.text}{"  "}
                </React.Fragment>
              ))}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => setLexicalExpanded(!lexicalExpanded)}
          style={[lexicalStyles.toggleRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
        >
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flex: 1 }}>
            <Ionicons name="language-outline" size={16} color={theme.accent} />
            <Text style={[lexicalStyles.toggleLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Original Language & Word Study
            </Text>
          </View>
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 4 }}>
            <Text style={[lexicalStyles.optionalTag, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Optional
            </Text>
            <Ionicons
              name={lexicalExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textMuted}
            />
          </View>
        </Pressable>

        {lexicalExpanded && (
          <View style={lexicalStyles.expandedSection}>
            {!selectedVerse && (
              <>
                <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular", marginBottom: 8 }]}>
                  Tap a verse number to see its original language words
                </Text>
                <View style={styles.chapterGrid}>
                  {allVerses.map((v) => (
                    <Pressable
                      key={v.verse}
                      onPress={() => setSelectedVerse(v.verse)}
                      style={[styles.chapterCell, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                    >
                      <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                        {v.verse}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {selectedVerse && (
              <>
                <Pressable onPress={() => setSelectedVerse(null)} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={16} color={theme.accent} />
                  <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                    All Verses
                  </Text>
                </Pressable>

                {targetVerse && (
                  <View style={[styles.verseCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={styles.verseRefRow}>
                      <Ionicons name="book-outline" size={14} color={theme.accent} />
                      <Text style={[styles.verseRef, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                        {selectedBook.name} {selectedChapter}:{selectedVerse}
                      </Text>
                    </View>
                    <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                      {targetVerse.text}
                    </Text>
                  </View>
                )}

                {(wordQuery.isLoading || generateWordsMutation.isPending) && targetVerse && (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {generateWordsMutation.isPending ? "Studying original languages..." : "Loading word study..."}
                    </Text>
                  </View>
                )}

                {hasWords && (
                  <>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                      Original Language Words
                    </Text>
                    {wordQuery.data!.map((wm, i) => {
                      const entry = wm.entry;
                      if (!entry) return null;
                      const langColor = entry.language === "he" ? "#4A6741" : "#3B5998";
                      return (
                        <View
                          key={wm.map.id || i}
                          style={[styles.wordCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                        >
                          <View style={styles.wordHeader}>
                            <Text style={[styles.lemma, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                              {entry.lemma}
                            </Text>
                            <View style={[styles.langBadge, { backgroundColor: langColor + "22" }]}>
                              <Text style={[styles.langText, { color: langColor, fontFamily: "Inter_600SemiBold" }]}>
                                {entry.language === "he" ? "Hebrew" : "Greek"}
                              </Text>
                            </View>
                            <View style={[styles.strongBadge, { backgroundColor: theme.accent + "18" }]}>
                              <Text style={[styles.strongNum, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                                {entry.id}
                              </Text>
                            </View>
                          </View>
                          {wm.map.translatedWord && (
                            <View style={styles.translationRow}>
                              <Ionicons name="arrow-forward" size={12} color={theme.textMuted} />
                              <Text style={[styles.translatedWord, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                                "{wm.map.translatedWord}"
                              </Text>
                            </View>
                          )}
                          {entry.transliteration && (
                            <Text style={[styles.transliteration, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                              {entry.transliteration}{entry.pronunciation ? ` (${entry.pronunciation})` : ""}
                            </Text>
                          )}
                          <Text style={[styles.definition, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                            {entry.definition}
                          </Text>
                          {entry.kjvUsage && (
                            <View style={styles.usagePills}>
                              {entry.kjvUsage.split(",").slice(0, 5).map((u, j) => (
                                <View key={j} style={[styles.usagePill, { backgroundColor: theme.accent + "12" }]}>
                                  <Text style={[styles.usagePillText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                                    {u.trim()}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </View>
        )}

        <View style={jpStyles.sectionDivider}>
          <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
          <Text style={[jpStyles.sectionDividerText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
            Your Observations
          </Text>
          <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
        </View>

        {OBSERVE_SECTIONS.map((section) => (
          <JournalPromptCard
            key={section.key}
            section={section}
            journalMap={observeJournalMap}
            onSave={handleObserveSave}
            isSaving={isObserveSaving}
            theme={theme}
          />
        ))}
      </View>
    );
  }

  if (selectedBook && selectedChapter) {
    const allVerses = passageQuery.data?.verses ?? [];
    return (
      <View style={styles.tabContent}>
        <View style={{ backgroundColor: theme.accent + "08", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>
            OBSERVE
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
            {LAYER_PURPOSE.word}
          </Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          {passageQuery.isLoading ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 20 }} />
          ) : (
            <Text style={{ fontSize: 17, lineHeight: 30, color: theme.text, fontFamily: "Lora_400Regular" }}>
              {allVerses.map((v) => (
                <React.Fragment key={v.id}>
                  <Text style={{ color: theme.accentDark + "90", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                    {v.verse}{" "}
                  </Text>
                  {v.text}{"  "}
                </React.Fragment>
              ))}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => setLexicalExpanded(!lexicalExpanded)}
          style={[lexicalStyles.toggleRow, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
        >
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flex: 1 }}>
            <Ionicons name="language-outline" size={16} color={theme.accent} />
            <Text style={[lexicalStyles.toggleLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Original Language & Word Study
            </Text>
          </View>
          <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 4 }}>
            <Text style={[lexicalStyles.optionalTag, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Optional
            </Text>
            <Ionicons
              name={lexicalExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textMuted}
            />
          </View>
        </Pressable>

        {lexicalExpanded && (
          <View style={lexicalStyles.expandedSection}>
            {!selectedVerse && (
              <>
                <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular", marginBottom: 8 }]}>
                  Tap a verse number to see its original language words
                </Text>
                <View style={styles.chapterGrid}>
                  {allVerses.map((v) => (
                    <Pressable
                      key={v.verse}
                      onPress={() => setSelectedVerse(v.verse)}
                      style={[styles.chapterCell, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                    >
                      <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                        {v.verse}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {selectedVerse && (
              <>
                <Pressable onPress={() => setSelectedVerse(null)} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={16} color={theme.accent} />
                  <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                    All Verses
                  </Text>
                </Pressable>

                {targetVerse && (
                  <View style={[styles.verseCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={styles.verseRefRow}>
                      <Ionicons name="book-outline" size={14} color={theme.accent} />
                      <Text style={[styles.verseRef, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                        {selectedBook.name} {selectedChapter}:{selectedVerse}
                      </Text>
                    </View>
                    <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                      {targetVerse.text}
                    </Text>
                  </View>
                )}

                {(wordQuery.isLoading || generateWordsMutation.isPending) && targetVerse && (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {generateWordsMutation.isPending ? "Studying original languages..." : "Loading word study..."}
                    </Text>
                  </View>
                )}

                {hasWords && (
                  <>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                      Original Language Words
                    </Text>
                    {wordQuery.data!.map((wm, i) => {
                      const entry = wm.entry;
                      if (!entry) return null;
                      const langColor = entry.language === "he" ? "#4A6741" : "#3B5998";
                      return (
                        <View
                          key={wm.map.id || i}
                          style={[styles.wordCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
                        >
                          <View style={styles.wordHeader}>
                            <Text style={[styles.lemma, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                              {entry.lemma}
                            </Text>
                            <View style={[styles.langBadge, { backgroundColor: langColor + "22" }]}>
                              <Text style={[styles.langText, { color: langColor, fontFamily: "Inter_600SemiBold" }]}>
                                {entry.language === "he" ? "Hebrew" : "Greek"}
                              </Text>
                            </View>
                            <View style={[styles.strongBadge, { backgroundColor: theme.accent + "18" }]}>
                              <Text style={[styles.strongNum, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                                {entry.id}
                              </Text>
                            </View>
                          </View>
                          {wm.map.translatedWord && (
                            <View style={styles.translationRow}>
                              <Ionicons name="arrow-forward" size={12} color={theme.textMuted} />
                              <Text style={[styles.translatedWord, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                                "{wm.map.translatedWord}"
                              </Text>
                            </View>
                          )}
                          {entry.transliteration && (
                            <Text style={[styles.transliteration, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                              {entry.transliteration}{entry.pronunciation ? ` (${entry.pronunciation})` : ""}
                            </Text>
                          )}
                          <Text style={[styles.definition, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                            {entry.definition}
                          </Text>
                          {entry.kjvUsage && (
                            <View style={styles.usagePills}>
                              {entry.kjvUsage.split(",").slice(0, 5).map((u, j) => (
                                <View key={j} style={[styles.usagePill, { backgroundColor: theme.accent + "12" }]}>
                                  <Text style={[styles.usagePillText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                                    {u.trim()}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                {targetVerse && !wordQuery.isLoading && !hasWords && !generateWordsMutation.isPending && generateWordsMutation.isError && (
                  <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                    <Ionicons name="reload-outline" size={24} color={theme.accent} />
                    <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                      Could Not Load Words
                    </Text>
                    <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      The lexical data for {selectedBook.name} {selectedChapter}:{selectedVerse} is temporarily unavailable.
                    </Text>
                    <Pressable
                      onPress={() => generateWordsMutation.mutate()}
                      style={[styles.generateBtn, { backgroundColor: theme.accentDark }]}
                    >
                      <Text style={[styles.generateBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                        Try Again
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {studyMode === "concordance" ? (
          <>
            <View style={[styles.concordanceSearchBox, { backgroundColor: theme.backgroundCard }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.concordanceInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Search Strong's (e.g. love, agape, H430)"
                placeholderTextColor={theme.textMuted}
                value={concordanceSearch}
                onChangeText={setConcordanceSearch}
                testID="concordance-search-input"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {concordanceSearch.length > 0 && (
                <Pressable onPress={() => { setConcordanceSearch(""); setStudyMode("verse"); }}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </Pressable>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.concordanceLangRow} contentContainerStyle={{ gap: 8 }}>
              {([["all", "All"], ["he", "Hebrew (OT)"], ["gr", "Greek (NT)"]] as const).map(([val, label]) => (
                <Pressable
                  key={val}
                  onPress={() => setConcordanceLang(val)}
                  style={[styles.commentatorChip, { backgroundColor: concordanceLang === val ? theme.accentDark : theme.backgroundCard }]}
                >
                  <Text style={[styles.commentatorChipText, { color: concordanceLang === val ? "#fff" : theme.textSecondary, fontFamily: concordanceLang === val ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {concordanceQuery.isLoading && (
              <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 20 }} />
            )}

            {concordanceQuery.data && concordanceQuery.data.length === 0 && concordanceSearch.trim().length >= 2 && (
              <Text style={[styles.concordanceEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" as const, marginTop: 16 }]}>
                No entries found for "{concordanceSearch}"
              </Text>
            )}

            {concordanceQuery.data?.map((entry) => {
              const isExpanded = expandedEntry === entry.id;
              const langColor = entry.language === "he" ? "#2E7D32" : "#1565C0";
              const langLabel = entry.language === "he" ? "Hebrew" : "Greek";
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
                  style={[styles.concordanceCard, { backgroundColor: theme.backgroundCard }]}
                  testID={`concordance-${entry.id}`}
                >
                  <View style={styles.concordanceCardHeader}>
                    <Text style={[styles.concordanceLemma, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                      {entry.lemma}
                    </Text>
                    <View style={[styles.concordanceLangBadge, { backgroundColor: langColor + "18" }]}>
                      <Text style={[styles.concordanceLangText, { color: langColor, fontFamily: "Inter_600SemiBold" }]}>
                        {langLabel}
                      </Text>
                    </View>
                    <View style={[styles.concordanceIdBadge, { backgroundColor: theme.accent + "18" }]}>
                      <Text style={[styles.concordanceIdText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                        {entry.id}
                      </Text>
                    </View>
                  </View>
                  {entry.transliteration && (
                    <Text style={[styles.concordanceTranslit, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      {entry.transliteration}{entry.pronunciation ? ` (${entry.pronunciation})` : ""}
                    </Text>
                  )}
                  <Text style={[styles.concordanceDef, { color: theme.text, fontFamily: "Inter_400Regular" }]} numberOfLines={isExpanded ? undefined : 2}>
                    {entry.definition}
                  </Text>
                  {isExpanded && (
                    <>
                      {entry.derivation && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={[styles.concordanceSubLabel, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                            Derivation
                          </Text>
                          <Text style={[styles.concordanceSubText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                            {entry.derivation}
                          </Text>
                        </View>
                      )}
                      {entry.kjvUsage && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={[styles.concordanceSubLabel, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                            KJV Usage
                          </Text>
                          <View style={styles.kjvUsagePills}>
                            {entry.kjvUsage.split(",").map((u, ui) => (
                              <View key={ui} style={[styles.kjvUsagePill, { backgroundColor: theme.accent + "10" }]}>
                                <Text style={[styles.kjvUsagePillText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                                  {u.trim()}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  )}
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={theme.textMuted}
                    style={{ alignSelf: "center" as const, marginTop: 6 }}
                  />
                </Pressable>
              );
            })}

            <Pressable onPress={() => setStudyMode("verse")} style={{ paddingVertical: 12, alignItems: "center" as const }}>
              <Text style={{ color: theme.accentDark, fontFamily: "Inter_500Medium", fontSize: 13 }}>Close Concordance</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => setStudyMode("concordance")}
            style={{ flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, paddingVertical: 12, marginTop: 4, borderRadius: 10, backgroundColor: theme.backgroundSecondary }}
            testID="mode-concordance"
          >
            <Ionicons name="search-outline" size={14} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontFamily: "Inter_500Medium", fontSize: 13 }}>
              Search Strong's Concordance
            </Text>
          </Pressable>
        )}

        <View style={jpStyles.sectionDivider}>
          <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
          <Text style={[jpStyles.sectionDividerText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
            Your Observations
          </Text>
          <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
        </View>

        {OBSERVE_SECTIONS.map((section) => (
          <JournalPromptCard
            key={section.key}
            section={section}
            journalMap={observeJournalMap}
            onSave={handleObserveSave}
            isSaving={isObserveSaving}
            theme={theme}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); setSelectedVerse(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
            New Testament
          </Text>
          <View style={styles.passagePills}>
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); setSelectedVerse(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); setSelectedVerse(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chapterCount} chapters · {selectedBook.testament === "OT" ? "Old Testament" : "New Testament"}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => { setSelectedChapter(ch); setSelectedVerse(null); }}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function ContextParagraphs({ text, theme }: { text: string; theme: typeof Colors.light }) {
  const paragraphs = text.split(/\n\n+/).flatMap((block) => {
    const trimmed = block.trim();
    if (!trimmed) return [];
    const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s|$)/g);
    if (!sentences || sentences.length <= 2) return [trimmed];
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2).join("").trim());
    }
    return chunks;
  });
  return (
    <View style={{ gap: 14 }}>
      {paragraphs.map((p, i) => (
        <Text key={i} style={{ fontSize: 14, lineHeight: 22, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>
          {p}
        </Text>
      ))}
    </View>
  );
}

function ContextTab({ theme, sharedBook, sharedChapter, onBookChange, onChapterChange, allBooks, verseStart, verseEnd }: { theme: typeof Colors.light; sharedBook: BibleBook | null; sharedChapter: number | null; onBookChange: (b: BibleBook | null) => void; onChapterChange: (c: number | null) => void; allBooks?: BibleBook[]; verseStart?: number | null; verseEnd?: number | null }) {
  const { depth } = useStudyDepth();
  const selectedBook = sharedBook;
  const selectedChapter = sharedChapter;
  const setSelectedBook = onBookChange;
  const setSelectedChapter = onChapterChange;
  const { userId } = useAuth();
  const ctxBookId = selectedBook?.id ?? null;
  const { journalMap: contextJournalMap, handleSave: handleContextSave, isSaving: isContextSaving } = useJournalEntries(
    userId, ctxBookId, selectedChapter, "context", verseStart, verseEnd
  );

  const books = allBooks;

  const qc = useQueryClient();

  const { data: contextCards, isLoading } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${selectedBook?.id}&chapter=${selectedChapter}`],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/context/generate", {
        bookId: selectedBook!.id,
        chapter: selectedChapter,
        depth,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [`/api/context?book=${selectedBook?.id}&chapter=${selectedChapter}`],
      });
    },
  });

  const hasCards = contextCards && contextCards.length > 0;
  const [ctxGenAttempted, setCtxGenAttempted] = useState<string | null>(null);
  const ctxKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    if (selectedBook && selectedChapter && !isLoading && !hasCards && !generateMutation.isPending && ctxGenAttempted !== ctxKey) {
      setCtxGenAttempted(ctxKey);
      generateMutation.mutate();
    }
  }, [selectedBook?.id, selectedChapter, isLoading, hasCards]);

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const handleBookSelect = (book: BibleBook) => {
    if (selectedBook?.id === book.id) {
      setSelectedBook(null);
      setSelectedChapter(null);
    } else {
      setSelectedBook(book);
      setSelectedChapter(null);
    }
  };

  const handleChapterSelect = (ch: number) => {
    setSelectedChapter(ch);
  };

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  return (
    <View style={styles.tabContent}>
      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => handleBookSelect(b)}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
            New Testament
          </Text>
          <View style={styles.passagePills}>
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => handleBookSelect(b)}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chapterCount} chapters · {selectedBook.testament === "OT" ? "Old Testament" : "New Testament"}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => handleChapterSelect(ch)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && (
        <>
          <Pressable onPress={() => setSelectedChapter(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          <View style={{ backgroundColor: theme.accent + "08", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>
              CONTEXT
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
              {LAYER_PURPOSE.context}
            </Text>
          </View>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Loading historical context...</Text>
            </View>
          )}

          {hasCards && contextCards!.map((card) => (
            <View key={card.id} style={[styles.contextCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Text style={[styles.contextTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                {card.title}
              </Text>
              <ContextParagraphs text={card.content} theme={theme} />

              {card.historicalBackground && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="time-outline" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accentDark, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" }}>
                      Historical Background
                    </Text>
                  </View>
                  <ContextParagraphs text={card.historicalBackground} theme={theme} />
                </View>
              )}

              {card.culturalNotes && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="globe-outline" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accentDark, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" }}>
                      Cultural Notes
                    </Text>
                  </View>
                  <ContextParagraphs text={card.culturalNotes} theme={theme} />
                </View>
              )}

              {(card.authorInfo || card.dateWritten || card.audience) && (
                <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {card.authorInfo && (
                    <View style={{ backgroundColor: theme.accent + "12", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Author</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>{card.authorInfo}</Text>
                    </View>
                  )}
                  {card.dateWritten && (
                    <View style={{ backgroundColor: theme.accent + "12", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Date</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>{card.dateWritten}</Text>
                    </View>
                  )}
                  {card.audience && (
                    <View style={{ backgroundColor: theme.accent + "12", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Audience</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" }}>{card.audience}</Text>
                    </View>
                  )}
                </View>
              )}

              {card.themes && card.themes.length > 0 && (
                <View style={[styles.themePills, { marginTop: 16 }]}>
                  {card.themes.map((t, i) => (
                    <View key={i} style={[styles.themePill, { backgroundColor: theme.accent + "12" }]}>
                      <Text style={[styles.themePillText, { color: theme.accentDark, fontFamily: "Inter_500Medium" }]}>
                        {t}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {generateMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Uncovering Context
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Exploring the historical and cultural world of {selectedBook.name} {selectedChapter}
              </Text>
            </View>
          )}

          {!isLoading && !hasCards && !generateMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Explore This Chapter
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generate historical background, cultural notes, and key themes for {selectedBook.name} {selectedChapter}.
              </Text>
              <Pressable
                onPress={() => generateMutation.mutate()}
                style={({ pressed }) => [
                  {
                    marginTop: 14,
                    backgroundColor: theme.accentDark,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  Generate Context
                </Text>
              </Pressable>
              {generateMutation.isError && (
                <Text style={[styles.emptyBody, { color: theme.error, marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}

          <View style={jpStyles.sectionDivider}>
            <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
            <Text style={[jpStyles.sectionDividerText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
              Your Context Notes
            </Text>
            <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
          </View>

          {CONTEXT_SECTIONS.map((section) => (
            <JournalPromptCard
              key={section.key}
              section={section}
              journalMap={contextJournalMap}
              onSave={handleContextSave}
              isSaving={isContextSaving}
              theme={theme}
            />
          ))}

        </>
      )}
    </View>
  );
}

const COMMENTATOR_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  "Matthew Henry": { icon: "book", color: "#6366F1" },
  "Jamieson, Fausset & Brown": { icon: "library", color: "#0891B2" },
  "Adam Clarke": { icon: "school", color: "#059669" },
  "John Gill": { icon: "document-text", color: "#D97706" },
  "Ellen G. White": { icon: "sparkles", color: "#B8860B" },
};

function extractLeadInsight(content: string): { lead: string; rest: string } {
  const full = content.trim();
  const MAX_LEAD = 150;
  if (full.length <= MAX_LEAD) return { lead: full, rest: "" };
  const sentences = full.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (sentences) {
    let lead = "";
    let cutIdx = 0;
    for (let i = 0; i < sentences.length; i++) {
      const next = lead + sentences[i];
      if (next.length > MAX_LEAD && lead.length > 0) break;
      lead = next;
      cutIdx = i + 1;
    }
    const rest = sentences.slice(cutIdx).join("").trim();
    return { lead: lead.trim(), rest };
  }
  const spaceIdx = full.lastIndexOf(" ", MAX_LEAD);
  const cut = spaceIdx > 80 ? spaceIdx : MAX_LEAD;
  return { lead: full.substring(0, cut).trim() + "...", rest: full.substring(cut).trim() };
}

function CommentaryCard({ cr, theme }: { cr: CommentaryResult; theme: typeof Colors.light }) {
  const [expanded, setExpanded] = useState(false);
  const { lead, rest } = useMemo(() => extractLeadInsight(cr.entry.content), [cr.entry.content]);
  const hasMore = rest.length > 0;
  const meta = COMMENTATOR_META[cr.commentator?.name] || { icon: "person" as const, color: theme.accent };
  const commentatorDates = cr.commentator?.dates || COMMENTATORS.find(c => c.name === cr.commentator?.name)?.dates;
  const commentatorTradition = cr.commentator?.tradition || COMMENTATORS.find(c => c.name === cr.commentator?.name)?.tradition;

  return (
    <View style={{
      backgroundColor: theme.backgroundCard,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      marginBottom: 16,
      overflow: "hidden" as const,
    }}>
      <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 10, padding: 16, paddingBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: meta.color + "18", alignItems: "center" as const, justifyContent: "center" as const }}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: theme.text, fontFamily: "Lora_600SemiBold" }}>
            {cr.commentator?.name ?? "Unknown"}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 1 }}>
            {[commentatorDates, commentatorTradition].filter(Boolean).join(" \u00B7 ")}
          </Text>
        </View>
        {cr.entry.verseStart && (
          <View style={{ backgroundColor: theme.accent + "14", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>
              vv. {cr.entry.verseStart}{cr.entry.verseEnd && cr.entry.verseEnd !== cr.entry.verseStart ? `\u2013${cr.entry.verseEnd}` : ""}
            </Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: hasMore && !expanded ? 0 : 16 }}>
        <Text style={{ fontSize: 15, lineHeight: 24, color: theme.text, fontFamily: "Lora_400Regular" }}>
          {lead}
        </Text>
      </View>

      {hasMore && expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginVertical: 12 }} />
          <ContextParagraphs text={rest} theme={theme} />
        </View>
      )}

      {hasMore && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={({ pressed }) => [{
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "center" as const,
            gap: 4,
            paddingVertical: 10,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.border,
            backgroundColor: theme.backgroundCard,
            opacity: pressed ? 0.7 : 1,
          }]}
        >
          <Text style={{ fontSize: 12, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>
            {expanded ? "Less" : "Read More"}
          </Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={theme.accent} />
        </Pressable>
      )}
    </View>
  );
}

function HistoricVoicesTab({ theme, commentators, sharedBook, sharedChapter, onBookChange, onChapterChange, allBooks, verseStart, verseEnd }: { theme: typeof Colors.light; commentators: Commentator[]; sharedBook: BibleBook | null; sharedChapter: number | null; onBookChange: (b: BibleBook | null) => void; onChapterChange: (c: number | null) => void; allBooks?: BibleBook[]; verseStart?: number | null; verseEnd?: number | null }) {
  const selectedBook = sharedBook;
  const selectedChapter = sharedChapter;
  const setSelectedBook = onBookChange;
  const setSelectedChapter = onChapterChange;
  const [activeCommentator, setActiveCommentator] = useState<string | null>(null);
  const { userId } = useAuth();
  const bookId = selectedBook?.id ?? null;
  const { journalMap, handleSave: handleJournalSave, isSaving: isJournalSaving } = useJournalEntries(
    userId, bookId, selectedChapter, "voices", verseStart, verseEnd
  );

  const books = allBooks;

  const queryClient = useQueryClient();
  const commentaryQueryKey = `/api/commentary?book=${selectedBook?.id}&chapter=${selectedChapter}`;

  const { data: commentaryData, isLoading } = useQuery<CommentaryResult[]>({
    queryKey: [commentaryQueryKey],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const generateCommentaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/commentary/generate", {
        bookId: selectedBook!.id,
        chapter: selectedChapter,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([commentaryQueryKey], data);
    },
  });

  const hasCommentary = commentaryData && commentaryData.length > 0;
  const [showAllCommentary, setShowAllCommentary] = useState(false);
  const [comGenAttempted, setComGenAttempted] = useState<string | null>(null);
  const comKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    setActiveCommentator(null);
    setShowAllCommentary(false);
  }, [selectedBook?.id, selectedChapter]);

  useEffect(() => {
    if (selectedBook && selectedChapter && !isLoading && !hasCommentary && !generateCommentaryMutation.isPending && comGenAttempted !== comKey) {
      setComGenAttempted(comKey);
      generateCommentaryMutation.mutate();
    }
  }, [selectedBook?.id, selectedChapter, isLoading, hasCommentary]);

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  return (
    <View style={styles.tabContent}>
      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Browse Commentary
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
            Featured Commentators
          </Text>
          {commentators.map((c) => {
            const meta = COMMENTATOR_META[c.name] || { icon: "person" as const, color: theme.accent };
            return (
              <Pressable
                key={c.name}
                onPress={() => {
                  if (c.externalUrl) {
                    Linking.openURL(c.externalUrl);
                  }
                }}
                style={({ pressed }) => [
                  styles.commentatorCard,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                    opacity: pressed && c.externalUrl ? 0.75 : 1,
                  },
                ]}
              >
                <View style={[styles.avatarCircle, { backgroundColor: meta.color + "18" }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={styles.commentatorInfo}>
                  <Text style={[styles.commentatorName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                    {c.name}
                  </Text>
                  <Text style={[styles.commentatorMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {c.dates} {"\u00B7"} {c.tradition}
                  </Text>
                </View>
                {c.isPublicDomain ? (
                  <View style={[styles.pdBadge, { backgroundColor: theme.success + "22" }]}>
                    <Text style={[styles.pdText, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                      Public Domain
                    </Text>
                  </View>
                ) : (
                  <View style={styles.externalBadgeRow}>
                    <View style={[styles.pdBadge, { backgroundColor: theme.bookmarkBlue + "22" }]}>
                      <Text style={[styles.pdText, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                        External
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={14} color={theme.bookmarkBlue} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => setSelectedChapter(ch)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && (
        <>
          <Pressable onPress={() => setSelectedChapter(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          <View style={{ backgroundColor: theme.accent + "08", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>
              INSIGHT
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
              {LAYER_PURPOSE.voices}
            </Text>
          </View>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Gathering historic voices...</Text>
            </View>
          )}

          {hasCommentary && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commentatorFilterScroll} contentContainerStyle={styles.commentatorFilterRow}>
              <Pressable
                onPress={() => setActiveCommentator(null)}
                style={[
                  styles.commentatorChip,
                  { backgroundColor: !activeCommentator ? theme.accentDark : (theme.backgroundCard) },
                ]}
                testID="filter-all-commentators"
              >
                <Text style={[styles.commentatorChipText, { color: !activeCommentator ? "#fff" : theme.textSecondary, fontFamily: !activeCommentator ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                  All
                </Text>
              </Pressable>
              {Array.from(new Set(commentaryData!.map(cr => cr.commentator?.name))).filter(Boolean).map((name) => (
                <Pressable
                  key={name}
                  onPress={() => setActiveCommentator(activeCommentator === name ? null : name!)}
                  style={[
                    styles.commentatorChip,
                    { backgroundColor: activeCommentator === name ? theme.accentDark : (theme.backgroundCard) },
                  ]}
                  testID={`filter-commentator-${name}`}
                >
                  <Text style={[styles.commentatorChipText, { color: activeCommentator === name ? "#fff" : theme.textSecondary, fontFamily: activeCommentator === name ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {INSIGHT_SECTIONS.map((section) => (
            <JournalPromptCard
              key={section.key}
              section={section}
              journalMap={journalMap}
              onSave={handleJournalSave}
              isSaving={isJournalSaving}
              theme={theme}
            />
          ))}

          {(hasCommentary || generateCommentaryMutation.isPending || isLoading) && (
            <View style={jpStyles.sectionDivider}>
              <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
              <Text style={[jpStyles.sectionDividerText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
                Historic Voices
              </Text>
              <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
            </View>
          )}

          {hasCommentary && (() => {
            const filtered = commentaryData!.filter((cr) => !activeCommentator || cr.commentator?.name === activeCommentator);
            const featured = filtered.slice(0, 2);
            const remaining = filtered.slice(2);
            return (
              <>
                {featured.map((cr) => (
                  <CommentaryCard key={cr.entry.id} cr={cr} theme={theme} />
                ))}
                {remaining.length > 0 && !showAllCommentary && (
                  <Pressable
                    onPress={() => setShowAllCommentary(true)}
                    style={({ pressed }) => ({
                      flexDirection: "row" as const,
                      alignItems: "center" as const,
                      justifyContent: "center" as const,
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: theme.backgroundSecondary,
                      marginBottom: 16,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={theme.accent} />
                    <Text style={{ fontSize: 13, color: theme.accentDark, fontFamily: "Inter_600SemiBold" }}>
                      {remaining.length} more {remaining.length === 1 ? "voice" : "voices"}
                    </Text>
                  </Pressable>
                )}
                {showAllCommentary && remaining.map((cr) => (
                  <CommentaryCard key={cr.entry.id} cr={cr} theme={theme} />
                ))}
              </>
            );
          })()}

          {generateCommentaryMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Gathering Insights
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Drawing from classic scholars on {selectedBook.name} {selectedChapter}
              </Text>
            </View>
          )}

          {!isLoading && !hasCommentary && !generateCommentaryMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Explore Commentary
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generate commentary from classic scholars for {selectedBook.name} {selectedChapter}.
              </Text>
              <Pressable
                onPress={() => generateCommentaryMutation.mutate()}
                style={({ pressed }) => [
                  {
                    marginTop: 14,
                    backgroundColor: theme.accentDark,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  Generate Commentary
                </Text>
              </Pressable>
              {generateCommentaryMutation.isError && (
                <Text style={[styles.emptyBody, { color: theme.error, marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function RespondBackground({ template, theme }: { template: AppTemplate; theme: typeof Colors.light }) {
  const [bgExpanded, setBgExpanded] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setBgExpanded(!bgExpanded)}
        style={({ pressed }) => ({
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          gap: 6,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: theme.backgroundSecondary,
          marginTop: 6,
          marginBottom: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name={bgExpanded ? "chevron-up" : "book-outline"} size={14} color={theme.textMuted} />
        <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_500Medium" }}>
          {bgExpanded ? "Hide background" : "Then & Now background"}
        </Text>
      </Pressable>

      {bgExpanded && (
        <>
          {template.thenContext && (
            <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.appCardHeader}>
                <Ionicons name="time-outline" size={16} color={theme.accent} />
                <Text style={[styles.appCardLabel, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
                  Then
                </Text>
              </View>
              <ContextParagraphs text={template.thenContext} theme={theme} />
            </View>
          )}
          {template.nowApplication && template.nowApplication.split(/\n\n+/).length > 1 && (
            <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.appCardHeader}>
                <Ionicons name="today-outline" size={16} color={theme.success} />
                <Text style={[styles.appCardLabel, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                  Now
                </Text>
              </View>
              <ContextParagraphs text={template.nowApplication.split(/\n\n+/).slice(1).join("\n\n")} theme={theme} />
            </View>
          )}
        </>
      )}
    </>
  );
}

function ApplicationTab({ theme, sharedBook, sharedChapter, onBookChange, onChapterChange, allBooks, verseStart, verseEnd }: { theme: typeof Colors.light; sharedBook: BibleBook | null; sharedChapter: number | null; onBookChange: (b: BibleBook | null) => void; onChapterChange: (c: number | null) => void; allBooks?: BibleBook[]; verseStart?: number | null; verseEnd?: number | null }) {
  const { depth } = useStudyDepth();
  const selectedBook = sharedBook;
  const selectedChapter = sharedChapter;
  const setSelectedBook = onBookChange;
  const setSelectedChapter = onChapterChange;
  const { userId } = useAuth();
  const appBookId = selectedBook?.id ?? null;
  const { journalMap, handleSave: handleJournalSave, isSaving: isJournalSaving } = useJournalEntries(
    userId, appBookId, selectedChapter, "application", verseStart, verseEnd
  );

  const books = allBooks;

  const queryClient = useQueryClient();
  const appQueryKey = `/api/application?book=${selectedBook?.id}&chapter=${selectedChapter}`;

  const { data: templates, isLoading, isError } = useQuery<AppTemplate[]>({
    queryKey: [appQueryKey],
    enabled: !!selectedBook && !!selectedChapter,
  });

  const generateAppMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/application/generate", {
        bookId: selectedBook!.id,
        chapter: selectedChapter,
        depth,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([appQueryKey], data);
    },
  });

  const hasData = templates && templates.length > 0;
  const template = hasData ? templates![0] : null;
  const [appGenAttempted, setAppGenAttempted] = useState<string | null>(null);
  const appKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    if (selectedBook && selectedChapter && !isLoading && !hasData && !generateAppMutation.isPending && appGenAttempted !== appKey) {
      setAppGenAttempted(appKey);
      generateAppMutation.mutate();
    }
  }, [selectedBook?.id, selectedChapter, isLoading, hasData]);

  const otBooks = books?.filter((b) => b.testament === "OT") ?? [];
  const ntBooks = books?.filter((b) => b.testament === "NT") ?? [];

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1)
    : [];

  return (
    <View style={styles.tabContent}>
      <View style={[styles.appLayer, { backgroundColor: theme.primary }]}>
        <Text style={[styles.appLayerTitle, { fontFamily: "Lora_600SemiBold" }]}>
          Layer 4: Application
        </Text>
        <Text style={[styles.appLayerSub, { fontFamily: "Inter_400Regular" }]}>
          Bridge the ancient text to your life today -- Then vs. Now context, reflection questions, and prayer prompts.
        </Text>
        <View style={{ marginTop: 8 }}>
          <SDAVerifiedBadge variant="compact" />
        </View>
      </View>

      {!selectedBook && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Old Testament
          </Text>
          <View style={styles.passagePills}>
            {otBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
            New Testament
          </Text>
          <View style={styles.passagePills}>
            {ntBooks.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => { setSelectedBook(b); setSelectedChapter(null); }}
                style={[styles.bookPill, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.bookPillText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {b.abbreviation}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              All Books
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chapterCount} chapters · {selectedBook.testament === "OT" ? "Old Testament" : "New Testament"}
          </Text>
          <View style={styles.chapterGrid}>
            {chapters.map((ch) => (
              <Pressable
                key={ch}
                onPress={() => setSelectedChapter(ch)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {ch}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && (
        <>
          <Pressable onPress={() => setSelectedChapter(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accentDark, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          <View style={{ backgroundColor: theme.accent + "08", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: theme.accentDark, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>
              RESPOND
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
              {LAYER_PURPOSE.application}
            </Text>
          </View>

          {(isLoading || generateAppMutation.isPending) && !template && (
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: theme.backgroundCard, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, padding: 14 }}>
                <View style={{ height: 10, width: "60%", backgroundColor: theme.border, borderRadius: 5, marginBottom: 10 }} />
                <View style={{ height: 10, width: "90%", backgroundColor: theme.border, borderRadius: 5, marginBottom: 8 }} />
                <View style={{ height: 10, width: "75%", backgroundColor: theme.border, borderRadius: 5 }} />
              </View>
              <View style={{ backgroundColor: theme.backgroundCard, borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: theme.accent + "20" }}>
                <View style={{ height: 10, width: "80%", backgroundColor: theme.border, borderRadius: 5, marginBottom: 8 }} />
                <View style={{ height: 10, width: "55%", backgroundColor: theme.border, borderRadius: 5 }} />
              </View>
              <View style={{ backgroundColor: theme.backgroundCard, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, padding: 14 }}>
                <View style={{ height: 10, width: "45%", backgroundColor: theme.border, borderRadius: 5, marginBottom: 10 }} />
                <View style={{ height: 10, width: "85%", backgroundColor: theme.border, borderRadius: 5, marginBottom: 8 }} />
                <View style={{ height: 10, width: "70%", backgroundColor: theme.border, borderRadius: 5 }} />
              </View>
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" as const, marginTop: 4 }}>
                Preparing reflections...
              </Text>
            </View>
          )}

          {template?.nowApplication && (
            <View style={{ backgroundColor: theme.backgroundCard, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, lineHeight: 22, color: theme.text, fontFamily: "Lora_400Regular" }}>
                {template.nowApplication.split(/\n\n+/)[0]?.trim()}
              </Text>
            </View>
          )}

          {template?.prayerPrompt && (
            <View style={{ backgroundColor: theme.accent + "08", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: theme.accent + "40" }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Lora_400Regular", fontStyle: "italic" as const, lineHeight: 20 }}>
                {template.prayerPrompt}
              </Text>
            </View>
          )}

          {isError && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="warning-outline" size={24} color={theme.error} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Unable to Load
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Could not fetch application data for this chapter. Please check your connection and try again.
              </Text>
            </View>
          )}

          {!isLoading && !isError && !hasData && !generateAppMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={24} color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Apply This Chapter
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Generate a Then & Now study with reflection questions and prayer prompts for {selectedBook.name} {selectedChapter}.
              </Text>
              <Pressable
                onPress={() => generateAppMutation.mutate()}
                style={({ pressed }) => [
                  {
                    marginTop: 14,
                    backgroundColor: theme.accentDark,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
                  Generate Application
                </Text>
              </Pressable>
              {generateAppMutation.isError && (
                <Text style={[styles.emptyBody, { color: theme.error, marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}

          <View style={jpStyles.sectionDivider}>
            <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
            <Text style={[jpStyles.sectionDividerText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
              Your Response
            </Text>
            <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
          </View>

          {TRANSFORMATION_SECTIONS.map((section) => (
            <JournalPromptCard
              key={section.key}
              section={section}
              journalMap={journalMap}
              onSave={handleJournalSave}
              isSaving={isJournalSaving}
              theme={theme}
              showPrayerLink={section.key === "prayer_response"}
              userId={userId}
            />
          ))}

          {template && (template.thenContext || (template.nowApplication && template.nowApplication.split(/\n\n+/).length > 1)) && (
            <RespondBackground template={template} theme={theme} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, marginBottom: 2 },
  subtitle: { fontSize: 14 },
  tabScroll: { flexGrow: 0 },
  tabContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  tabPillFixed: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabLabel: { fontSize: 12 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  tabContent: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  passagePills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  passagePill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  passagePillText: { fontSize: 13 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  generateBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  generateBtnText: { color: "#fff", fontSize: 14 },
  loadingBox: { alignItems: "center", paddingVertical: 30, gap: 10 },
  loadingText: { fontSize: 13 },
  verseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  verseRefRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verseRef: { fontSize: 13 },
  verseText: { fontSize: 16, lineHeight: 26 },
  wordCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  wordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  lemma: { fontSize: 22 },
  langBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  langText: { fontSize: 10 },
  strongBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  strongNum: { fontSize: 10 },
  translationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  translatedWord: { fontSize: 14, fontStyle: "italic" },
  transliteration: { fontSize: 13 },
  definition: { fontSize: 14, lineHeight: 22 },
  usagePills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  usagePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  usagePillText: { fontSize: 11 },
  contextCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  contextCardHeader: { flexDirection: "row", alignItems: "center" },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  contextTitle: { fontSize: 16 },
  contextContent: { fontSize: 14, lineHeight: 22 },
  themePills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  themePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  themePillText: { fontSize: 11 },
  viewFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  viewFullText: { color: "#fff", fontSize: 14 },
  commentatorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  commentatorInfo: { flex: 1 },
  commentatorName: { fontSize: 15, marginBottom: 2 },
  commentatorMeta: { fontSize: 12 },
  pdBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pdText: { fontSize: 10 },
  externalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  commentaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  commentaryAuthor: { fontSize: 13, flex: 1 },
  verseBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  verseRange: { fontSize: 10 },
  commentaryTitle: { fontSize: 15 },
  commentaryText: { fontSize: 13, lineHeight: 21 },
  commentatorFilterScroll: { marginBottom: 14, maxHeight: 44 },
  commentatorFilterRow: { gap: 8, paddingVertical: 2 },
  commentatorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  commentatorChipText: { fontSize: 12 },
  appLayer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  appLayerTitle: { color: "#1F1A12", fontSize: 17, marginBottom: 8 },
  appLayerSub: { color: "#6B6660", fontSize: 13, lineHeight: 20 },
  layerRow: {
    flexDirection: "row",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  layerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  layerText: { flex: 1 },
  layerNum: { fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  layerName: { fontSize: 16, marginBottom: 3 },
  layerDesc: { fontSize: 13, lineHeight: 19 },
  bookPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookPillText: { fontSize: 12 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  backText: { fontSize: 14 },
  pickerBookName: { fontSize: 22, marginBottom: 4 },
  pickerMeta: { fontSize: 13, marginBottom: 12 },
  chapterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chapterCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterNum: { fontSize: 14 },
  appCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  appCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  appCardLabel: { fontSize: 12, letterSpacing: 0.3 },
  appCardBody: { fontSize: 14, lineHeight: 22 },
  questionRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  questionNum: { fontSize: 14, width: 20, textAlign: "right" as const },
  questionText: { fontSize: 14, lineHeight: 22, flex: 1 },
  studyModeToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  studyModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  studyModeBtnText: {
    fontSize: 13,
  },
  concordanceSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  concordanceInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  concordanceLangRow: {
    marginBottom: 12,
    flexGrow: 0,
  },
  concordanceEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  concordanceEmptyTitle: {
    fontSize: 20,
    marginTop: 4,
  },
  concordanceEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  concordanceCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  concordanceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  concordanceLemma: {
    fontSize: 20,
  },
  concordanceLangBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  concordanceLangText: {
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  concordanceIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  concordanceIdText: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  concordanceTranslit: {
    fontSize: 13,
    marginBottom: 6,
  },
  concordanceDef: {
    fontSize: 14,
    lineHeight: 20,
  },
  concordanceSubLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  concordanceSubText: {
    fontSize: 13,
    lineHeight: 19,
  },
  kjvUsagePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  kjvUsagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  kjvUsagePillText: {
    fontSize: 12,
  },
});

const lpStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bar: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 2,
    gap: 4,
  },
  segmentFirst: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  segmentLast: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  check: {
    marginRight: 0,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  nextStepText: {
    fontSize: 12,
    flex: 1,
  },
  depthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  depthLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
});

const ctaStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 52,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  completeText: {
    fontSize: 14,
  },
  gentleNote: {
    fontSize: 12,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    marginBottom: 10,
    lineHeight: 18,
    opacity: 0.8,
  },
});

const jpStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 13,
    flex: 1,
  },
  check: {
    marginLeft: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 64,
    maxHeight: 150,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  actionText: {
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 13,
  },
  savedContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  editHint: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.6,
  },
  sectionDivider: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  sectionDividerText: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  prayerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  prayerLinkText: {
    fontSize: 12,
  },
});

const dsStyles = StyleSheet.create({
  entryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  entryBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  entryBtnTextWrap: {
    flex: 1,
  },
  entryBtnTitle: {
    color: "#fff",
    fontSize: 15,
  },
  entryBtnSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 1,
  },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sessionBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  sessionDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionStepText: {
    fontSize: 11,
  },
  exitSessionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  exitSessionText: {
    fontSize: 12,
  },
  advanceContainer: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 10,
  },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 52,
  },
  advanceBtnText: {
    color: "#fff",
    fontSize: 15,
  },
  advanceSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  advanceSecondaryText: {
    fontSize: 13,
  },
  summaryContainer: {
    padding: 20,
    paddingBottom: 140,
  },
  summaryHeader: {
    alignItems: "center",
    marginBottom: 28,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 24,
    marginTop: 8,
  },
  summarySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  summaryCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  summaryCardTitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  summaryLayers: {
    gap: 10,
  },
  summaryLayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryLayerLabel: {
    fontSize: 14,
    flex: 1,
  },
  summaryLayerCheck: {
    fontSize: 12,
  },
  summaryEntryRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryEntryTitle: {
    fontSize: 13,
    flex: 1,
  },
  summaryEntryBadge: {
    fontSize: 10,
  },
  summaryEntryContent: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    paddingLeft: 22,
  },
  summaryCTAs: {
    marginTop: 12,
    gap: 10,
  },
  summaryCTAPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  summaryCTAPrimaryText: {
    color: "#fff",
    fontSize: 15,
  },
  summaryCTASecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryCTASecondaryText: {
    fontSize: 14,
  },
  summaryRef: {
    fontSize: 16,
    marginTop: 4,
  },
  summaryDepthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(31,26,18,0.08)",
  },
  summaryDepthText: {
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  summaryToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryTextBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(31,26,18,0.08)",
  },
  summaryTextContent: {
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  summaryActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  summaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryActionText: {
    fontSize: 13,
  },
});
