import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";
import { apiRequest } from "@/lib/query-client";

interface Story {
  id: string;
  title: string;
  scriptureRef: string | null;
  bookId: number | null;
  chapter: number | null;
  ageGroup: string;
  storyText: string;
  memoryVerse: string | null;
  memoryVerseRef: string | null;
  thinkQuestions: string[];
  prayerPrompt: string | null;
  activitySuggestion: string | null;
  estimatedMinutes: number;
}

export default function KidsStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { ageGroup } = useKidsMode();
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState(false);
  const starScale = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const isLittleLambs = ageGroup === "little_lambs";

  const { data: story, isLoading } = useQuery<Story>({
    queryKey: [`/api/kids/stories/${id}`],
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kids/progress/complete", {
        userId: "guest",
        storyId: id,
      });
      await apiRequest("POST", "/api/kids/streak/update", {
        userId: "guest",
      });
    },
    onSuccess: () => {
      setCompleted(true);
      Animated.spring(starScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }).start();
      queryClient.invalidateQueries({ queryKey: ["/api/kids/progress/guest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kids/streak/guest"] });
    },
  });

  if (isLoading || !story) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ paddingTop: topPad + 20 }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="story-back">
          <Ionicons name="chevron-back" size={22} color={theme.accent} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
            {story.title}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 120, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.storyTitle, { color: theme.text, fontFamily: "Lora_700Bold", fontSize: isLittleLambs ? 26 : 24 }]}>
          {story.title}
        </Text>
        {story.scriptureRef && (
          <Text style={[styles.scriptureRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {story.scriptureRef}
          </Text>
        )}
        <View style={[styles.timeBadge, { backgroundColor: theme.accent + "15" }]}>
          <Ionicons name="time-outline" size={14} color={theme.accent} />
          <Text style={[styles.timeText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            ~{story.estimatedMinutes} min read
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.storyText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 18 : 16, lineHeight: isLittleLambs ? 30 : 26 }]}>
          {story.storyText}
        </Text>

        {story.memoryVerse && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.memoryCard, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "30" }]}>
              <View style={styles.memoryHeader}>
                <Ionicons name="bookmark" size={18} color={theme.accent} />
                <Text style={[styles.memoryLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Memory Verse
                </Text>
              </View>
              <Text style={[styles.memoryText, { color: theme.text, fontFamily: "Lora_400Regular_Italic", fontSize: isLittleLambs ? 18 : 16 }]}>
                "{story.memoryVerse}"
              </Text>
              {story.memoryVerseRef && (
                <Text style={[styles.memoryRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  - {story.memoryVerseRef}
                </Text>
              )}
            </View>
          </>
        )}

        {story.thinkQuestions && story.thinkQuestions.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb-outline" size={20} color={(theme as any).starGold || theme.accent} />
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Think About It
                </Text>
              </View>
              {story.thinkQuestions.map((q, idx) => (
                <View key={idx} style={[styles.questionItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                  <Text style={[styles.questionNum, { color: theme.accent, fontFamily: "Inter_700Bold" }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[styles.questionText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 16 : 15 }]}>
                    {q}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {story.prayerPrompt && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.prayerCard, { backgroundColor: (theme as any).purple ? (theme as any).purple + "12" : theme.accent + "12", borderColor: (theme as any).purple ? (theme as any).purple + "30" : theme.accent + "30" }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="hand-left-outline" size={18} color={(theme as any).purple || theme.accent} />
                <Text style={[styles.sectionTitle, { color: (theme as any).purple || theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Let's Pray
                </Text>
              </View>
              <Text style={[styles.prayerText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 16 : 15 }]}>
                {story.prayerPrompt}
              </Text>
            </View>
          </>
        )}

        {story.activitySuggestion && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={[styles.activityCard, { backgroundColor: theme.success + "12", borderColor: theme.success + "30" }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash-outline" size={18} color={theme.success} />
                <Text style={[styles.sectionTitle, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
                  Activity
                </Text>
              </View>
              <Text style={[styles.activityText, { color: theme.text, fontFamily: "Inter_400Regular", fontSize: isLittleLambs ? 16 : 15 }]}>
                {story.activitySuggestion}
              </Text>
            </View>
          </>
        )}

        <View style={{ marginTop: 24 }}>
          {!completed ? (
            <Pressable
              onPress={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              style={[styles.completeBtn, { backgroundColor: theme.accent }]}
              testID="complete-story"
            >
              {completeMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={[styles.completeBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    I Finished This Story
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <Animated.View style={[styles.completedBox, { transform: [{ scale: starScale }] }]}>
              <Ionicons name="star" size={44} color={(theme as any).starGold || theme.accent} />
              <Text style={[styles.completedText, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                You earned a star!
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={[styles.doneBtn, { backgroundColor: theme.accent }]}
                testID="done-btn"
              >
                <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Back to Stories
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 14 },
  scroll: { flex: 1 },
  storyTitle: { marginTop: 8, marginBottom: 4 },
  scriptureRef: { fontSize: 15, marginBottom: 8 },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeText: { fontSize: 12 },
  divider: { height: 1, marginVertical: 20 },
  storyText: {},
  memoryCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  memoryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  memoryLabel: { fontSize: 14 },
  memoryText: { lineHeight: 26 },
  memoryRef: { fontSize: 14, marginTop: 8, textAlign: "right" },
  section: {},
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16 },
  questionItem: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  questionNum: { fontSize: 16, minWidth: 20 },
  questionText: { flex: 1, lineHeight: 22 },
  prayerCard: { padding: 18, borderRadius: 14, borderWidth: 1 },
  prayerText: { lineHeight: 24 },
  activityCard: { padding: 18, borderRadius: 14, borderWidth: 1 },
  activityText: { lineHeight: 24 },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 28,
  },
  completeBtnText: { color: "#fff", fontSize: 16 },
  completedBox: { alignItems: "center", paddingVertical: 20, gap: 12 },
  completedText: { fontSize: 22 },
  doneBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 15 },
});
