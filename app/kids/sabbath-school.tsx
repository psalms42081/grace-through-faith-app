import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";

interface KidsLesson {
  title: string;
  storySummary: string;
  memoryVerse: string;
  memoryVerseRef: string;
  thinkAboutIt: string;
  prayer: string;
}

interface KidsSSData {
  lesson: KidsLesson;
  weekNumber: number;
  ageGroup: string;
}

const CARD_CONFIGS = [
  { key: "story" as const, icon: "book-outline" as const, label: "Story of the Week", color: "#4A90D9" },
  { key: "verse" as const, icon: "bookmark-outline" as const, label: "Memory Verse", color: "#E8A838" },
  { key: "think" as const, icon: "chatbubble-ellipses-outline" as const, label: "Think About It", color: "#7B61FF" },
  { key: "prayer" as const, icon: "heart-outline" as const, label: "Prayer", color: "#E06B75" },
];

export default function KidsSabbathSchoolScreen() {
  const { theme } = useTheme(true);
  const insets = useSafeAreaInsets();
  const { ageGroup } = useKidsMode();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data, isLoading } = useQuery<KidsSSData>({
    queryKey: [`/api/kids/sabbath-school/current?ageGroup=${ageGroup}`],
  });

  const lesson = data?.lesson;

  const getCardContent = (key: string): string => {
    if (!lesson) return "";
    switch (key) {
      case "story": return lesson.storySummary;
      case "verse": return `"${lesson.memoryVerse}"\n\n${lesson.memoryVerseRef}`;
      case "think": return lesson.thinkAboutIt;
      case "prayer": return lesson.prayer;
      default: return "";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="kids-ss-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Sabbath School
          </Text>
          {data && (
            <Text style={[styles.headerWeek, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Week {data.weekNumber}
            </Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : lesson ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.lessonHeader}>
            <View style={[styles.lessonIconWrap, { backgroundColor: theme.accent + "20" }]}>
              <Ionicons name="sunny" size={28} color={theme.accent} />
            </View>
            <Text style={[styles.lessonTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {lesson.title}
            </Text>
          </Animated.View>

          {CARD_CONFIGS.map((card, idx) => (
            <Animated.View
              key={card.key}
              entering={FadeInDown.delay(100 + idx * 100).duration(400).springify()}
            >
              <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <View style={[styles.cardIconRow]}>
                  <View style={[styles.cardIcon, { backgroundColor: card.color + "20" }]}>
                    <Ionicons name={card.icon} size={20} color={card.color} />
                  </View>
                  <Text style={[styles.cardLabel, { color: card.color, fontFamily: "Inter_600SemiBold" }]}>
                    {card.label}
                  </Text>
                </View>
                <Text style={[styles.cardContent, { color: theme.text, fontFamily: card.key === "verse" ? "Lora_400Regular_Italic" : "Inter_400Regular" }]}>
                  {getCardContent(card.key)}
                </Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.loadingWrap}>
          <Ionicons name="sad-outline" size={40} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            No lesson available this week
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
  },
  headerWeek: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lessonHeader: {
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  lessonIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonTitle: {
    fontSize: 22,
    textAlign: "center",
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  cardIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  cardContent: {
    fontSize: 15,
    lineHeight: 23,
  },
});
