import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useStudyDepth } from "@/contexts/StudyDepthContext";
import SDAVerifiedBadge from "@/components/SDAVerifiedBadge";
import {
  sabbathSchoolTabBarClearance,
  useSabbathSchoolTabContainment,
} from "@/lib/sabbath-school-route-containment";

interface DiscussionData {
  keyQuestions: string[];
  aiSummary: string;
  reflectionPrompts: string[];
  cached: boolean;
}

export default function SabbathSchoolDiscussionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { depth } = useStudyDepth();
  const params = useLocalSearchParams<{
    lessonId: string;
    lessonTitle: string;
  }>();

  const lessonId = params.lessonId || "";
  const lessonTitle = params.lessonTitle ? decodeURIComponent(params.lessonTitle) : "This Week's Lesson";
  const isTabContained = useSabbathSchoolTabContainment(
    "sabbath-school-discussion",
    {
      lessonId,
      lessonTitle,
    },
    !!lessonId,
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad =
    (Platform.OS === "web" ? 34 : insets.bottom) +
    sabbathSchoolTabBarClearance(isTabContained, Platform.OS);

  const [data, setData] = useState<DiscussionData | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sabbath-school/discussion-prep", {
        lessonId,
        depth,
      });
      return await res.json();
    },
    onSuccess: (result: DiscussionData) => {
      setData(result);
    },
  });

  const baseFontSize = 15;
  const questionFontSize = 14;

  if (!isTabContained) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Lesson Discussion Guide
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lessonTitle, { color: theme.text, fontSize: 20 }]}>
          {lessonTitle}
        </Text>

        {!data && !generateMutation.isPending && (
          <View style={{ gap: 18 }}>
            <Text style={[styles.guideIntro, { color: theme.textSecondary }]}>
              Prepare for Sabbath School class, family worship, or small group discussion with a structured guide for this week's lesson.
            </Text>
            <Pressable
              onPress={() => generateMutation.mutate()}
              style={({ pressed }) => [
                styles.generateBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="chatbubbles" size={20} color="#050507" />
              <Text style={styles.generateBtnText}>
                Prepare Discussion Guide
              </Text>
            </Pressable>
            <View style={[styles.previewFeatures, { borderColor: theme.border }]}>
              <Text style={[styles.previewFeaturesTitle, { color: theme.text }]}>
                Your guide will include:
              </Text>
              {[
                { icon: "bulb-outline" as const, text: "Key discussion questions drawn from the lesson" },
                { icon: "document-text-outline" as const, text: "A concise summary of the week's themes" },
                { icon: "heart-outline" as const, text: "Reflection prompts for personal application" },
              ].map((item, i) => (
                <View key={i} style={styles.previewFeatureRow}>
                  <Ionicons name={item.icon} size={18} color={theme.accent} />
                  <Text style={[styles.previewFeatureText, { color: theme.textSecondary }]}>
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.sourceNote}>
              <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.sourceNoteText, { color: theme.textMuted }]}>
                Official Sabbath School lesson content provided via Adventech. Companion discussion material is an added study aid.
              </Text>
            </View>
          </View>
        )}

        {generateMutation.isPending && (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Preparing your discussion guide...
            </Text>
          </View>
        )}

        {generateMutation.isError && (
          <View style={[styles.errorBlock, { borderColor: "#EF4444" }]}>
            <Text style={{ color: "#EF4444", fontFamily: "Inter_500Medium", fontSize: 14 }}>
              Could not generate discussion guide. Please try again.
            </Text>
            <Pressable
              onPress={() => generateMutation.mutate()}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: theme.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {data && (
          <>
            <View style={[styles.sourceBanner, { backgroundColor: "rgba(201, 147, 58, 0.08)", borderColor: "rgba(201, 147, 58, 0.2)" }]}>
              <Ionicons name="library-outline" size={14} color={theme.accent} />
              <Text style={[styles.sourceBannerText, { color: theme.textMuted }]}>
                Official Sabbath School lesson content provided via Adventech. Companion discussion material is an added study aid.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb-outline" size={18} color={theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>
                  Big Idea
                </Text>
              </View>
              <Text
                style={[
                  styles.summaryText,
                  { color: theme.textSecondary, fontSize: baseFontSize, lineHeight: baseFontSize * 1.65 },
                ]}
              >
                {data.aiSummary}
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubbles-outline" size={18} color={theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.accent }]}>
                  Discussion Questions
                </Text>
              </View>
              {data.keyQuestions.map((question, index) => (
                <View
                  key={index}
                  style={[
                    styles.questionCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionNum, { backgroundColor: theme.accent + "20" }]}>
                      <Text style={[styles.questionNumText, { color: theme.accent }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.questionText,
                        { color: theme.text, fontSize: questionFontSize, lineHeight: questionFontSize * 1.55 },
                      ]}
                    >
                      {question}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="heart-outline" size={18} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: "#8B5CF6" }]}>
                  Life Application
                </Text>
              </View>
              {data.reflectionPrompts.map((prompt, index) => (
                <View
                  key={index}
                  style={[
                    styles.reflectionCard,
                    { backgroundColor: "rgba(139, 92, 246, 0.08)" },
                  ]}
                >
                  <Text
                    style={[
                      styles.reflectionText,
                      { color: theme.textSecondary, fontSize: baseFontSize - 1, lineHeight: (baseFontSize - 1) * 1.6 },
                    ]}
                  >
                    {prompt}
                  </Text>
                </View>
              ))}
            </View>

            <SDAVerifiedBadge />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Lora_700Bold", fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 20 },
  guideIntro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  sourceNote: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    paddingHorizontal: 4,
  },
  sourceNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  sourceBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sourceBannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  lessonTitle: {
    fontFamily: "Lora_600SemiBold",
    lineHeight: 30,
    marginBottom: 4,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
  },
  generateBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#050507",
  },
  previewFeatures: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  previewFeaturesTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  previewFeatureRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
  },
  previewFeatureText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  loadingBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  errorBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
  },
  questionCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  questionNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  questionNumText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  questionText: {
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  reflectionCard: {
    borderRadius: 12,
    padding: 14,
  },
  reflectionText: {
    fontFamily: "Lora_400Regular_Italic",
  },
});
