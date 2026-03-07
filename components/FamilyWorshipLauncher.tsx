import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSabbath } from "@/lib/sabbath";

interface ThemeColors {
  text: string;
  textMuted: string;
  textSecondary: string;
  background: string;
  backgroundCard: string;
  border: string;
  accent: string;
  divider: string;
}

interface SSLesson {
  title: string;
  storySummary: string;
  memoryVerse: string;
  memoryVerseRef: string;
  thinkAboutIt: string;
  prayer: string;
  linkedStory: { id: string; title: string } | null;
}

interface SSData {
  lesson: SSLesson;
  weekNumber: number;
  ageGroup: string;
}

const FAMILY_PROMPTS = [
  "What is one thing God did for our family this week?",
  "What Bible story has been on your heart lately?",
  "How can our family serve someone together this week?",
  "What are you most thankful to God for today?",
  "What is something new you learned about God recently?",
  "If you could ask God one question, what would it be?",
];

function getWeeklyPrompt(): string {
  const weekOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
      (7 * 86400000)
  );
  return FAMILY_PROMPTS[weekOfYear % FAMILY_PROMPTS.length];
}

interface Props {
  theme: ThemeColors;
  isDark: boolean;
  ageGroup?: string;
  onScrollToPrayerWall?: () => void;
}

export default function FamilyWorshipLauncher({ theme, isDark, ageGroup = "little_lambs", onScrollToPrayerWall }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sabbath = useSabbath();

  const { data: ssData, isLoading: ssLoading } = useQuery<SSData>({
    queryKey: [`/api/kids/sabbath-school/current?ageGroup=${ageGroup}`],
  });

  const isSabbath = sabbath.isSabbath;

  const cardContent = useMemo(() => {
    if (isSabbath) {
      return {
        title: "Family Sabbath Moment",
        subtitle:
          "Begin Sabbath together with a story, memory verse, and prayer.",
        cta: "Start Together",
        icon: "sunny" as const,
        accentColor: "#C9933A",
        tags: ["Sabbath", "5 min"],
      };
    }
    return {
      title: "Worship Together Tonight",
      subtitle:
        "Continue your family's faith journey with one story, one verse, and one conversation prompt.",
      cta: "Start Family Worship",
      icon: "people" as const,
      accentColor: "#7B61FF",
      tags: ["Family", "Story", "5 min"],
    };
  }, [isSabbath]);

  const familyPrompt = useMemo(() => getWeeklyPrompt(), []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);

  const handleOpenStory = useCallback(() => {
    if (ssData?.lesson?.linkedStory?.id) {
      setSheetOpen(false);
      router.push(`/kids/story/${ssData.lesson.linkedStory.id}`);
    }
  }, [ssData]);

  const handleOpenPrayerWall = useCallback(() => {
    setSheetOpen(false);
    if (onScrollToPrayerWall) {
      setTimeout(() => onScrollToPrayerWall(), 350);
    }
  }, [onScrollToPrayerWall]);

  const lesson = ssData?.lesson;

  return (
    <>
      <Pressable
        onPress={handleOpenSheet}
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? cardContent.accentColor + "12"
              : cardContent.accentColor + "08",
            borderColor: cardContent.accentColor + "30",
          },
        ]}
        testID="family-worship-launcher"
      >
        <View style={styles.cardTop}>
          <View
            style={[
              styles.cardIconWrap,
              { backgroundColor: cardContent.accentColor + "20" },
            ]}
          >
            <Ionicons
              name={cardContent.icon}
              size={22}
              color={cardContent.accentColor}
            />
          </View>
          <View style={styles.cardTextWrap}>
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontFamily: "Lora_600SemiBold" },
              ]}
            >
              {cardContent.title}
            </Text>
            <Text
              style={[
                styles.cardSubtitle,
                { color: theme.textSecondary, fontFamily: "Inter_400Regular" },
              ]}
              numberOfLines={2}
            >
              {cardContent.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.tagsRow}>
            {cardContent.tags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  { backgroundColor: cardContent.accentColor + "18" },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color: cardContent.accentColor,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          <View
            style={[
              styles.ctaBtn,
              { backgroundColor: cardContent.accentColor },
            ]}
          >
            <Text
              style={[styles.ctaBtnText, { fontFamily: "Inter_600SemiBold" }]}
            >
              {cardContent.cta}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>
      </Pressable>

      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={handleCloseSheet}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={handleCloseSheet} />
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: theme.background,
                paddingBottom:
                  Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.sheetHandle}>
              <View
                style={[
                  styles.sheetHandleBar,
                  { backgroundColor: theme.border },
                ]}
              />
            </View>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeader}>
                <View
                  style={[
                    styles.sheetIconWrap,
                    { backgroundColor: cardContent.accentColor + "15" },
                  ]}
                >
                  <Ionicons
                    name={isSabbath ? "sunny" : "people"}
                    size={28}
                    color={cardContent.accentColor}
                  />
                </View>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: theme.text, fontFamily: "Lora_700Bold" },
                  ]}
                >
                  {isSabbath
                    ? "Family Sabbath Moment"
                    : "Family Worship"}
                </Text>
                <Text
                  style={[
                    styles.sheetSubtitle,
                    {
                      color: theme.textSecondary,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                >
                  A short worship moment for your whole family
                </Text>
              </View>

              {ssLoading && (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={cardContent.accentColor} />
                </View>
              )}

              {lesson && (
                <View
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <View
                      style={[
                        styles.stepBadge,
                        { backgroundColor: "#4A90D9" + "20" },
                      ]}
                    >
                      <Ionicons name="book" size={16} color="#4A90D9" />
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: "#4A90D9", fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      Story of the Week
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      { color: theme.text, fontFamily: "Lora_600SemiBold" },
                    ]}
                  >
                    {lesson.title}
                  </Text>
                  <Text
                    style={[
                      styles.stepBody,
                      {
                        color: theme.textSecondary,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                    numberOfLines={3}
                  >
                    {lesson.storySummary}
                  </Text>
                  {lesson.linkedStory && (
                    <Pressable
                      onPress={handleOpenStory}
                      style={[
                        styles.stepAction,
                        { backgroundColor: "#4A90D9" },
                      ]}
                      testID="family-worship-open-story"
                    >
                      <Ionicons name="play" size={14} color="#fff" />
                      <Text
                        style={[
                          styles.stepActionText,
                          { fontFamily: "Inter_600SemiBold" },
                        ]}
                      >
                        Read: {lesson.linkedStory.title}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {lesson && (
                <View
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <View
                      style={[
                        styles.stepBadge,
                        { backgroundColor: "#E8A838" + "20" },
                      ]}
                    >
                      <Ionicons name="bookmark" size={16} color="#E8A838" />
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        { color: "#E8A838", fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      Memory Verse
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.verseText,
                      {
                        color: theme.text,
                        fontFamily: "Lora_400Regular_Italic",
                      },
                    ]}
                  >
                    "{lesson.memoryVerse}"
                  </Text>
                  <Text
                    style={[
                      styles.verseRef,
                      {
                        color: theme.textMuted,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {lesson.memoryVerseRef}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: "#7B61FF" + "20" },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={16}
                      color="#7B61FF"
                    />
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: "#7B61FF", fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Family Discussion
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepBody,
                    {
                      color: theme.text,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                >
                  {lesson?.thinkAboutIt || familyPrompt}
                </Text>
              </View>

              <View
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: theme.backgroundCard,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: "#E06B75" + "20" },
                    ]}
                  >
                    <Ionicons name="heart" size={16} color="#E06B75" />
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: "#E06B75", fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Family Prayer
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepBody,
                    {
                      color: theme.text,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                >
                  {lesson?.prayer ||
                    "Dear God, thank You for our family. Help us grow closer to You and to each other. Amen."}
                </Text>
                <Pressable
                  onPress={handleOpenPrayerWall}
                  style={[
                    styles.stepAction,
                    { backgroundColor: "#E06B75" },
                  ]}
                  testID="family-worship-open-altar"
                >
                  <Ionicons name="heart-outline" size={14} color="#fff" />
                  <Text
                    style={[
                      styles.stepActionText,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Open Family Altar
                  </Text>
                </Pressable>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 13,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetScroll: {
    paddingHorizontal: 20,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  sheetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 22,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  stepTitle: {
    fontSize: 17,
    marginBottom: 6,
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  stepAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  stepActionText: {
    color: "#fff",
    fontSize: 13,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  verseRef: {
    fontSize: 13,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
