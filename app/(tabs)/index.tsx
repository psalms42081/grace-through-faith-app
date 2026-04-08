import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
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
import { useToast } from "@/contexts/ToastContext";
import { useSabbath } from "@/lib/sabbath";
import SpiritualRings from "@/components/SpiritualRings";
import type { AgeGroup } from "@/context/KidsModeContext";
import AnimatedSection from "@/components/AnimatedSection";
import GoldDivider from "@/components/home/GoldDivider";
import RotatingPanel from "@/components/home/RotatingPanel";
import VotdHeroCard from "@/components/home/VotdHeroCard";
import { getBookImage } from "@/constants/bible-books";
import ContinueCard from "@/components/home/ContinueCard";
import { useResumeJourney } from "@/hooks/useResumeJourney";

import DevotionalCard from "@/components/home/DevotionalCard";
import SabbathBanner from "@/components/home/SabbathBanner";
import SabbathOverlay from "@/components/home/SabbathOverlay";
import WeeklyCalendar from "@/components/home/WeeklyCalendar";
import type { WeeklyStreakData } from "@/components/home/WeeklyCalendar";
import ChildPickerModal from "@/components/home/ChildPickerModal";
import TodaysPath from "@/components/home/TodaysPath";
import { DAILY_QUEST_STAR_REWARD, DAILY_CHAMPION_BONUS } from "@/constants/kids-shop";
import { useTutorial, TutorialId } from "@/contexts/TutorialContext";
import { usePioneer } from "@/contexts/PioneerContext";
import * as Haptics from "expo-haptics";
import { Animated as RNAnimated } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const COACH_TIP_BG = "#1E88E5";
const COACH_ARROW_W = 4;
const COACH_ARROW_H = 6;

function InlineCoachTip({
  id,
  text,
  visible,
  onDismiss,
}: {
  id: TutorialId;
  text: string;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { hasSeenTutorial, markTutorialSeen, isLoaded } = useTutorial();
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const floatAnim = useRef(new RNAnimated.Value(0)).current;
  const dismissed = useRef(false);

  const shouldShow = isLoaded && visible && !hasSeenTutorial(id);

  useEffect(() => {
    if (shouldShow) {
      dismissed.current = false;
      fadeAnim.setValue(0);
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(floatAnim, {
            toValue: -6,
            duration: 750,
            useNativeDriver: true,
            easing: (t: number) => t * t * (3 - 2 * t),
          }),
          RNAnimated.timing(floatAnim, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
            easing: (t: number) => t * t * (3 - 2 * t),
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      floatAnim.setValue(0);
    }
  }, [shouldShow]);

  const handleDismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Haptics.selectionAsync();
    RNAnimated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      markTutorialSeen(id);
      onDismiss();
    });
  };

  if (!shouldShow) return null;

  return (
    <Pressable onPress={handleDismiss} accessibilityRole="button" accessibilityLabel={`Dismiss tip: ${text}`}>
      <RNAnimated.View
        style={[
          inlineCoachStyles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        <View style={inlineCoachStyles.arrow} />
        <Text style={inlineCoachStyles.text} numberOfLines={1}>{text}</Text>
      </RNAnimated.View>
    </Pressable>
  );
}

const inlineCoachStyles = StyleSheet.create({
  container: {
    backgroundColor: COACH_TIP_BG,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 4,
    maxWidth: 260,
    alignSelf: "flex-start",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
      web: { boxShadow: "0 3px 12px rgba(0,0,0,0.2)" },
    }),
  },
  arrow: {
    position: "absolute",
    top: -COACH_ARROW_H,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: COACH_ARROW_W,
    borderRightWidth: COACH_ARROW_W,
    borderBottomWidth: COACH_ARROW_H,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: COACH_TIP_BG,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
  },
});

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
  enrollment?: { planId: string; plan?: { title: string } | null };
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
  const { showToast } = useToast();
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

  const { data: dailyStory } = useQuery<{ id: string; title: string; scriptureRef: string | null; estimatedMinutes: number; imageUrl: string | null; memoryVerse: string | null; memoryVerseRef: string | null; prayerPrompt: string | null }>({
    queryKey: [`/api/kids/daily?ageGroup=${ageGroup}`],
  });

  const progressUserId = activeChildProfileId || "guest";

  const { data: streak } = useQuery<{ currentStreak: number; longestStreak: number }>({
    queryKey: [`/api/kids/streak?_uid=${progressUserId}`],
  });

  const { data: progress } = useQuery<{ completed: boolean; quizScore: number | null; memoryVerseMemorized: boolean }[]>({
    queryKey: [`/api/kids/progress?_uid=${progressUserId}`],
  });

  const { data: kidsSS } = useQuery<{ lesson: { title: string; memoryVerse: string; memoryVerseRef: string; linkedStory: { id: string; title: string } | null } }>({
    queryKey: [`/api/kids/sabbath-school/current?ageGroup=${ageGroup}`],
    staleTime: 0,
  });

  const { data: badges } = useQuery<{ id: string }[]>({
    queryKey: [`/api/kids/badges/earned?_uid=${progressUserId}`],
  });

  const { data: questData } = useQuery<{
    id: number;
    readStory: boolean;
    practiceVerse: boolean;
    takeQuiz: boolean;
    bonusClaimed: boolean;
  }>({
    queryKey: [`/api/kids/quests/today?childId=${activeChildProfileId || ""}`],
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;
  const memorizedCount = progress?.filter(p => p.memoryVerseMemorized).length ?? 0;
  const badgeCount = badges?.length ?? 0;
  const questsDone = questData ? [questData.readStory, questData.practiceVerse, questData.takeQuiz].filter(Boolean).length : 0;
  const allQuestsDone = questsDone === 3;

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
          <View style={{ flex: 1, marginRight: 12 }}>
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
              accessibilityLabel="Switch child"
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
              accessibilityLabel="Exit Kids Mode"
            >
              <Ionicons name="log-out-outline" size={16} color={theme.textSecondary} />
              <Text style={[kidsStyles.exitBtnText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Exit
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
                      showToast("Incorrect PIN. Please try again.", "error");
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
                    showToast("Incorrect PIN. Please try again.", "error");
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
              {dailyStory.memoryVerse && (
                <Text style={[kidsStyles.heroThemeLine, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                  {dailyStory.memoryVerse}
                </Text>
              )}
              {dailyStory.scriptureRef && !dailyStory.memoryVerse && (
                <Text style={[kidsStyles.heroRef, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {dailyStory.scriptureRef}
                </Text>
              )}
              <View style={[kidsStyles.heroCta, { backgroundColor: theme.accent }]}>
                <Ionicons name={dailyStory.prayerPrompt ? "sparkles" : "play"} size={14} color="#fff" />
                <Text style={[kidsStyles.heroCtaText, { fontFamily: "Inter_600SemiBold" }]}>
                  {dailyStory.prayerPrompt ? "Start Adventure" : "Continue Story"}
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
        <View style={[kidsStyles.questsCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <View style={kidsStyles.questsHeader}>
            <Ionicons name="compass" size={22} color="#FFD700" />
            <Text style={[kidsStyles.questsTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Daily Quests
            </Text>
            <Text style={[kidsStyles.questsCount, { color: allQuestsDone ? "#4CAF50" : theme.textMuted, fontFamily: "Inter_700Bold" }]}>
              {questsDone}/3
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/kids-stories")}
            style={[kidsStyles.questRow, questData?.readStory && kidsStyles.questRowDone]}
          >
            <Ionicons
              name={questData?.readStory ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={questData?.readStory ? "#4CAF50" : "#666"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[kidsStyles.questLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                Read a Story
              </Text>
            </View>
            <View style={kidsStyles.questReward}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[kidsStyles.questRewardText, { fontFamily: "Inter_600SemiBold" }]}>
                +{DAILY_QUEST_STAR_REWARD}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/kids-learn")}
            style={[kidsStyles.questRow, questData?.practiceVerse && kidsStyles.questRowDone]}
          >
            <Ionicons
              name={questData?.practiceVerse ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={questData?.practiceVerse ? "#4CAF50" : "#666"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[kidsStyles.questLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                Practice a Verse
              </Text>
            </View>
            <View style={kidsStyles.questReward}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[kidsStyles.questRewardText, { fontFamily: "Inter_600SemiBold" }]}>
                +{DAILY_QUEST_STAR_REWARD}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/kids-learn")}
            style={[kidsStyles.questRow, questData?.takeQuiz && kidsStyles.questRowDone]}
          >
            <Ionicons
              name={questData?.takeQuiz ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={questData?.takeQuiz ? "#4CAF50" : "#666"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[kidsStyles.questLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                Take a Quiz
              </Text>
            </View>
            <View style={kidsStyles.questReward}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[kidsStyles.questRewardText, { fontFamily: "Inter_600SemiBold" }]}>
                +{DAILY_QUEST_STAR_REWARD}
              </Text>
            </View>
          </Pressable>

          {allQuestsDone && (
            <View style={kidsStyles.questBonusBanner}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <Text style={[kidsStyles.questBonusText, { fontFamily: "Inter_600SemiBold" }]}>
                Daily Champion! +{DAILY_CHAMPION_BONUS} bonus stars
              </Text>
            </View>
          )}
        </View>
      </AnimatedSection>

      <AnimatedSection index={5}>
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
  heroThemeLine: {
    fontSize: 13,
    marginBottom: 4,
    fontStyle: "italic" as const,
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
  questsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  questsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  questsTitle: {
    fontSize: 16,
    flex: 1,
  },
  questsCount: {
    fontSize: 15,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  questRowDone: {
    opacity: 0.6,
  },
  questLabel: {
    fontSize: 14,
  },
  questReward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,215,0,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  questRewardText: {
    fontSize: 12,
    color: "#FFD700",
  },
  questBonusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  questBonusText: {
    fontSize: 13,
    color: "#FFD700",
  },
});



interface HomeSeries {
  id: string;
  title: string;
  subtitle: string | null;
  tag: string | null;
  speaker: string | null;
  gradientColors: string[] | null;
  episodeCount: number;
  isFeatured: boolean;
  status: string;
}

function ReadingPlansCard({ theme, isDark }: { theme: any; isDark: boolean }) {
  return (
    <Pressable
      onPress={() => router.push("/(tabs)/plans" as any)}
      style={({ pressed }) => [
        readingPlanStyles.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      testID="home-reading-plans-card"
    >
      <Image
        source={require("@/assets/home-cards/read.png")}
        style={readingPlanStyles.bgImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(5,5,7,0.10)", "rgba(5,5,7,0.44)", "rgba(5,5,7,0.74)"]}
        locations={[0, 0.5, 1]}
        style={readingPlanStyles.overlay}
      >
        <View style={readingPlanStyles.contentBottom}>
          <View style={readingPlanStyles.labelRow}>
            <Ionicons name="calendar" size={14} color="#C9933A" />
            <Text style={[readingPlanStyles.labelText, { fontFamily: "Inter_500Medium" }]}>
              Reading Plans
            </Text>
          </View>
          <Text style={[readingPlanStyles.title, { fontFamily: "Lora_700Bold" }]}>
            Guided Daily Scripture
          </Text>
          <Text style={[readingPlanStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Follow a structured path through the Bible
          </Text>
          <View style={readingPlanStyles.ctaRow}>
            <LinearGradient
              colors={["#C9933A", "#A87828"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={readingPlanStyles.ctaButton}
            >
              <Text style={[readingPlanStyles.ctaText, { fontFamily: "Inter_600SemiBold" }]}>Browse Plans</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const readingPlanStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    height: 160,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 22,
    borderRadius: 20,
  },
  contentBottom: {
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 11,
    color: "#C9933A",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  title: {
    color: "#F5F0E8",
    fontSize: 20,
  },
  subtitle: {
    color: "rgba(245,240,232,0.5)",
    fontSize: 13,
    marginBottom: 8,
  },
  ctaRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 13,
  },
});

function FeaturedSeriesSection({ theme, isDark }: { theme: any; isDark: boolean }) {
  const { data: seriesList } = useQuery<HomeSeries[]>({
    queryKey: ["/api/series"],
    staleTime: 60_000,
  });

  const featured = seriesList?.find((s) => s.isFeatured);
  if (!featured) return null;

  const gradient = featured.gradientColors && featured.gradientColors.length >= 2
    ? featured.gradientColors as [string, string, ...string[]]
    : ["#1a0a2e", "#2d1b69", "#4c1d95"] as [string, string, ...string[]];

  return (
    <View style={seriesStyles.section}>
      <View style={seriesStyles.sectionHeader}>
        <Text style={[seriesStyles.sectionTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Series
        </Text>
        <Pressable onPress={() => router.push("/series" as any)} hitSlop={8}>
          <Text style={[seriesStyles.seeAll, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            See All
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/series" as any)}
        style={({ pressed }) => [
          seriesStyles.featuredCard,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        testID="home-featured-series"
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={seriesStyles.featuredGradient}
        >
          {featured.tag ? (
            <View style={seriesStyles.tagBadge}>
              <Text style={seriesStyles.tagText}>✦ {featured.tag}</Text>
            </View>
          ) : null}

          <Text style={seriesStyles.featuredTitle}>{featured.title}</Text>
          {featured.subtitle ? (
            <Text style={seriesStyles.featuredSubtitle}>{featured.subtitle}</Text>
          ) : null}

          <View style={seriesStyles.metaRow}>
            <View style={seriesStyles.metaItem}>
              <Ionicons name="videocam-outline" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={seriesStyles.metaText}>{featured.episodeCount} Episodes</Text>
            </View>
            {featured.speaker ? (
              <>
                <Text style={seriesStyles.metaDot}>•</Text>
                <View style={seriesStyles.metaItem}>
                  <Ionicons name="person-outline" size={13} color="rgba(255,255,255,0.5)" />
                  <Text style={seriesStyles.metaText}>{featured.speaker} Speaker</Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={seriesStyles.watchBtn}>
            <Ionicons name="play" size={14} color="#C9933A" />
            <Text style={seriesStyles.watchBtnText}>Watch Series</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const seriesStyles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, letterSpacing: -0.3 },
  seeAll: { fontSize: 13 },
  featuredCard: { borderRadius: 18, overflow: "hidden" },
  featuredGradient: { padding: 20, borderRadius: 18 },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,147,58,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
  },
  tagText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    marginBottom: 4,
  },
  featuredSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular" },
  metaDot: { color: "rgba(255,255,255,0.2)", fontSize: 11, marginHorizontal: 4 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(201,147,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  watchBtnText: {
    color: "#C9933A",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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

const TOUCHPOINT_TOPICS = [
  { title: "The Sanctuary", excerpt: "Christ's ministry in the heavenly sanctuary reveals God's plan to restore us fully to His image and eradicate sin forever.", route: "/touchpoint-topic?topicId=sanctuary" },
  { title: "The Sabbath Rest", excerpt: "The seventh-day Sabbath is a gift of time \u2014 a weekly invitation to cease striving and rest in the finished work of our Creator.", route: "/touchpoint-topic?topicId=sabbath" },
  { title: "The Second Coming", excerpt: "The blessed hope of Christ's literal, visible return is the culmination of the gospel and the answer to every longing heart.", route: "/touchpoint-topic?topicId=second-coming" },
  { title: "Righteousness by Faith", excerpt: "We are justified by grace alone through faith in Christ, not by any merit of our own, yet genuine faith always bears fruit.", route: "/touchpoint-topic?topicId=trust" },
  { title: "The State of the Dead", excerpt: "Death is a sleep, not a doorway. The Bible's clear teaching frees us from fear and points us to the resurrection morning.", route: "/touchpoint-topic?topicId=state-of-dead" },
  { title: "The Three Angels' Messages", excerpt: "Heaven's final appeal calls every nation to worship the Creator, come out of confusion, and stand faithful in the last days.", route: "/touchpoint-topic?topicId=three-angels" },
  { title: "Health & Wholeness", excerpt: "God cares for the whole person \u2014 body, mind, and spirit. Biblical health principles are an expression of His love for us.", route: "/touchpoint-topic?topicId=health-message" },
  { title: "The Gift of Prophecy", excerpt: "The prophetic gift, manifested in the life and writings of Ellen G. White, continues to guide and encourage God's remnant people.", route: "/touchpoint-topic?topicId=prophecy" },
  { title: "Christian Stewardship", excerpt: "Everything we have belongs to God. Faithful stewardship of time, talents, and treasure is an act of worship and trust.", route: "/touchpoint-topic?topicId=generosity" },
  { title: "The Law of God", excerpt: "The Ten Commandments reveal God's character of love. Through Christ, obedience becomes not a burden but a joyful response to grace.", route: "/touchpoint-topic?topicId=integrity" },
  { title: "Baptism & New Life", excerpt: "Baptism by immersion symbolises death to the old life and resurrection to walk in newness of life with Jesus.", route: "/touchpoint-topic?topicId=purpose" },
  { title: "The Great Controversy", excerpt: "The cosmic conflict between Christ and Satan explains the origin of suffering and assures us of God's ultimate victory.", route: "/touchpoint-topic?topicId=great-controversy" },
  { title: "Unity in the Body", excerpt: "Christ calls His church to unity in diversity, reflecting the love of the Godhead and witnessing to the world.", route: "/touchpoint-topic?topicId=forgiveness" },
  { title: "The Remnant Church", excerpt: "In the last days God has a faithful people who keep His commandments and hold to the testimony of Jesus.", route: "/touchpoint-topic?topicId=remnant" },
];

const DAILY_REFLECTIONS = [
  { thought: "Grace is not a doctrine to be memorised but a Person to be embraced. Today, let Christ's unmerited favour reshape every anxious thought.", source: "Reflection on Ephesians 2:8-9" },
  { thought: "The cross does not merely pardon the past; it empowers the present. Walk today in the strength of the One who conquered death.", source: "Reflection on Galatians 2:20" },
  { thought: "Sabbath rest is heaven's rhythm set in time \u2014 a weekly reminder that our worth is not in what we produce but in Whose we are.", source: "Reflection on Exodus 20:8-11" },
  { thought: "Prayer is not convincing God to act; it is aligning our hearts with the One who is already working all things for good.", source: "Reflection on Romans 8:28" },
  { thought: "When we behold Christ, we become like Him \u2014 not by straining to imitate, but by gazing until His character becomes our own.", source: "Reflection on 2 Corinthians 3:18" },
  { thought: "Hope is not wishful thinking. It is the anchor of the soul, fastened to the promise of a God who cannot lie.", source: "Reflection on Hebrews 6:19" },
  { thought: "Love your neighbour not because they deserve it, but because you have been loved beyond all deserving. Grace received becomes grace given.", source: "Reflection on 1 John 4:19" },
];

const KIDS_TOOLTIP_KEY = "@grace-through-faith/kids-tooltip-shown";

function AdultHomeScreen() {
  const { theme: baseTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { enterKidsMode, lastActiveChildId } = useKidsMode();
  const { userId } = useAuth();
  const sabbath = useSabbath();
  const { t } = useTranslation();
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.goodMorning");
    if (hour < 17) return t("home.goodAfternoon");
    return t("home.goodEvening");
  }, [t]);
  const verse = useMemo(() => getTodaysVerse(), []);
  const bgImage = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return VERSE_BACKGROUNDS[dayOfYear % VERSE_BACKGROUNDS.length];
  }, []);
  const verseBookImage = useMemo(() => {
    const ref = verse.reference;
    const bookName = ref.replace(/\s+\d+.*$/, "");
    return getBookImage(bookName);
  }, [verse.reference]);

  const { data: todayData } = useQuery<TodayResponse>({
    queryKey: [`/api/devotionals/today?userId=${userId}`],
  });

  const { data: recentReads } = useQuery<{ id: string; bookId: number; bookName: string; chapter: number; translation: string; readAt: string }[]>({
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
    companion: { id: string; slug: string; title: string; description: string | null } | null;
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
  const todayStr = new Date().toDateString();
  const readToday = lastRead?.readAt
    ? new Date(lastRead.readAt).toDateString() === todayStr
    : false;
  const streak = weeklyData?.currentStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;

  const hasActivePlan = todayData?.today != null;
  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;

  const { item: resumeItem } = useResumeJourney();

  const isSabbathMode = sabbath.isSabbath;

  const { hasSeenTutorial, markTutorialSeen, isLoaded: tutorialLoaded } = useTutorial();
  const { onboardingComplete: hologramDone, isVisible: hologramActive } = usePioneer();

  const HOME_COACH_SEQUENCE: TutorialId[] = [
    "home_daily_rhythm",
    "home_formation_rings",
    "home_kids_button",
  ];

  const HOME_COACH_TEXTS: Record<string, string> = {
    home_daily_rhythm: "Tap Read or Reflect to start your day.",
    home_formation_rings: "Tap a ring to see your daily progress.",
    home_kids_button: "Switch to Kids Club content.",
  };

  const [activeCoachMark, setActiveCoachMark] = useState<TutorialId | null>(null);

  useEffect(() => {
    if (!tutorialLoaded) return;
    if (hologramActive || !hologramDone) {
      setActiveCoachMark(null);
      return;
    }
    HOME_COACH_SEQUENCE.forEach(id => {
      if (!hasSeenTutorial(id)) markTutorialSeen(id);
    });
    setActiveCoachMark(null);
  }, [tutorialLoaded, hasSeenTutorial, hologramDone, hologramActive]);

  const handleCoachDismiss = useCallback(() => {
    setActiveCoachMark(prev => {
      const idx = HOME_COACH_SEQUENCE.indexOf(prev as TutorialId);
      if (idx >= 0 && idx < HOME_COACH_SEQUENCE.length - 1) {
        return HOME_COACH_SEQUENCE[idx + 1];
      }
      return null;
    });
  }, []);

  const streakSection = weeklyData && (streak > 0 || weeklyData.daysRead.some(Boolean)) ? (
    <View style={[
      s.streakCard,
      isSabbathMode && { opacity: 0.7 },
    ]}>
      <LinearGradient
        colors={isDark ? ["#1A1510", "#0F0D0A", "#0A0908"] : ["#FFFDF6", "#FFF8ED", "#FFF5E6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.streakGradient}
      >
        <View style={s.streakHeader}>
          <View style={s.streakLeft}>
            <View style={s.streakFireWrap}>
              <Ionicons name="flame" size={isSabbathMode ? 20 : 24} color={isSabbathMode ? theme.textMuted : "#FF6B35"} />
            </View>
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
      </LinearGradient>
    </View>
  ) : null;

  return (
    <>
    <SabbathOverlay
      isSabbath={sabbath.isSabbath}
      isClosingPhase={sabbath.closingReflectionActive}
    />
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
        <View style={{ flexShrink: 0 }}>
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
            style={[s.kidsModeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}
            testID="enter-kids-mode"
            accessibilityLabel="Switch to Kids Mode"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={16} color={theme.accent} style={{ opacity: 0.8 }} />
            <Text style={[s.kidsModeBtnLabel, { color: theme.accent, opacity: 0.8 }]}>Kids</Text>
          </Pressable>
        </View>
      </View>

      <InlineCoachTip
        id="home_kids_button"
        text={HOME_COACH_TEXTS.home_kids_button}
        visible={activeCoachMark === "home_kids_button"}
        onDismiss={handleCoachDismiss}
      />

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

      <View style={{ marginHorizontal: -20 }}>
        <VotdHeroCard verse={verse} bgImage={bgImage} bookImage={verseBookImage} userId={userId} />
      </View>

      {isSabbathMode ? (
        <>
          <AnimatedSection index={0}><SabbathBanner theme={theme} /></AnimatedSection>
          <AnimatedSection index={1}>
            <TodaysPath
              theme={theme}
              isDark={isDark}
              hasRecentRead={readToday}
              dailyVerseRef={verse.reference}
            />
            <InlineCoachTip
              id="home_daily_rhythm"
              text={HOME_COACH_TEXTS.home_daily_rhythm}
              visible={activeCoachMark === "home_daily_rhythm"}
              onDismiss={handleCoachDismiss}
            />
          </AnimatedSection>
          <AnimatedSection index={2}><FeaturedSeriesSection theme={theme} isDark={isDark} /></AnimatedSection>
          <AnimatedSection index={4}><RotatingPanel touchpoints={TOUCHPOINT_TOPICS} devotionals={DAILY_REFLECTIONS} /></AnimatedSection>
          <AnimatedSection index={5}>
            <ContinueCard
              item={resumeItem}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={6}>
            <ReadingPlansCard theme={theme} isDark={isDark} />
          </AnimatedSection>
          <AnimatedSection index={7}><GoldDivider theme={theme} /></AnimatedSection>
          {!resumeItem && !hasActivePlan && (
            <AnimatedSection index={7}>
              <DevotionalCard
                hasActivePlan={false}
                progress={0}
                total={0}
                theme={theme}
                isDark={isDark}
              />
            </AnimatedSection>
          )}
          {ssData?.companion && (
            <AnimatedSection index={7}>
              <Pressable
                onPress={() => router.push(`/resource-detail?slug=${ssData.companion!.slug}` as any)}
                style={({ pressed }) => [
                  homeStyles.companionHomeCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={isDark ? ["rgba(109,62,206,0.18)", "rgba(139,92,246,0.08)"] : ["rgba(139,92,246,0.1)", "rgba(109,62,206,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={homeStyles.companionGradient}
                >
                  <View style={homeStyles.companionHomeRow}>
                    <View style={homeStyles.companionHomeIcon}>
                      <Ionicons name="book" size={16} color="#A78BFA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[homeStyles.companionHomeLabel, { color: "#A78BFA" }]}>
                        Lesson Companion
                      </Text>
                      <Text style={[homeStyles.companionHomeTitle, { color: isDark ? "#E8E0F0" : theme.text }]} numberOfLines={1}>
                        {ssData.companion.title.replace(/^Companion:\s*/i, "")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(167,139,250,0.5)" : theme.textMuted} />
                  </View>
                </LinearGradient>
              </Pressable>
            </AnimatedSection>
          )}
          <AnimatedSection index={8}>
            <SpiritualRings theme={theme} isDark={isDark} />
            <InlineCoachTip
              id="home_formation_rings"
              text={HOME_COACH_TEXTS.home_formation_rings}
              visible={activeCoachMark === "home_formation_rings"}
              onDismiss={handleCoachDismiss}
            />
          </AnimatedSection>
        </>
      ) : (
        <>
          <AnimatedSection index={0}>
            <TodaysPath
              theme={theme}
              isDark={isDark}
              hasRecentRead={readToday}
              dailyVerseRef={verse.reference}
            />
            <InlineCoachTip
              id="home_daily_rhythm"
              text={HOME_COACH_TEXTS.home_daily_rhythm}
              visible={activeCoachMark === "home_daily_rhythm"}
              onDismiss={handleCoachDismiss}
            />
          </AnimatedSection>
          <AnimatedSection index={1}><FeaturedSeriesSection theme={theme} isDark={isDark} /></AnimatedSection>
          <AnimatedSection index={3}><RotatingPanel touchpoints={TOUCHPOINT_TOPICS} devotionals={DAILY_REFLECTIONS} /></AnimatedSection>
          <AnimatedSection index={4}>
            <ContinueCard
              item={resumeItem}
              theme={theme}
              isDark={isDark}
            />
          </AnimatedSection>
          <AnimatedSection index={5}>
            <ReadingPlansCard theme={theme} isDark={isDark} />
          </AnimatedSection>
          <AnimatedSection index={6}><GoldDivider theme={theme} /></AnimatedSection>
          {!resumeItem && !hasActivePlan && (
            <AnimatedSection index={6}>
              <DevotionalCard
                hasActivePlan={false}
                progress={0}
                total={0}
                theme={theme}
                isDark={isDark}
              />
            </AnimatedSection>
          )}
          {ssData?.companion && (
            <AnimatedSection index={7}>
              <Pressable
                onPress={() => router.push(`/resource-detail?slug=${ssData.companion!.slug}` as any)}
                style={({ pressed }) => [
                  homeStyles.companionHomeCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={isDark ? ["rgba(109,62,206,0.18)", "rgba(139,92,246,0.08)"] : ["rgba(139,92,246,0.1)", "rgba(109,62,206,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={homeStyles.companionGradient}
                >
                  <View style={homeStyles.companionHomeRow}>
                    <View style={homeStyles.companionHomeIcon}>
                      <Ionicons name="book" size={16} color="#A78BFA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[homeStyles.companionHomeLabel, { color: "#A78BFA" }]}>
                        Lesson Companion
                      </Text>
                      <Text style={[homeStyles.companionHomeTitle, { color: isDark ? "#E8E0F0" : theme.text }]} numberOfLines={1}>
                        {ssData.companion.title.replace(/^Companion:\s*/i, "")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(167,139,250,0.5)" : theme.textMuted} />
                  </View>
                </LinearGradient>
              </Pressable>
            </AnimatedSection>
          )}
          <AnimatedSection index={8}>
            <SpiritualRings theme={theme} isDark={isDark} />
            <InlineCoachTip
              id="home_formation_rings"
              text={HOME_COACH_TEXTS.home_formation_rings}
              visible={activeCoachMark === "home_formation_rings"}
              onDismiss={handleCoachDismiss}
            />
          </AnimatedSection>
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
    marginBottom: 18,
  },
  greeting: { fontSize: 13, letterSpacing: 0.3, marginBottom: 3 },
  headerTitle: { fontSize: 22, letterSpacing: -0.3, marginBottom: 1 },
  headerTagline: { fontSize: 12, letterSpacing: 0.2, marginTop: 3 },
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
    overflow: "hidden",
    marginBottom: 16,
  },
  streakGradient: {
    borderRadius: 20,
    padding: 20,
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
  streakFireWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
    alignItems: "center",
    justifyContent: "center",
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

const homeStyles = StyleSheet.create({
  companionHomeCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  companionGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
  },
  companionHomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  companionHomeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  companionHomeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  companionHomeTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
});
