import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { safeGoBack } from "@/lib/safe-back";
import { apiRequest } from "@/lib/query-client";
import { useTranslation } from "@/context/TranslationContext";
import {
  TOUCHPOINT_STUDY_CLIENT_STALE_TIME_MS,
  type TouchpointGeneratedStudy,
} from "@shared/touchpoint-study";

const TEAL = "#2A8B8B";

export default function TouchPointStudyScreen() {
  const { topicId, title, translation: translationParam } = useLocalSearchParams<{ topicId: string; title: string; translation?: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { translation: contextTranslation } = useTranslation();
  // Prefer translation passed via nav params (set at time of generation), fall back to context.
  const translation = translationParam || contextTranslation;

  const { data: study, isLoading, isError } = useQuery<TouchpointGeneratedStudy>({
    // translation is a distinct key element so switching refetches the study
    queryKey: ["/api/touchpoints", topicId, "bible-study", { translation }],
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/touchpoints/${topicId}/bible-study`, { translation });
      return res.json();
    },
    staleTime: TOUCHPOINT_STUDY_CLIENT_STALE_TIME_MS,
  });

  // Prefer the translation the backend actually reports; fall back to requested.
  const studyTranslation = study?.translation || translation;

  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Pressable onPress={() => safeGoBack(router, `/touchpoint-topic?topicId=${topicId}`)} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold", flex: 0 }]} numberOfLines={1}>
            {title || "Bible Study"}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 }}>
            {studyTranslation}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PathB.coral} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Generating your Bible study...
          </Text>
        </View>
      ) : isError || !study ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={isDark ? "#555" : "#ccc"} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Could not load Bible study. Please try again.
          </Text>
          <Pressable
            onPress={() => safeGoBack(router, `/touchpoint-topic?topicId=${topicId}`)}
            style={[styles.retryBtn, { borderColor: PathB.coral }]}
          >
            <Text style={[styles.retryText, { color: PathB.coral }]}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.introText, { color: theme.text }]}>
            {study.introduction}
          </Text>

          {study.sections?.map((section, i) => {
            const sectionTranslation = section.translation;
            // The server's successful contract requires explicit canonical
            // resolution. Never display text without that positive marker.
            const hasVerifiedText =
              section.resolved === true &&
              typeof section.scriptureText === "string" &&
              section.scriptureText.trim().length > 0;
            return (
            <View key={i} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionHeading, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                {section.heading}
              </Text>

              <View style={[styles.scriptureBox, { borderLeftColor: TEAL + "80" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Text style={[styles.scriptureRef, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>
                    {section.scripture}
                  </Text>
                  <Text style={{ fontSize: 11, color: TEAL, fontFamily: "Inter_400Regular", opacity: 0.7 }}>
                    {sectionTranslation}
                  </Text>
                </View>
                {hasVerifiedText ? (
                  <Text style={[styles.scriptureText, { color: theme.text }]}>
                    {section.scriptureText}
                  </Text>
                ) : (
                  <Text style={[styles.scriptureText, { color: theme.textSecondary, fontStyle: "italic" }]}>
                    Scripture text for {section.scripture} could not be verified in {sectionTranslation}. Open your Bible to read it in your selected translation.
                  </Text>
                )}
              </View>

              <Text style={[styles.teachingText, { color: theme.text }]}>
                {section.teaching}
              </Text>

              <View style={[styles.reflectionBox, { backgroundColor: PathB.coral + "10", borderColor: PathB.coral + "30" }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={PathB.coral} />
                <Text style={[styles.reflectionText, { color: theme.textSecondary }]}>
                  {section.reflection}
                </Text>
              </View>
            </View>
            );
          })}

          <View style={[styles.conclusionBox, { borderTopColor: borderColor }]}>
            <Text style={[styles.conclusionLabel, { color: PathB.coralInk, fontFamily: "Inter_600SemiBold" }]}>
              Conclusion
            </Text>
            <Text style={[styles.conclusionText, { color: theme.text }]}>
              {study.conclusion}
            </Text>
          </View>

          {study.prayerPrompt && (
            <View style={[styles.prayerCard, { backgroundColor: TEAL + "10", borderColor: TEAL + "25" }]}>
              <Ionicons name="hand-left-outline" size={20} color={TEAL} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.prayerLabel, { color: TEAL, fontFamily: "Inter_600SemiBold" }]}>
                  Prayer
                </Text>
                <Text style={[styles.prayerText, { color: theme.text }]}>
                  {study.prayerPrompt}
                </Text>
              </View>
            </View>
          )}

          {study.groupDiscussion && study.groupDiscussion.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={[styles.discussionLabel, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                Group Discussion
              </Text>
              {study.groupDiscussion.map((q, i) => (
                <View key={i} style={[styles.discussionRow, { borderColor }]}>
                  <Text style={[styles.discussionNumber, { color: PathB.coralInk, fontFamily: "Inter_600SemiBold" }]}>
                    {i + 1}
                  </Text>
                  <Text style={[styles.discussionText, { color: theme.text }]}>
                    {q}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerTitle: { fontSize: 18, flex: 1, letterSpacing: -0.3 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 30,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  introText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  sectionHeading: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  scriptureBox: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    gap: 4,
  },
  scriptureRef: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  scriptureText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
    fontFamily: "Inter_400Regular",
  },
  teachingText: {
    fontSize: 15,
    lineHeight: 25,
    fontFamily: "Inter_400Regular",
  },
  reflectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  reflectionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    flex: 1,
    fontStyle: "italic",
  },
  conclusionBox: {
    borderTopWidth: 1,
    paddingTop: 24,
    marginTop: 8,
    marginBottom: 20,
    gap: 8,
  },
  conclusionLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  conclusionText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
  },
  prayerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  prayerLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  prayerText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  discussionLabel: {
    fontSize: 18,
    marginBottom: 14,
  },
  discussionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  discussionNumber: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  discussionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
});
