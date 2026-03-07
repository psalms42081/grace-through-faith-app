import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors, { getSabbathTheme } from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { useKidsMode } from "@/context/KidsModeContext";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbath } from "@/lib/sabbath";
import FeatureTutorial from "@/components/FeatureTutorial";
import { HOME_TUTORIAL_STEPS } from "@/lib/tutorial-steps";
import SpiritualRings from "@/components/SpiritualRings";
import type { AgeGroup } from "@/context/KidsModeContext";
import AnimatedSection from "@/components/AnimatedSection";
import GoldDivider from "@/components/home/GoldDivider";
import VerseOfTheDay from "@/components/home/VerseOfTheDay";
import ContinueReadingCard from "@/components/home/ContinueReadingCard";
import ContinueCard from "@/components/home/ContinueCard";
import GuidedToolsRow from "@/components/home/GuidedToolsRow";
import SabbathSchoolCard from "@/components/home/SabbathSchoolCard";
import DevotionalCard from "@/components/home/DevotionalCard";
import SabbathBanner from "@/components/home/SabbathBanner";
import LiveNowSection from "@/components/home/LiveNowSection";
import WeeklyCalendar from "@/components/home/WeeklyCalendar";
import type { WeeklyStreakData } from "@/components/home/WeeklyCalendar";
import ChildPickerModal from "@/components/home/ChildPickerModal";
import TodaysPath from "@/components/home/TodaysPath";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DAILY_VERSES = [
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", reference: "John 3:16" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding.", reference: "Proverbs 3:5" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.", reference: "Joshua 1:9" },
  { text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", reference: "Isaiah 40:31" },
  { text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", reference: "Romans 8:28" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTodaysVerse() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

interface TodayResponse {
  today: { dayNumber: number; title: string; passageLabel: string | null } | null;
  enrollment?: { planId: string };
  completedCount?: number;
  totalDays?: number;
  planComplete?: boolean;
}

const KIDS_VERSES = [
  { text: "God is love.", reference: "1 John 4:8" },
  { text: "Be kind to one another.", reference: "Ephesians 4:32" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "This is the day which the Lord hath made; we will rejoice and be glad in it.", reference: "Psalm 118:24" },
  { text: "The Lord is my light and my salvation; whom shall I fear?", reference: "Psalm 27:1" },
  { text: "Be strong and of a good courage.", reference: "Joshua 1:9" },
];

function useImageBaseUrl() {
  return useMemo(() => {
    try {
      return getApiUrl().replace(/\/$/, "");
    } catch {
      return "";
    }
  }, []);
}

function PulsingFlame({ size, color }: { size: number; color: string }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="flame" size={size} color={color} />
    </Animated.View>
  );
}

function BouncyActionCard({
  onPress,
  style,
  children,
  testID,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
  testID?: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}

function KidsHomeScreen() {
  const { theme, isDark } = useTheme(true);
  const insets = useSafeAreaInsets();
  const { ageGroup, exitKidsMode, pin, activeChildName, activeChildProfileId, lastActiveChildId, switchChild, verifyPin } = useKidsMode();
  const { userId } = useAuth();
  const baseUrl = useImageBaseUrl();
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showSwitchPicker, setShowSwitchPicker] = useState(false);
  const [exitPin, setExitPin] = useState("");
  const [switchPin, setSwitchPin] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const verse = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return KIDS_VERSES[dayOfYear % KIDS_VERSES.length];
  }, []);

  const { data: dailyStory } = useQuery<{ id: string; title: string; scriptureRef: string | null; estimatedMinutes: number; imageUrl: string | null }>({
    queryKey: [`/api/kids/daily?ageGroup=${ageGroup}`],
  });

  const progressUserId = activeChildProfileId || "guest";

  const { data: streak } = useQuery<{ currentStreak: number; longestStreak: number }>({
    queryKey: [`/api/kids/streak/${progressUserId}`],
  });

  const { data: progress } = useQuery<{ completed: boolean; quizScore: number | null; memoryVerseMemorized: boolean }[]>({
    queryKey: [`/api/kids/progress/${progressUserId}`],
  });

  const { data: kidsSS } = useQuery<{ lesson: { title: string; memoryVerse: string; memoryVerseRef: string; linkedStory: { id: string; title: string } | null } }>({
    queryKey: [`/api/kids/sabbath-school/current?ageGroup=${ageGroup}`],
    staleTime: 0,
  });

  const { data: badges } = useQuery<{ id: string }[]>({
    queryKey: [`/api/kids/badges/${progressUserId}`],
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;
  const memorizedCount = progress?.filter(p => p.memoryVerseMemorized).length ?? 0;
  const badgeCount = badges?.length ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: bottomPad + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={kidsStyles.kidsModeBadge}>
          <Ionicons name="shield-checkmark" size={12} color={theme.accent} />
          <Text style={[kidsStyles.kidsModeBadgeText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            KIDS MODE
          </Text>
        </View>
        <View style={kidsStyles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {activeChildName ? `Welcome back, ${activeChildName}` : greeting}
            </Text>
            <Text style={[styles.appName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Your next adventure is ready
            </Text>
          </View>
          <View style={kidsStyles.headerBtns}>
            <Pressable
              onPress={() => {
                if (!pin) {
                  setShowSwitchPicker(true);
                } else {
                  setShowSwitchModal(true);
                }
              }}
              style={[kidsStyles.switchBtn, { backgroundColor: theme.accent + "20" }]}
              testID="switch-child"
            >
              <Ionicons name="swap-horizontal" size={16} color={theme.accent} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (!pin) {
                  exitKidsMode("");
                } else {
                  setShowExitModal(true);
                }
              }}
              style={[kidsStyles.exitBtn, { backgroundColor: theme.textMuted + "20" }]}
              testID="exit-kids-mode"
            >
              <Ionicons name="log-out-outline" size={16} color={theme.textSecondary} />
              <Text style={[kidsStyles.exitBtnText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Exit Kids Mode
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={kidsStyles.modalOverlay}>
          <View style={[kidsStyles.modalBox, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[kidsStyles.modalTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Exit Kids Mode
            </Text>
            <Text style={[kidsStyles.modalDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Enter your PIN to switch back
            </Text>
            <TextInput
              value={exitPin}
              onChangeText={setExitPin}
              placeholder="Enter PIN"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              style={[kidsStyles.modalInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              testID="exit-pin-input"
            />
            <View style={kidsStyles.modalBtns}>
              <Pressable
                onPress={() => { setShowExitModal(false); setExitPin(""); }}
                style={[kidsStyles.modalCancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[kidsStyles.modalCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const ok = await exitKidsMode(exitPin);
                  if (ok) {
                    setShowExitModal(false);
                    setExitPin("");
                  } else {
                    if (Platform.OS === "web") {
                      window.alert("Incorrect PIN");
                    } else {
                      Alert.alert("Incorrect PIN", "Please try again.");
                    }
                  }
                }}
                style={[kidsStyles.modalConfirmBtn, { backgroundColor: theme.accent }]}
                testID="exit-confirm"
              >
                <Text style={[kidsStyles.modalConfirmText, { fontFamily: "Inter_600SemiBold" }]}>
                  Exit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSwitchModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowSwitchModal(false); setSwitchPin(""); }}
      >
        <View style={kidsStyles.modalOverlay}>
          <View style={[kidsStyles.modalBox, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[kidsStyles.modalTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Switch Reader
            </Text>
            <Text style={[kidsStyles.modalDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Enter your PIN to switch
            </Text>
            <TextInput
              value={switchPin}
              onChangeText={setSwitchPin}
              placeholder="Enter PIN"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              style={[kidsStyles.modalInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
            />
            <View style={kidsStyles.modalBtns}>
              <Pressable
                onPress={() => { setShowSwitchModal(false); setSwitchPin(""); }}
                style={[kidsStyles.modalCancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[kidsStyles.modalCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (verifyPin(switchPin)) {
                    setShowSwitchModal(false);
                    setSwitchPin("");
                    setShowSwitchPicker(true);
                  } else {
                    if (Platform.OS === "web") window.alert("Incorrect PIN");
                    else Alert.alert("Incorrect PIN", "Please try again.");
                  }
                }}
                style={[kidsStyles.modalConfirmBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={[kidsStyles.modalConfirmText, { fontFamily: "Inter_600SemiBold" }]}>
                  Continue
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ChildPickerModal
        visible={showSwitchPicker}
        onClose={() => setShowSwitchPicker(false)}
        onSelectChild={(child) => {
          setShowSwitchPicker(false);
          switchChild(child.id, child.name, child.ageGroup as AgeGroup);
        }}
        userId={userId}
        lastActiveChildId={lastActiveChildId}
      />

      {dailyStory && (
        <AnimatedSection index={0}>
          <Pressable
            onPress={() => router.push(`/kids/story/${dailyStory.id}`)}
            style={[kidsStyles.heroStoryCard, { backgroundColor: theme.backgroundCard, borderColor: theme.accent + "50" }]}
            testID="daily-story"
          >
            {dailyStory.imageUrl && baseUrl ? (
              <Image
                source={{ uri: `${baseUrl}${dailyStory.imageUrl}` }}
                style={kidsStyles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[kidsStyles.heroImagePlaceholder, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="book" size={40} color={theme.accent} />
              </View>
            )}
            <View style={kidsStyles.heroContent}>
              <Text style={[kidsStyles.heroLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Today's Story
              </Text>
              <Text style={[kidsStyles.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                {dailyStory.title}
              </Text>
              {dailyStory.scriptureRef && (
                <Text style={[kidsStyles.heroRef, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {dailyStory.scriptureRef}
                </Text>
              )}
              <View style={[kidsStyles.heroCta, { backgroundColor: theme.accent }]}>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={[kidsStyles.heroCtaText, { fontFamily: "Inter_600SemiBold" }]}>
                  Continue Story
                </Text>
              </View>
            </View>
          </Pressable>
        </AnimatedSection>
      )}

      {kidsSS?.lesson && (
        <AnimatedSection index={1}>
          <Pressable
            onPress={() => router.push("/kids/sabbath-school")}
            style={[kidsStyles.ssCard, { backgroundColor: theme.backgroundCard, borderColor: "#7B61FF40" }]}
            testID="kids-sabbath-school"
          >
            <View style={kidsStyles.ssCardHeader}>
              <View style={[kidsStyles.ssIconWrap, { backgroundColor: "#7B61FF20" }]}>
                <Ionicons name="sunny" size={22} color="#7B61FF" />
              </View>
              <Text style={[kidsStyles.ssLabel, { color: "#7B61FF", fontFamily: "Inter_600SemiBold" }]}>
                This Week's Sabbath School
              </Text>
            </View>
            <Text style={[kidsStyles.ssTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {kidsSS.lesson.title}
            </Text>
            <Text style={[kidsStyles.ssVerse, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {kidsSS.lesson.memoryVerseRef}
            </Text>
            {kidsSS.lesson.linkedStory && (
              <Pressable
                onPress={() => router.push(`/kids/story/${kidsSS.lesson.linkedStory!.id}`)}
                style={kidsStyles.ssStoryLink}
              >
                <Ionicons name="book" size={14} color="#4A90D9" />
                <Text style={[kidsStyles.ssStoryLinkText, { fontFamily: "Inter_500Medium" }]}>
                  Read the full story: {kidsSS.lesson.linkedStory.title}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#4A90D9" />
              </Pressable>
            )}
            <View style={[kidsStyles.ssCta, { backgroundColor: "#7B61FF" }]}>
              <Ionicons name="sunny-outline" size={14} color="#fff" />
              <Text style={[kidsStyles.ssCtaText, { fontFamily: "Inter_600SemiBold" }]}>
                Open Lesson
              </Text>
            </View>
          </Pressable>
        </AnimatedSection>
      )}

      <AnimatedSection index={2}>
        <View style={[kidsStyles.verseCard, { backgroundColor: theme.accent }]}>
          <Ionicons name="bookmark" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={[kidsStyles.verseLabel, { fontFamily: "Inter_600SemiBold" }]}>Memory Verse</Text>
          <Text style={[kidsStyles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
            "{kidsSS?.lesson?.memoryVerse || verse.text}"
          </Text>
          <Text style={[kidsStyles.verseRef, { fontFamily: "Inter_600SemiBold" }]}>
            {kidsSS?.lesson?.memoryVerseRef || verse.reference}
          </Text>
        </View>
      </AnimatedSection>

      {streak && streak.currentStreak > 0 && (
        <AnimatedSection index={3}>
          <View style={[kidsStyles.streakBanner, { backgroundColor: "#FF6B35" + "15", borderColor: "#FF6B35" + "30" }]}>
            <PulsingFlame size={22} color="#FF6B35" />
            <Text style={[kidsStyles.streakText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {streak.currentStreak} day streak!
            </Text>
            <PulsingFlame size={22} color="#FF6B35" />
          </View>
        </AnimatedSection>
      )}

      <AnimatedSection index={4}>
        <View style={kidsStyles.progressSummary}>
          <Text style={[kidsStyles.progressTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Adventure Progress
          </Text>
          <View style={kidsStyles.progressRow}>
            <View style={[kidsStyles.progressItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[kidsStyles.progressNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{completedCount}</Text>
              <Text style={[kidsStyles.progressLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Stories</Text>
            </View>
            <View style={[kidsStyles.progressItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="bookmark" size={20} color="#E8A838" />
              <Text style={[kidsStyles.progressNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{memorizedCount}</Text>
              <Text style={[kidsStyles.progressLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Verses</Text>
            </View>
            <View style={[kidsStyles.progressItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <Ionicons name="ribbon" size={20} color="#7B61FF" />
              <Text style={[kidsStyles.progressNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{badgeCount}</Text>
              <Text style={[kidsStyles.progressLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Badges</Text>
            </View>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection index={5}>
        <View style={kidsStyles.quickActions}>
          <BouncyActionCard
            onPress={() => router.push("/(tabs)/kids-stories")}
            style={[kidsStyles.actionCard, { backgroundColor: theme.accent }]}
            testID="browse-stories"
          >
            <Ionicons name="book-outline" size={28} color="#fff" />
            <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Discover Stories</Text>
            <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Read Bible stories</Text>
          </BouncyActionCard>
          <BouncyActionCard
            onPress={() => router.push("/(tabs)/kids-learn")}
            style={[kidsStyles.actionCard, { backgroundColor: (theme as any).purple || theme.accent }]}
            testID="take-quiz"
          >
            <Ionicons name="school-outline" size={28} color="#fff" />
            <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Grow</Text>
            <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Quizzes & verses</Text>
          </BouncyActionCard>
        </View>
      </AnimatedSection>
    </ScrollView>
  );
}

const kidsStyles = StyleSheet.create({
  kidsModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  kidsModeBadgeText: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerBtns: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  switchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exitBtnText: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, marginBottom: 6 },
  modalDesc: { fontSize: 14, marginBottom: 18, textAlign: "center" },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 18,
  },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15 },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 15 },
  welcomeImage: {
    width: "100%" as any,
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroStoryCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: "hidden" as const,
  },
  heroImage: {
    width: "100%" as any,
    height: 160,
  },
  heroImagePlaceholder: {
    width: "100%" as any,
    height: 160,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroContent: {
    padding: 16,
    gap: 4,
  },
  heroLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  heroRef: {
    fontSize: 13,
    marginBottom: 4,
  },
  heroCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  heroCtaText: {
    color: "#fff",
    fontSize: 14,
  },
  verseCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  verseLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  verseText: { color: "#fff", fontSize: 18, lineHeight: 26, textAlign: "center" },
  verseRef: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  streakText: { fontSize: 15 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  statNum: { fontSize: 24 },
  statLabel: { fontSize: 11 },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  dailyImage: { width: 60, height: 60, borderRadius: 14, marginRight: 14 },
  dailyIcon: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  dailyInfo: { flex: 1 },
  dailyLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  dailyTitle: { fontSize: 16, marginBottom: 2 },
  dailyRef: { fontSize: 12 },
  ssCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  ssCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  ssIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  ssLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  ssTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  ssVerse: {
    fontSize: 13,
    marginBottom: 8,
  },
  ssStoryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  ssStoryLinkText: {
    flex: 1,
    color: "#4A90D9",
    fontSize: 13,
  },
  ssCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  ssCtaText: {
    color: "#fff",
    fontSize: 13,
  },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    gap: 6,
  },
  actionTitle: { color: "#fff", fontSize: 15, marginTop: 4 },
  actionDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  progressSummary: {
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 15,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
  },
  progressItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  progressNum: {
    fontSize: 18,
  },
  progressLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default function HomeScreen() {
  const { isKidsMode } = useKidsMode();

  if (isKidsMode) {
    return <KidsHomeScreen />;
  }

  return <AdultHomeScreen />;
}

const VERSE_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "https://images.unsplash.com/photo-1465056836900-8f1e940f1a04?w=800&q=80",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80",
  "https://images.unsplash.com/photo-1518173946687-a3e33105820b?w=800&q=80",
  "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80",
];

const KIDS_TOOLTIP_KEY = "@grace-through-faith/kids-tooltip-shown";

function AdultHomeScreen() {
  const { theme: baseTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { enterKidsMode, lastActiveChildId } = useKidsMode();
  const { userId } = useAuth();
  const sabbath = useSabbath();
  const theme = sabbath.isSabbath ? getSabbathTheme(baseTheme, isDark) : baseTheme;
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(KIDS_TOOLTIP_KEY);
        if (!seen) {
          setShowTooltip(true);
          setTimeout(() => {
            setShowTooltip(false);
            AsyncStorage.setItem(KIDS_TOOLTIP_KEY, "true").catch(() => {});
          }, 5000);
        }
      } catch {}
    })();
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = useMemo(() => getGreeting(), []);
  const verse = useMemo(() => getTodaysVerse(), []);
  const bgImage = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return VERSE_BACKGROUNDS[dayOfYear % VERSE_BACKGROUNDS.length];
  }, []);

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
  });

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string }[]>({
    queryKey: [`/api/reading-history/recent?userId=${userId}`],
  });

  const { data: weeklyData } = useQuery<WeeklyStreakData>({
    queryKey: [`/api/reading-streaks/weekly?userId=${userId}`],
  });

  const { data: ssData } = useQuery<{
    quarterly: { title: string } | null;
    currentLesson: { title: string; lessonNumber: number } | null;
    completedDays: number;
    currentLessonNumber: number;
  }>({
    queryKey: [`/api/sabbath-school/current?userId=${userId}`],
  });

  const { data: ringsData } = useQuery<{
    study: { current: number; goal: number };
    prayer: { current: number; goal: number };
    engage: { current: number; goal: number };
  }>({
    queryKey: [`/api/spiritual-rings?userId=${userId}`],
    staleTime: 30_000,
  });

  const lastRead = recentReads?.[0];
  const streak = weeklyData?.currentStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;

  const hasActivePlan = todayData?.today != null;
  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;

  const isSabbathMode = sabbath.isSabbath;

  const streakSection = weeklyData && (streak > 0 || weeklyData.daysRead.some(Boolean)) ? (
    <View style={[
      s.streakCard,
      { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" },
      isSabbathMode && { opacity: 0.7 },
    ]}>
      <View style={s.streakHeader}>
        <View style={s.streakLeft}>
          <Ionicons name="flame" size={isSabbathMode ? 22 : 28} color={isSabbathMode ? theme.textMuted : "#FF6B35"} />
          <View>
            <Text style={[
              s.streakNum,
              { color: isSabbathMode ? theme.textSecondary : theme.text, fontFamily: "Inter_700Bold" },
              isSabbathMode && { fontSize: 18 },
            ]}>
              {streak}
            </Text>
            <Text style={[s.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Day Streak
            </Text>
          </View>
        </View>
        {perfectWeeks > 0 && (
          <View style={[s.perfectBadge, { backgroundColor: theme.accent + "15" }]}>
            <Ionicons name="trophy" size={14} color={theme.accent} />
            <Text style={[s.perfectText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {perfectWeeks} Perfect {perfectWeeks === 1 ? "Week" : "Weeks"}
            </Text>
          </View>
        )}
      </View>
      <WeeklyCalendar data={weeklyData} theme={theme} isDark={isDark} />
    </View>
  ) : null;

  return (
    <>
    <FeatureTutorial tutorialId="home" steps={HOME_TUTORIAL_STEPS} />
    <ScrollView
      style={[s.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[s.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {greeting}
          </Text>
          <Text style={[s.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Grace Through Faith
          </Text>
          <Text style={[s.headerTagline, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Read · Reflect · Pray · Practice · Grow
          </Text>
        </View>
        <View>
          {showTooltip && (
            <View style={[s.tooltip, { backgroundColor: theme.accent }]}>
              <View style={[s.tooltipArrow, { borderBottomColor: theme.accent }]} />
              <Text style={s.tooltipText}>Switch to Kids Mode</Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              if (showTooltip) {
                setShowTooltip(false);
                AsyncStorage.setItem(KIDS_TOOLTIP_KEY, "true").catch(() => {});
              }
              setShowChildPicker(true);
            }}
            style={[s.kidsModeBtn, { backgroundColor: isDark ? theme.backgroundCard : "#F0EBE0" }]}
            testID="enter-kids-mode"
            accessibilityLabel="Switch to Kids Mode"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={18} color={theme.accent} />
            <Text style={[s.kidsModeBtnLabel, { color: theme.accent }]}>Kids</Text>
          </Pressable>
        </View>
      </View>

      <ChildPickerModal
        visible={showChildPicker}
        onClose={() => setShowChildPicker(false)}
        onSelectChild={(child) => {
          setShowChildPicker(false);
          enterKidsMode(child.id, child.name, child.ageGroup as AgeGroup);
        }}
        userId={userId}
        lastActiveChildId={lastActiveChildId}
      />

      {isSabbathMode ? (
        <>
          <AnimatedSection index={0}><SabbathBanner theme={theme} /></AnimatedSection>
          <AnimatedSection index={1}>
            <TodaysPath
              theme={theme}
              isDark={isDark}
              studyDone={(ringsData?.study.current ?? 0) > 0}
              prayerDone={(ringsData?.prayer.current ?? 0) > 0}
              hasRecentRead={!!lastRead}
              hasSabbathSchool={!!ssData?.currentLesson}
              hasActivePlan={hasActivePlan}
            />
          </AnimatedSection>
          <AnimatedSection index={2}><LiveNowSection theme={theme} isDark={isDark} /></AnimatedSection>
          <AnimatedSection index={3}><GoldDivider theme={theme} /></AnimatedSection>
          <AnimatedSection index={4}><SpiritualRings theme={theme} isDark={isDark} /></AnimatedSection>
          <AnimatedSection index={5}>
            <ContinueCard
              lastRead={lastRead}
              ssData={ssData}
              hasActivePlan={hasActivePlan}
              enrollmentPlanId={todayData?.enrollment?.planId}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={6}><GuidedToolsRow theme={theme} isDark={isDark} /></AnimatedSection>
          {ssData && <AnimatedSection index={7}><SabbathSchoolCard ssData={ssData} theme={theme} isDark={isDark} /></AnimatedSection>}
          <AnimatedSection index={8}>
            <DevotionalCard
              hasActivePlan={hasActivePlan}
              progress={progress}
              total={total}
              enrollmentPlanId={todayData?.enrollment?.planId}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={9}><VerseOfTheDay verse={verse} bgImage={bgImage} /></AnimatedSection>
        </>
      ) : (
        <>
          <AnimatedSection index={0}>
            <TodaysPath
              theme={theme}
              isDark={isDark}
              studyDone={(ringsData?.study.current ?? 0) > 0}
              prayerDone={(ringsData?.prayer.current ?? 0) > 0}
              hasRecentRead={!!lastRead}
              hasSabbathSchool={!!ssData?.currentLesson}
              hasActivePlan={hasActivePlan}
            />
          </AnimatedSection>
          <AnimatedSection index={1}>
            <ContinueCard
              lastRead={lastRead}
              ssData={ssData}
              hasActivePlan={hasActivePlan}
              enrollmentPlanId={todayData?.enrollment?.planId}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={2}><VerseOfTheDay verse={verse} bgImage={bgImage} /></AnimatedSection>
          <AnimatedSection index={3}><SpiritualRings theme={theme} isDark={isDark} /></AnimatedSection>
          <AnimatedSection index={4}><GuidedToolsRow theme={theme} isDark={isDark} /></AnimatedSection>
          {ssData && <AnimatedSection index={5}><SabbathSchoolCard ssData={ssData} theme={theme} isDark={isDark} /></AnimatedSection>}
          <AnimatedSection index={6}>
            <DevotionalCard
              hasActivePlan={hasActivePlan}
              progress={progress}
              total={total}
              enrollmentPlanId={todayData?.enrollment?.planId}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={7}><GoldDivider theme={theme} /></AnimatedSection>
          <AnimatedSection index={8}><LiveNowSection theme={theme} isDark={isDark} /></AnimatedSection>
        </>
      )}

    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 22 },
  header: { marginBottom: 28 },
  greeting: { fontSize: 14, letterSpacing: 0.5, marginBottom: 8 },
  appName: { fontSize: 28, letterSpacing: -0.3 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 4 },
  headerTitle: { fontSize: 22, letterSpacing: -0.3, marginBottom: 2 },
  headerTagline: { fontSize: 12, letterSpacing: 0.2, marginTop: 4 },
  kidsModeBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  kidsModeBtnLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  tooltip: {
    position: "absolute",
    top: "100%" as any,
    right: 0,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 10,
    minWidth: 140,
    alignItems: "center",
  },
  tooltipText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  tooltipArrow: {
    position: "absolute",
    top: -6,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  streakCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  streakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakNum: { fontSize: 28, lineHeight: 30 },
  streakLabel: { fontSize: 12 },
  perfectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  perfectText: { fontSize: 12 },
});
