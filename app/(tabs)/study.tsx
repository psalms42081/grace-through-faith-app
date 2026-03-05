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
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import FeatureTutorial from "@/components/FeatureTutorial";
import { FOUR_LAYER_STUDY_STEPS } from "@/lib/tutorial-steps";

type Tab = "word" | "context" | "voices" | "application";

const LAYER_ORDER: Tab[] = ["word", "context", "voices", "application"];
const LAYER_LABELS: Record<Tab, string> = {
  word: "Text",
  context: "Context",
  voices: "Insight",
  application: "Transform",
};

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

  const depthColor = depthLabel === "Established" ? "#C9933A" : depthLabel === "Developing" ? "#3B6CB5" : theme.textMuted;

  return (
    <View style={lpStyles.container}>
      {depthLabel && (
        <View style={lpStyles.depthRow}>
          <Ionicons
            name={depthLabel === "Established" ? "diamond" : depthLabel === "Developing" ? "trending-up" : "leaf-outline"}
            size={13}
            color={depthColor}
          />
          <Text style={[lpStyles.depthLabel, { color: depthColor, fontFamily: "Inter_500Medium" }]}>
            Study Depth: {depthLabel}
          </Text>
        </View>
      )}
      <View style={lpStyles.bar}>
        {LAYER_ORDER.map((layer, i) => {
          const isActive = activeTab === layer;
          const isCompleted = completedLayers.has(layer);
          return (
            <Pressable
              key={layer}
              onPress={() => onTabPress(layer)}
              style={[
                lpStyles.segment,
                i === 0 && lpStyles.segmentFirst,
                i === LAYER_ORDER.length - 1 && lpStyles.segmentLast,
                isActive && { backgroundColor: theme.accent },
                !isActive && { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              {isCompleted && !isActive && (
                <Ionicons name="checkmark-circle" size={12} color={theme.accent} style={lpStyles.check} />
              )}
              {isCompleted && isActive && (
                <Ionicons name="checkmark-circle" size={12} color="#fff" style={lpStyles.check} />
              )}
              <Text
                style={[
                  lpStyles.label,
                  { color: isActive ? "#fff" : theme.textSecondary },
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
          <Text style={[lpStyles.nextStepText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
  isCompleted,
  canComplete,
  hasEntries,
  theme,
}: {
  activeTab: Tab;
  completedLayers: Set<string>;
  onMarkComplete: () => void;
  onNextLayer: () => void;
  isCompleted: boolean;
  canComplete: boolean;
  hasEntries: boolean;
  theme: typeof Colors.light;
}) {
  const currentIndex = LAYER_ORDER.indexOf(activeTab);
  const hasNext = currentIndex < LAYER_ORDER.length - 1;
  const nextLabel = hasNext ? LAYER_LABELS[LAYER_ORDER[currentIndex + 1]] : null;
  const isReflectiveLayer = activeTab === "voices" || activeTab === "application";

  if (!canComplete) return null;

  return (
    <View style={ctaStyles.container}>
      {!isCompleted ? (
        <>
          {isReflectiveLayer && !hasEntries && (
            <Text style={[ctaStyles.gentleNote, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Depth increases when you write a response.
            </Text>
          )}
          <Pressable
            onPress={onMarkComplete}
            style={[ctaStyles.btn, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={ctaStyles.btnText}>Mark Layer Complete</Text>
          </Pressable>
        </>
      ) : hasNext ? (
        <Pressable
          onPress={onNextLayer}
          style={[ctaStyles.btn, { backgroundColor: theme.accent }]}
        >
          <Text style={ctaStyles.btnText}>Next Layer: {nextLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      ) : (
        <View style={[ctaStyles.completeBanner, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
          <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
          <Text style={[ctaStyles.completeText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            All layers complete for this chapter
          </Text>
        </View>
      )}
    </View>
  );
}

const DEEP_SESSION_KEY = "@grace-through-faith/deep-session";

interface DeepSessionState {
  active: boolean;
  layerIndex: number;
  startedAt: number;
  completedLayersDuringSession: string[];
  bookId: number | null;
  chapter: number | null;
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
        { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 },
      ]}
      testID="start-deep-study"
    >
      <View style={dsStyles.entryBtnContent}>
        <Ionicons name={isPaused ? "play-circle-outline" : "compass-outline"} size={20} color="#fff" />
        <View style={dsStyles.entryBtnTextWrap}>
          <Text style={[dsStyles.entryBtnTitle, { fontFamily: "Inter_600SemiBold" }]}>
            {isPaused ? "Resume Deep Study" : "Start Deep Study"}
          </Text>
          <Text style={[dsStyles.entryBtnSub, { fontFamily: "Inter_400Regular" }]}>
            {isPaused ? "Continue where you left off" : `Guided 4-layer session  ${timeEst}`}
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

const FOUR_LAYERS = [
  {
    icon: "language-outline" as const,
    title: "Text",
    desc: "Study the original Greek and Hebrew words behind the English translation.",
    color: "#C9933A",
  },
  {
    icon: "time-outline" as const,
    title: "Context",
    desc: "Understand the historical and cultural setting of the passage.",
    color: "#3B6CB5",
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    title: "Insight",
    desc: "Read commentary from historic voices like Matthew Henry and Ellen White.",
    color: "#7C3AED",
  },
  {
    icon: "heart-outline" as const,
    title: "Transform",
    desc: "Apply Scripture to your life through guided reflection and prayer.",
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
          4-Layer Bible Study
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
          Go beyond surface reading. Each passage is studied through four
          progressive layers for deeper understanding and personal growth.
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
          backgroundColor: theme.accent,
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
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.accent }}>
            Choose a Different Passage
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
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
  onBegin: () => void;
  onCancel: () => void;
  theme: typeof Colors.light;
}) {
  const canFetch = bookId !== null && chapter !== null;
  const { data: summaryData, isLoading: summaryLoading } = useQuery<ChapterSummaryData | null>({
    queryKey: [`/api/chapter-summary?bookId=${bookId}&chapter=${chapter}`],
    enabled: canFetch,
  });

  const layers = [
    { icon: "book-outline" as const, title: "Text", desc: "Read the passage and explore original language word studies" },
    { icon: "time-outline" as const, title: "Context", desc: "Discover the historical and cultural setting" },
    { icon: "chatbubble-ellipses-outline" as const, title: "Insight", desc: "Hear from theologians and historic voices" },
    { icon: "heart-outline" as const, title: "Transformation", desc: "Apply the passage through reflection and prayer" },
  ];

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
          Deep Study
        </Text>
        <Text style={[introStyles.reference, { color: theme.accent, fontFamily: "Lora_600SemiBold" }]}>
          {reference}
        </Text>
      </View>

      {summaryLoading && canFetch && (
        <ActivityIndicator size="small" color={theme.accent} style={{ marginBottom: 16 }} />
      )}

      {summaryData ? (
        <View style={[introStyles.bigIdeaCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          {summaryData.thesisStatement ? (
            <>
              <Text style={[introStyles.bigIdeaLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                THESIS
              </Text>
              <Text style={[introStyles.bigIdeaText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                {summaryData.thesisStatement}
              </Text>
            </>
          ) : (
            <>
              <Text style={[introStyles.bigIdeaLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                BIG IDEA
              </Text>
              <Text style={[introStyles.bigIdeaText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                {summaryData.bigIdea}
              </Text>
            </>
          )}

          <Text style={[introStyles.bigIdeaLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold", marginTop: 14 }]}>
            NARRATIVE PLACEMENT
          </Text>
          <Text style={[introStyles.focusLine, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {summaryData.narrativePlacement || summaryData.narrativeRole}
          </Text>

          {summaryData.focusThemes.length > 0 && (
            <View style={introStyles.themesRow}>
              {summaryData.focusThemes.map((t, i) => (
                <View key={i} style={[introStyles.themeTag, { backgroundColor: theme.accent + "14" }]}>
                  <Text style={[introStyles.themeTagText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[introStyles.pastoralText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
            {summaryData.pastoralFrame}
          </Text>
        </View>
      ) : !summaryLoading ? (
        <View style={[introStyles.bigIdeaCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[introStyles.bigIdeaLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            YOUR SESSION
          </Text>
          <Text style={[introStyles.bigIdeaText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
            You will move through four layers of study, each building on the last, to take you from reading to transformation.
          </Text>
          <Text style={[introStyles.focusLine, { color: theme.textMuted, fontFamily: "Inter_400Regular", fontStyle: "italic" }]}>
            Orientation summary coming soon.
          </Text>
        </View>
      ) : null}

      <Text style={[introStyles.layersHeading, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
        The Four Layers
      </Text>

      {layers.map((layer, i) => (
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

      <Pressable
        onPress={onBegin}
        style={({ pressed }) => [introStyles.beginBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 }]}
        testID="begin-deep-study"
      >
        <Ionicons name="book-outline" size={18} color="#fff" />
        <Text style={[introStyles.beginBtnText, { fontFamily: "Inter_600SemiBold" }]}>
          Begin with Text
        </Text>
      </Pressable>

      <Pressable onPress={onCancel} hitSlop={8} style={introStyles.cancelBtn}>
        <Text style={[introStyles.cancelText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
          Cancel
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
          <Text style={[dsStyles.sessionBadgeText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            DEEP STUDY
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
  return (
    <View style={dsStyles.advanceContainer}>
      {!isCompleted && (
        <Pressable
          onPress={onMarkComplete}
          style={({ pressed }) => [dsStyles.advanceSecondary, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={theme.accent} />
          <Text style={[dsStyles.advanceSecondaryText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            Mark Complete
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={isLastLayer ? onFinish : onAdvance}
        style={({ pressed }) => [dsStyles.advanceBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 }]}
        testID="deep-study-advance"
      >
        <Text style={[dsStyles.advanceBtnText, { fontFamily: "Inter_600SemiBold" }]}>
          {isLastLayer ? "Finish Session" : `Continue to ${LAYER_LABELS[LAYER_ORDER[layerIndex + 1]]}`}
        </Text>
        <Ionicons name={isLastLayer ? "checkmark-done" : "arrow-forward"} size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const LAYER_FULL_NAMES: Record<Tab, string> = {
  word: "Text",
  context: "Context",
  voices: "Insight",
  application: "Transformation",
};

function formatStudySummary(
  reference: string,
  allCompletedLayers: Set<string>,
  insightJournalMap: Map<string, string>,
  transformJournalMap: Map<string, string>,
  depthLabel: string | null,
): string {
  const lines: string[] = [];
  lines.push("DEEP STUDY SUMMARY");
  lines.push(`Reference: ${reference}`);
  lines.push("");

  lines.push("LAYERS COMPLETED");
  for (const layer of LAYER_ORDER) {
    const status = allCompletedLayers.has(layer) ? "[x]" : "[ ]";
    lines.push(`  ${status} ${LAYER_FULL_NAMES[layer]}`);
  }
  lines.push("");

  if (depthLabel) {
    lines.push(`Study Depth: ${depthLabel}`);
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
    lines.push("TRANSFORMATION");
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

  lines.push("---");
  lines.push("Generated by Grace through Faith");

  return lines.join("\n");
}

function DeepSessionSummary({
  completedDuring,
  allCompletedLayers,
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

  const insightFilled = INSIGHT_SECTIONS.filter((s) => insightJournalMap.has(s.key));
  const transformFilled = TRANSFORMATION_SECTIONS.filter((s) => transformJournalMap.has(s.key));
  const allEntries = [
    ...insightFilled.map((s) => ({ ...s, content: insightJournalMap.get(s.key) ?? "", layerLabel: "Insight" })),
    ...transformFilled.map((s) => ({ ...s, content: transformJournalMap.get(s.key) ?? "", layerLabel: "Transformation" })),
  ];

  const summaryText = useMemo(
    () => formatStudySummary(reference, allCompletedLayers, insightJournalMap, transformJournalMap, depthLabel),
    [reference, allCompletedLayers, insightJournalMap, transformJournalMap, depthLabel]
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
          Session Complete
        </Text>
        <Text style={[dsStyles.summarySubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {elapsed > 0 ? `${elapsed} minute${elapsed !== 1 ? "s" : ""} of focused study` : "Deep study session finished"}
        </Text>
        {reference ? (
          <Text style={[dsStyles.summaryRef, { color: theme.accent, fontFamily: "Lora_700Bold" }]}>
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
                {done && <Text style={[dsStyles.summaryLayerCheck, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>Complete</Text>}
              </View>
            );
          })}
        </View>
        {depthLabel && (
          <View style={dsStyles.summaryDepthRow}>
            <Ionicons
              name={depthLabel === "Established" ? "diamond" : depthLabel === "Developing" ? "trending-up" : "leaf-outline"}
              size={14}
              color={depthLabel === "Established" ? "#C9933A" : depthLabel === "Developing" ? "#3B6CB5" : theme.textMuted}
            />
            <Text style={[dsStyles.summaryDepthText, {
              color: depthLabel === "Established" ? "#C9933A" : depthLabel === "Developing" ? "#3B6CB5" : theme.textMuted,
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
            Study Summary
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
                  <Text style={[dsStyles.summaryActionText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
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
            <Text style={[dsStyles.summaryCTASecondaryText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              Save Prayer Response
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onDone}
          style={({ pressed }) => [dsStyles.summaryCTAPrimary, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 }]}
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

const INSIGHT_SECTIONS: PromptSection[] = [
  { key: "theological_themes", title: "Theological Themes", icon: "prism-outline", color: "#C9933A", placeholder: "What theological themes emerge from this passage?" },
  { key: "revelation_of_god", title: "Revelation of God", icon: "eye-outline", color: "#3B6CB5", placeholder: "What does this passage reveal about God's character or nature?" },
  { key: "revelation_of_humanity", title: "Revelation of Humanity", icon: "people-outline", color: "#2E7D32", placeholder: "What does this teach about humanity's condition or calling?" },
  { key: "narrative_connection", title: "Biblical Narrative Connection", icon: "git-merge-outline", color: "#8B5CF6", placeholder: "How does this connect to the larger biblical story?" },
];

const TRANSFORMATION_SECTIONS: PromptSection[] = [
  { key: "belief_challenged", title: "Belief or Assumption Challenged", icon: "bulb-outline", color: "#C9933A", placeholder: "What belief or assumption does this text challenge in you?" },
  { key: "habit_shaped", title: "Habit or Practice Shaped", icon: "footsteps-outline", color: "#2E7D32", placeholder: "What habit or daily practice could this shape?" },
  { key: "conversation_impacted", title: "Conversation or Relationship Impacted", icon: "chatbubbles-outline", color: "#3B6CB5", placeholder: "How might this change a conversation or relationship?" },
  { key: "prayer_response", title: "Prayer Response", icon: "hand-left-outline", color: "#8B5CF6", placeholder: "Write a prayer in response to this passage..." },
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
  const [editing, setEditing] = useState(false);
  const hasContent = savedContent.length > 0;

  useEffect(() => {
    setText(journalMap.get(section.key) ?? "");
  }, [journalMap, section.key]);

  const handleSave = () => {
    onSave(section.key, text);
    setEditing(false);
  };

  return (
    <View style={[jpStyles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={jpStyles.header}>
        <View style={[jpStyles.iconWrap, { backgroundColor: section.color + "18" }]}>
          <Ionicons name={section.icon} size={16} color={section.color} />
        </View>
        <Text style={[jpStyles.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {section.title}
        </Text>
        {hasContent && !editing && (
          <Ionicons name="checkmark-circle" size={18} color={theme.accent} style={jpStyles.check} />
        )}
      </View>

      {editing || !hasContent ? (
        <View>
          <TextInput
            style={[
              jpStyles.input,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder={section.placeholder}
            placeholderTextColor={theme.textMuted}
            multiline
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
          <View style={jpStyles.actions}>
            {hasContent && (
              <Pressable onPress={() => { setText(savedContent); setEditing(false); }}>
                <Text style={[jpStyles.actionText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleSave}
              disabled={isSaving || text.trim().length === 0}
              style={[jpStyles.saveBtn, { backgroundColor: theme.accent, opacity: isSaving || text.trim().length === 0 ? 0.5 : 1 }]}
            >
              <Text style={[jpStyles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={[jpStyles.savedContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {savedContent}
          </Text>
          <Text style={[jpStyles.editHint, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Tap to edit
          </Text>
        </Pressable>
      )}

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

function useJournalEntries(userId: string, bookId: number | null, chapter: number | null, layer: string) {
  const queryClient = useQueryClient();
  const canFetch = bookId !== null && chapter !== null;
  const queryKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=${layer}`;

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
  { id: "word", label: "Text", icon: "language-outline" },
  { id: "context", label: "Context", icon: "time-outline" },
  { id: "voices", label: "Insight", icon: "chatbubble-ellipses-outline" },
  { id: "application", label: "Transform", icon: "heart-outline" },
];

interface Commentator {
  name: string;
  dates: string;
  tradition: string;
  isPublicDomain: boolean;
  externalUrl?: string;
}

const COMMENTATORS: Commentator[] = [
  { name: "Matthew Henry", dates: "1662\u20131714", tradition: "Reformed", isPublicDomain: true },
  { name: "Jamieson, Fausset & Brown", dates: "1871", tradition: "Presbyterian", isPublicDomain: true },
  { name: "Adam Clarke", dates: "1762\u20131832", tradition: "Wesleyan", isPublicDomain: true },
  { name: "John Gill", dates: "1697\u20131771", tradition: "Baptist", isPublicDomain: true },
  { name: "Ellen G. White", dates: "1827\u20131915", tradition: "Adventist", isPublicDomain: false, externalUrl: "https://egwwritings.org" },
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
  };
}


export default function StudyScreen() {
  const { theme, isDark } = useTheme();
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
  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab && validTabs.includes(params.tab as Tab) ? (params.tab as Tab) : "word"
  );

  useEffect(() => {
    if (params.tab && ["word", "context", "voices", "application"].includes(params.tab)) {
      setActiveTab(params.tab as Tab);
    }
  }, [params.tab]);

  const bookId = params.bookId ? parseInt(params.bookId) : null;
  const chapter = params.chapter ? parseInt(params.chapter) : null;
  const canTrack = bookId !== null && chapter !== null;

  const completionKey = `/api/layer-completions?userId=${userId}&bookId=${bookId}&chapter=${chapter}`;
  const { data: completions } = useQuery<LayerCompletionEntry[]>({
    queryKey: [completionKey],
    enabled: canTrack,
  });

  const completedLayers = useMemo(
    () => new Set<string>((completions ?? []).map((c) => c.layer)),
    [completions]
  );

  const markCompleteMutation = useMutation({
    mutationFn: async (layer: string) => {
      const res = await apiRequest("POST", "/api/layer-completions", {
        userId,
        bookId,
        chapter,
        layer,
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

  const [deepSession, setDeepSessionRaw] = useState<DeepSessionState>({
    active: false,
    layerIndex: 0,
    startedAt: 0,
    completedLayersDuringSession: [],
    bookId: null,
    chapter: null,
  });
  const deepSessionRef = useRef(deepSession);
  const setDeepSession = useCallback((s: DeepSessionState) => {
    deepSessionRef.current = s;
    setDeepSessionRaw(s);
  }, []);
  const [showSummary, setShowSummary] = useState(false);
  const [showDeepIntro, setShowDeepIntro] = useState(false);
  const [showLayerIntro, setShowLayerIntro] = useState(params.showIntro === "true");

  const [pausedLayerIndex, setPausedLayerIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DEEP_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DeepSessionState;
          if (parsed.bookId === bookId && parsed.chapter === chapter) {
            if (parsed.active) {
              setDeepSession(parsed);
              setActiveTab(LAYER_ORDER[parsed.layerIndex]);
            } else {
              setPausedLayerIndex(parsed.layerIndex);
              setDeepSession(parsed);
            }
          } else {
            await AsyncStorage.removeItem(DEEP_SESSION_KEY);
          }
        }
      } catch {}
    })();
  }, [bookId, chapter]);

  const persistSession = useCallback(async (state: DeepSessionState, remove?: boolean) => {
    setDeepSession(state);
    if (remove || (!state.active && !state.bookId)) {
      await AsyncStorage.removeItem(DEEP_SESSION_KEY);
    } else {
      await AsyncStorage.setItem(DEEP_SESSION_KEY, JSON.stringify(state));
    }
  }, []);

  const startDeepSession = useCallback(() => {
    if (pausedLayerIndex !== null && pausedLayerIndex > 0) {
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

  const beginDeepSessionFromIntro = useCallback(() => {
    const firstIncomplete = LAYER_ORDER.findIndex((l) => !completedLayers.has(l));
    const startIdx = firstIncomplete >= 0 ? firstIncomplete : 0;
    const state: DeepSessionState = {
      active: true,
      layerIndex: startIdx,
      startedAt: Date.now(),
      completedLayersDuringSession: [],
      bookId,
      chapter,
    };
    persistSession(state);
    setActiveTab(LAYER_ORDER[startIdx]);
    setPausedLayerIndex(null);
    setShowSummary(false);
    setShowDeepIntro(false);
  }, [bookId, chapter, completedLayers, persistSession]);

  const exitDeepSession = useCallback((abandon?: boolean) => {
    const current = deepSessionRef.current;
    if (abandon) {
      persistSession({ active: false, layerIndex: 0, startedAt: 0, completedLayersDuringSession: [], bookId: null, chapter: null }, true);
      setShowSummary(false);
      setPausedLayerIndex(null);
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
    setDeepSession(final);
    AsyncStorage.removeItem(DEEP_SESSION_KEY);
    setShowSummary(true);
  }, [setDeepSession]);

  const insightJournalKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=voices`;
  const { data: insightEntries } = useQuery<JournalEntry[]>({
    queryKey: [insightJournalKey],
    enabled: canTrack,
  });
  const insightJournalMap = useMemo(() => {
    const map = new Map<string, string>();
    (insightEntries ?? []).forEach((e) => map.set(e.sectionKey, e.content));
    return map;
  }, [insightEntries]);

  const transformJournalKey = `/api/study-journal?userId=${userId}&bookId=${bookId}&chapter=${chapter}&layer=application`;
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
  }, [insightJournalMap, transformJournalMap]);

  const nextStepText = useMemo(
    () => computeNextStep(completedLayers, layerProgress, activeTab),
    [completedLayers, layerProgress, activeTab]
  );

  const studyDepthLabel = useMemo(() => {
    const l1l2Done = completedLayers.has("word") && completedLayers.has("context");
    const l3l4Done = completedLayers.has("voices") && completedLayers.has("application");
    const insightCount = insightJournalMap.size;
    const allPromptsCount = insightJournalMap.size + transformJournalMap.size;
    if (l1l2Done && l3l4Done && allPromptsCount >= 8) return "Established";
    if (l1l2Done && insightCount >= 2) return "Developing";
    if (completedLayers.size > 0 || allPromptsCount > 0) return "Emerging";
    return null;
  }, [completedLayers, insightJournalMap, transformJournalMap]);

  const activeLayerHasEntries = useMemo(() => {
    if (activeTab === "voices") return insightJournalMap.size > 0;
    if (activeTab === "application") return transformJournalMap.size > 0;
    return true;
  }, [activeTab, insightJournalMap, transformJournalMap]);

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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  if (showLayerIntro) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16 }]}>
        <FourLayerIntro
          theme={theme}
          hasPassage={canTrack}
          onPickPassage={() => {
            setShowLayerIntro(false);
            router.push("/(tabs)/read");
          }}
          onContinue={() => setShowLayerIntro(false)}
        />
      </View>
    );
  }

  if (showDeepIntro) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad + 16 }]}>
        <DeepStudyIntro
          reference={params.bookName && chapter ? `${params.bookName} ${chapter}` : "Scripture"}
          bookId={params.bookId ? Number(params.bookId) : null}
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
          insightJournalMap={insightJournalMap}
          transformJournalMap={transformJournalMap}
          startedAt={deepSession.startedAt}
          onDone={() => exitDeepSession(true)}
          onSavePrayer={handleSavePrayerFromSummary}
          hasPrayerContent={prayerContent.length > 0}
          theme={theme}
          reference={params.bookName && chapter ? `${params.bookName} ${chapter}` : "Study Session"}
          depthLabel={studyDepthLabel}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FeatureTutorial tutorialId="four-layer-study" steps={FOUR_LAYER_STUDY_STEPS} />
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study Tools
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Deep dive into Scripture
        </Text>
      </View>

      {deepSession.active && (
        <DeepSessionBar
          layerIndex={deepSession.layerIndex}
          onExit={exitDeepSession}
          theme={theme}
        />
      )}

      {canTrack && !deepSession.active && (
        <LayerProgressBar
          activeTab={activeTab}
          completedLayers={completedLayers}
          onTabPress={setActiveTab}
          theme={theme}
          nextStepText={nextStepText}
          depthLabel={studyDepthLabel}
        />
      )}

      {canTrack && !deepSession.active && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <DeepStudyEntryButton
            completedLayers={completedLayers}
            onStart={startDeepSession}
            theme={theme}
            isPaused={pausedLayerIndex !== null}
          />
        </View>
      )}

      {!deepSession.active && (
        <View
          style={[styles.tabRow, { backgroundColor: theme.background }]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabPillFixed,
                  {
                    backgroundColor: isActive ? theme.accent : theme.backgroundSecondary,
                    borderColor: isActive ? theme.accent : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? "#fff" : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? "#fff" : theme.textSecondary,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "word" && <WordStudyTab theme={theme} initialBookId={params.bookId} initialChapter={params.chapter} initialVerse={params.verse} initialVerseId={params.verseId} initialVerseText={params.verseText} initialBookName={params.bookName} isDeepSession={deepSession.active} />}
        {activeTab === "context" && <ContextTab theme={theme} initialBookId={params.bookId} initialChapter={params.chapter} initialBookName={params.bookName} />}
        {activeTab === "voices" && <HistoricVoicesTab theme={theme} commentators={COMMENTATORS} initialBookId={params.bookId} initialChapter={params.chapter} initialBookName={params.bookName} />}
        {activeTab === "application" && <ApplicationTab theme={theme} initialBookId={params.bookId} initialChapter={params.chapter} initialBookName={params.bookName} />}

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

function WordStudyTab({ theme, initialBookId, initialChapter, initialVerse, initialVerseId, initialVerseText, initialBookName, isDeepSession }: { theme: typeof Colors.light; initialBookId?: string; initialChapter?: string; initialVerse?: string; initialVerseId?: string; initialVerseText?: string; initialBookName?: string; isDeepSession?: boolean }) {
  const [studyMode, setStudyMode] = useState<"verse" | "concordance">("verse");
  const [lexicalExpanded, setLexicalExpanded] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(initialVerse ? parseInt(initialVerse) : null);
  const [didInit, setDidInit] = useState(false);
  const [concordanceSearch, setConcordanceSearch] = useState("");
  const [concordanceLang, setConcordanceLang] = useState<"all" | "he" | "gr">("all");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

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

  if (isDeepSession && selectedBook && selectedChapter) {
    const allVerses = passageQuery.data?.verses ?? [];
    return (
      <View style={styles.tabContent}>
        <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border, marginBottom: 16 }]}>
          <View style={styles.verseRefRow}>
            <Ionicons name="book-outline" size={14} color={theme.accent} />
            <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name} {selectedChapter}
            </Text>
          </View>
          {passageQuery.isLoading ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 20 }} />
          ) : (
            <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular", lineHeight: 26 }]}>
              {allVerses.map((v) => (
                <React.Fragment key={v.id}>
                  <Text style={{ color: theme.accent, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
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
                  Select a verse to explore its original language words
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
                  <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    All Verses
                  </Text>
                </Pressable>

                {targetVerse && (
                  <View style={[styles.verseCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={styles.verseRefRow}>
                      <Ionicons name="book-outline" size={14} color={theme.accent} />
                      <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
                      {generateWordsMutation.isPending ? "Generating word analysis..." : "Loading word analysis..."}
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
                              <Text style={[styles.strongNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
                                  <Text style={[styles.usagePillText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
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
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.studyModeToggle}>
        <Pressable
          onPress={() => setStudyMode("verse")}
          style={[styles.studyModeBtn, { backgroundColor: studyMode === "verse" ? theme.accent : theme.backgroundCard }]}
          testID="mode-verse-study"
        >
          <Ionicons name="book-outline" size={14} color={studyMode === "verse" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.studyModeBtnText, { color: studyMode === "verse" ? "#fff" : theme.textSecondary, fontFamily: studyMode === "verse" ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
            Verse Study
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setStudyMode("concordance")}
          style={[styles.studyModeBtn, { backgroundColor: studyMode === "concordance" ? theme.accent : theme.backgroundCard }]}
          testID="mode-concordance"
        >
          <Ionicons name="search-outline" size={14} color={studyMode === "concordance" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.studyModeBtnText, { color: studyMode === "concordance" ? "#fff" : theme.textSecondary, fontFamily: studyMode === "concordance" ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
            Concordance
          </Text>
        </Pressable>
      </View>

      {studyMode === "concordance" && (
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
              <Pressable onPress={() => setConcordanceSearch("")}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.concordanceLangRow} contentContainerStyle={{ gap: 8 }}>
            {([["all", "All"], ["he", "Hebrew (OT)"], ["gr", "Greek (NT)"]] as const).map(([val, label]) => (
              <Pressable
                key={val}
                onPress={() => setConcordanceLang(val)}
                style={[styles.commentatorChip, { backgroundColor: concordanceLang === val ? theme.accent : theme.backgroundCard }]}
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

          {concordanceSearch.trim().length < 2 && (
            <View style={styles.concordanceEmpty}>
              <Ionicons name="library-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.concordanceEmptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Strong's Concordance
              </Text>
              <Text style={[styles.concordanceEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Search 14,000+ Hebrew and Greek word definitions from Strong's Exhaustive Concordance
              </Text>
            </View>
          )}

          {concordanceQuery.data && concordanceQuery.data.length === 0 && concordanceSearch.trim().length >= 2 && (
            <View style={styles.concordanceEmpty}>
              <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.concordanceEmptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                No entries found for "{concordanceSearch}"
              </Text>
            </View>
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
                    <Text style={[styles.concordanceIdText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
                        <Text style={[styles.concordanceSubLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          Derivation
                        </Text>
                        <Text style={[styles.concordanceSubText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                          {entry.derivation}
                        </Text>
                      </View>
                    )}
                    {entry.kjvUsage && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.concordanceSubLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                          KJV Usage
                        </Text>
                        <View style={styles.kjvUsagePills}>
                          {entry.kjvUsage.split(",").map((u, i) => (
                            <View key={i} style={[styles.kjvUsagePill, { backgroundColor: theme.accent + "10" }]}>
                              <Text style={[styles.kjvUsagePillText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
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
                  style={{ alignSelf: "center", marginTop: 6 }}
                />
              </Pressable>
            );
          })}
        </>
      )}

      {studyMode === "verse" && !selectedBook && (
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
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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

      {selectedBook && selectedChapter && !selectedVerse && (
        <>
          <Pressable onPress={() => { setSelectedChapter(null); setSelectedVerse(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>
          <Text style={[styles.pickerMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Select a verse for word study
          </Text>

          {passageQuery.isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          <View style={styles.chapterGrid}>
            {verses.map((v) => (
              <Pressable
                key={v.verse}
                onPress={() => setSelectedVerse(v.verse)}
                style={[styles.chapterCell, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
              >
                <Text style={[styles.chapterNum, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {v.verse}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedBook && selectedChapter && selectedVerse && (
        <>
          <Pressable onPress={() => setSelectedVerse(null)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name} {selectedChapter}
            </Text>
          </Pressable>

          {targetVerse && (
            <View style={[styles.verseCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.verseRefRow}>
                <Ionicons name="book-outline" size={14} color={theme.accent} />
                <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
                {generateWordsMutation.isPending ? "Generating word analysis..." : "Loading word analysis..."}
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
                        <Text style={[styles.strongNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
                            <Text style={[styles.usagePillText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
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
                Generation Failed
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Could not generate word analysis for {selectedBook.name} {selectedChapter}:{selectedVerse}. Tap below to try again.
              </Text>
              <Pressable
                onPress={() => generateWordsMutation.mutate()}
                style={[styles.generateBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.generateBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Retry
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function ContextTab({ theme, initialBookId, initialChapter, initialBookName }: { theme: typeof Colors.light; initialBookId?: string; initialChapter?: string; initialBookName?: string }) {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [didInit, setDidInit] = useState(false);

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

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
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {hasCards && contextCards!.map((card) => (
            <View key={card.id} style={[styles.contextCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Text style={[styles.contextTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                {card.title}
              </Text>
              <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {card.content}
              </Text>

              {card.historicalBackground && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="time-outline" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" }}>
                      Historical Background
                    </Text>
                  </View>
                  <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {card.historicalBackground}
                  </Text>
                </View>
              )}

              {card.culturalNotes && (
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="globe-outline" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" }}>
                      Cultural Notes
                    </Text>
                  </View>
                  <Text style={[styles.contextContent, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {card.culturalNotes}
                  </Text>
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
                    <View key={i} style={[styles.themePill, { backgroundColor: theme.primary + "22" }]}>
                      <Text style={[styles.themePillText, { color: theme.primary, fontFamily: "Inter_500Medium" }]}>
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
                Generating Context
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Preparing historical and cultural context for {selectedBook.name} {selectedChapter}...
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
                    backgroundColor: theme.accent,
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
                <Text style={[styles.emptyBody, { color: "#e74c3c", marginTop: 8, fontFamily: "Inter_400Regular" }]}>
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

function HistoricVoicesTab({ theme, commentators, initialBookId, initialChapter, initialBookName }: { theme: typeof Colors.light; commentators: Commentator[]; initialBookId?: string; initialChapter?: string; initialBookName?: string }) {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [didInit, setDidInit] = useState(false);
  const [activeCommentator, setActiveCommentator] = useState<string | null>(null);
  const { userId } = useAuth();
  const bookId = selectedBook?.id ?? null;
  const { journalMap, handleSave: handleJournalSave, isSaving: isJournalSaving } = useJournalEntries(
    userId, bookId, selectedChapter, "voices"
  );

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

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
  const [comGenAttempted, setComGenAttempted] = useState<string | null>(null);
  const comKey = selectedBook && selectedChapter ? `${selectedBook.id}_${selectedChapter}` : null;

  useEffect(() => {
    setActiveCommentator(null);
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
          {commentators.map((c) => (
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
              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                <Ionicons name="person" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.commentatorInfo}>
                <Text style={[styles.commentatorName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  {c.name}
                </Text>
                <Text style={[styles.commentatorMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {c.dates} · {c.tradition}
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
          ))}
        </>
      )}

      {selectedBook && !selectedChapter && (
        <>
          <Pressable onPress={() => { setSelectedBook(null); setSelectedChapter(null); }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={16} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {hasCommentary && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commentatorFilterScroll} contentContainerStyle={styles.commentatorFilterRow}>
              <Pressable
                onPress={() => setActiveCommentator(null)}
                style={[
                  styles.commentatorChip,
                  { backgroundColor: !activeCommentator ? theme.accent : (theme.backgroundCard) },
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
                    { backgroundColor: activeCommentator === name ? theme.accent : (theme.backgroundCard) },
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

          {hasCommentary && commentaryData!
            .filter((cr) => !activeCommentator || cr.commentator?.name === activeCommentator)
            .map((cr) => (
            <View key={cr.entry.id} style={[styles.commentaryCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.commentaryHeader}>
                <View style={[styles.avatarSmall, { backgroundColor: theme.primary }]}>
                  <Ionicons name="person" size={14} color={Colors.light.accent} />
                </View>
                <Text style={[styles.commentaryAuthor, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {cr.commentator?.name ?? "Unknown"}
                </Text>
                {cr.entry.verseStart && (
                  <View style={[styles.verseBadge, { backgroundColor: theme.accent + "18" }]}>
                    <Text style={[styles.verseRange, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      vv. {cr.entry.verseStart}{cr.entry.verseEnd && cr.entry.verseEnd !== cr.entry.verseStart ? `-${cr.entry.verseEnd}` : ""}
                    </Text>
                  </View>
                )}
              </View>
              {cr.entry.title && (
                <Text style={[styles.commentaryTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                  {cr.entry.title}
                </Text>
              )}
              <Text style={[styles.commentaryText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {cr.entry.content}
              </Text>
            </View>
          ))}

          {generateCommentaryMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Generating Commentary
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Creating scholarly commentary for {selectedBook.name} {selectedChapter}...
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
                    backgroundColor: theme.accent,
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
                <Text style={[styles.emptyBody, { color: "#e74c3c", marginTop: 8, fontFamily: "Inter_400Regular" }]}>
                  Failed to generate. Please try again.
                </Text>
              )}
            </View>
          )}

          <View style={jpStyles.sectionDivider}>
            <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
            <Text style={[jpStyles.sectionDividerText, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
              Your Insights
            </Text>
            <View style={[jpStyles.sectionDividerLine, { backgroundColor: theme.border }]} />
          </View>

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
        </>
      )}
    </View>
  );
}

function ApplicationTab({ theme, initialBookId, initialChapter, initialBookName }: { theme: typeof Colors.light; initialBookId?: string; initialChapter?: string; initialBookName?: string }) {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(initialChapter ? parseInt(initialChapter) : null);
  const [didInit, setDidInit] = useState(false);
  const { userId } = useAuth();
  const appBookId = selectedBook?.id ?? null;
  const { journalMap, handleSave: handleJournalSave, isSaving: isJournalSaving } = useJournalEntries(
    userId, appBookId, selectedChapter, "application"
  );

  const { data: books } = useQuery<BibleBook[]>({
    queryKey: ["/api/books"],
  });

  useEffect(() => {
    if (books && initialBookId && !didInit) {
      const book = books.find(b => b.id === parseInt(initialBookId));
      if (book) {
        setSelectedBook(book);
        setDidInit(true);
      }
    }
  }, [books, initialBookId, didInit]);

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
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
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
            <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {selectedBook.name}
            </Text>
          </Pressable>
          <Text style={[styles.pickerBookName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {selectedBook.name} {selectedChapter}
          </Text>

          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {template && (
            <>
              {template.keyTheme && (
                <View style={[styles.categoryBadge, { backgroundColor: theme.accent + "18", alignSelf: "flex-start" }]}>
                  <Text style={[styles.categoryText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    {template.keyTheme}
                  </Text>
                </View>
              )}

              <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <View style={styles.appCardHeader}>
                  <Ionicons name="time-outline" size={16} color={theme.accent} />
                  <Text style={[styles.appCardLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    Then (Historical Context)
                  </Text>
                </View>
                <Text style={[styles.appCardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {template.thenContext}
                </Text>
              </View>

              <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <View style={styles.appCardHeader}>
                  <Ionicons name="today-outline" size={16} color={theme.success} />
                  <Text style={[styles.appCardLabel, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                    Now (Modern Application)
                  </Text>
                </View>
                <Text style={[styles.appCardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {template.nowApplication}
                </Text>
              </View>

              {template.reflectionQuestions && template.reflectionQuestions.length > 0 && (
                <View style={[styles.appCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <View style={styles.appCardHeader}>
                    <Ionicons name="help-circle-outline" size={16} color={theme.bookmarkBlue} />
                    <Text style={[styles.appCardLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                      Reflection Questions
                    </Text>
                  </View>
                  {template.reflectionQuestions.map((q, i) => (
                    <View key={i} style={styles.questionRow}>
                      <Text style={[styles.questionNum, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                        {i + 1}.
                      </Text>
                      <Text style={[styles.questionText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                        {q}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {template.prayerPrompt && (
                <View style={[styles.appCard, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}>
                  <View style={styles.appCardHeader}>
                    <Ionicons name="hand-left-outline" size={16} color={theme.primary} />
                    <Text style={[styles.appCardLabel, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>
                      Prayer Prompt
                    </Text>
                  </View>
                  <Text style={[styles.appCardBody, { color: theme.text, fontFamily: "Lora_400Regular", fontStyle: "italic" as const }]}>
                    {template.prayerPrompt}
                  </Text>
                </View>
              )}
            </>
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

          {generateAppMutation.isPending && (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                Generating Application
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Creating Then & Now application study for {selectedBook.name} {selectedChapter}...
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
                    backgroundColor: theme.accent,
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
                <Text style={[styles.emptyBody, { color: "#e74c3c", marginTop: 8, fontFamily: "Inter_400Regular" }]}>
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
  appLayerTitle: { color: "#EDE5D5", fontSize: 17, marginBottom: 8 },
  appLayerSub: { color: "rgba(237,229,213,0.7)", fontSize: 13, lineHeight: 20 },
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bar: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 2,
    gap: 3,
  },
  segmentFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  segmentLast: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  check: {
    marginRight: 0,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  nextStepText: {
    fontSize: 12,
    flex: 1,
  },
  depthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  depthLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
});

const ctaStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  completeText: {
    fontSize: 14,
  },
  gentleNote: {
    fontSize: 12,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    marginBottom: 8,
    lineHeight: 18,
  },
});

const jpStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  check: {
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    maxHeight: 160,
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
    paddingHorizontal: 18,
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
    paddingVertical: 14,
    borderRadius: 14,
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
    borderTopColor: "rgba(255,255,255,0.08)",
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
    borderTopColor: "rgba(255,255,255,0.08)",
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
