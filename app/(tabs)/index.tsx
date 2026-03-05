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
  ImageBackground,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
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
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { useSabbath } from "@/lib/sabbath";
import FeatureTutorial from "@/components/FeatureTutorial";
import { HOME_TUTORIAL_STEPS } from "@/lib/tutorial-steps";
import SpiritualRings from "@/components/SpiritualRings";
import type { AgeGroup } from "@/context/KidsModeContext";

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

function GoldDivider({ theme }: { theme: typeof Colors.dark }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.accent + "30" }]} />
      <Ionicons name="diamond-outline" size={10} color={theme.accent + "60"} />
      <View style={[styles.dividerLine, { backgroundColor: theme.accent + "30" }]} />
    </View>
  );
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

function AnimatedSection({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(500).springify()}>
      {children}
    </Animated.View>
  );
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

  const { data: progress } = useQuery<{ completed: boolean }[]>({
    queryKey: [`/api/kids/progress/${progressUserId}`],
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;

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
              {activeChildName ? `Reading as ${activeChildName}` : greeting}
            </Text>
            <Text style={[styles.appName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Kids Club
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

      <AnimatedSection index={0}>
        {baseUrl ? (
          <Image
            source={{ uri: `${baseUrl}/assets/images/app/kids-welcome.png` }}
            style={kidsStyles.welcomeImage}
            resizeMode="cover"
          />
        ) : null}
      </AnimatedSection>

      <AnimatedSection index={1}>
        <View style={[kidsStyles.verseCard, { backgroundColor: theme.accent }]}>
          <Ionicons name="sunny" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={[kidsStyles.verseLabel, { fontFamily: "Inter_600SemiBold" }]}>Today's Verse</Text>
          <Text style={[kidsStyles.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
            "{verse.text}"
          </Text>
          <Text style={[kidsStyles.verseRef, { fontFamily: "Inter_600SemiBold" }]}>
            {verse.reference}
          </Text>
        </View>
      </AnimatedSection>

      {streak && streak.currentStreak > 0 && (
        <AnimatedSection index={2}>
          <View style={[kidsStyles.streakBanner, { backgroundColor: "#FF6B35" + "15", borderColor: "#FF6B35" + "30" }]}>
            <PulsingFlame size={22} color="#FF6B35" />
            <Text style={[kidsStyles.streakText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {streak.currentStreak} day streak!
            </Text>
            <PulsingFlame size={22} color="#FF6B35" />
          </View>
        </AnimatedSection>
      )}

      <AnimatedSection index={3}>
        <View style={kidsStyles.statsRow}>
          <View style={[kidsStyles.statBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Ionicons name="star" size={24} color={(theme as any).starGold || theme.accent} />
            <Text style={[kidsStyles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {completedCount}
            </Text>
            <Text style={[kidsStyles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Stories Read
            </Text>
          </View>
          <View style={[kidsStyles.statBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Ionicons name="flame" size={24} color="#FF6B35" />
            <Text style={[kidsStyles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {streak?.currentStreak ?? 0}
            </Text>
            <Text style={[kidsStyles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Day Streak
            </Text>
          </View>
        </View>
      </AnimatedSection>

      {dailyStory && (
        <AnimatedSection index={4}>
          <Pressable
            onPress={() => router.push(`/kids/story/${dailyStory.id}`)}
            style={[kidsStyles.dailyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.accent + "40" }]}
            testID="daily-story"
          >
            {dailyStory.imageUrl && baseUrl ? (
              <Image
                source={{ uri: `${baseUrl}${dailyStory.imageUrl}` }}
                style={kidsStyles.dailyImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[kidsStyles.dailyIcon, { backgroundColor: theme.accent + "20" }]}>
                <Ionicons name="book" size={28} color={theme.accent} />
              </View>
            )}
            <View style={kidsStyles.dailyInfo}>
              <Text style={[kidsStyles.dailyLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Today's Story
              </Text>
              <Text style={[kidsStyles.dailyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
                {dailyStory.title}
              </Text>
              {dailyStory.scriptureRef && (
                <Text style={[kidsStyles.dailyRef, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {dailyStory.scriptureRef}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.accent} />
          </Pressable>
        </AnimatedSection>
      )}

      <AnimatedSection index={5}>
        <View style={kidsStyles.quickActions}>
          <BouncyActionCard
            onPress={() => router.push("/(tabs)/kids-stories")}
            style={[kidsStyles.actionCard, { backgroundColor: theme.accent }]}
            testID="browse-stories"
          >
            <Ionicons name="book-outline" size={28} color="#fff" />
            <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Browse Stories</Text>
            <Text style={[kidsStyles.actionDesc, { fontFamily: "Inter_400Regular" }]}>Read Bible stories</Text>
          </BouncyActionCard>
          <BouncyActionCard
            onPress={() => router.push("/(tabs)/kids-learn")}
            style={[kidsStyles.actionCard, { backgroundColor: (theme as any).purple || theme.accent }]}
            testID="take-quiz"
          >
            <Ionicons name="school-outline" size={28} color="#fff" />
            <Text style={[kidsStyles.actionTitle, { fontFamily: "Inter_600SemiBold" }]}>Learn</Text>
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
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    gap: 6,
  },
  actionTitle: { color: "#fff", fontSize: 15, marginTop: 4 },
  actionDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
});

const AGE_TIERS: { value: AgeGroup; label: string; ages: string }[] = [
  { value: "little_lambs", label: "Little Lambs", ages: "Ages 3-6" },
  { value: "young_disciples", label: "Young Disciples", ages: "Ages 7-9" },
  { value: "young_disciples_plus", label: "Young Disciples+", ages: "Ages 10-12" },
];

interface ChildProfile {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  totalPoints: number;
  currentLevel: number;
}

function ChildPickerModal({
  visible,
  onClose,
  onSelectChild,
  userId,
  lastActiveChildId,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectChild: (child: ChildProfile) => void;
  userId: string;
  lastActiveChildId: string | null;
}) {
  const { theme, isDark } = useTheme();
  const qc = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildTier, setNewChildTier] = useState<AgeGroup>("little_lambs");

  const { data: children, isLoading } = useQuery<ChildProfile[]>({
    queryKey: [`/api/family/children?userId=${userId}`],
    enabled: visible,
  });

  const addChildMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/family/children", {
        userId,
        name: newChildName.trim(),
        ageGroup: newChildTier,
      });
      return res.json();
    },
    onSuccess: (child: ChildProfile) => {
      qc.invalidateQueries({ queryKey: [`/api/family/children?userId=${userId}`] });
      setNewChildName("");
      setNewChildTier("little_lambs");
      setShowAddForm(false);
      onSelectChild(child);
    },
    onError: (err: Error) => {
      const msg = err.message || "Could not add child. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    },
  });

  const hasChildren = children && children.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cpStyles.overlay}>
        <View style={[cpStyles.container, { backgroundColor: isDark ? theme.backgroundCard : "#FAFAF5" }]}>
          <View style={cpStyles.header}>
            <Text style={[cpStyles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Who's reading today?
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          {isLoading && (
            <View style={cpStyles.loadingWrap}>
              <Text style={[cpStyles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Loading...
              </Text>
            </View>
          )}

          {!isLoading && hasChildren && !showAddForm && (
            <ScrollView style={cpStyles.childList} showsVerticalScrollIndicator={false}>
              {children.map((child) => {
                const tierInfo = AGE_TIERS.find((t) => t.value === child.ageGroup) || AGE_TIERS[0];
                const isLast = child.id === lastActiveChildId;
                const initials = child.name.charAt(0).toUpperCase();
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => onSelectChild(child)}
                    style={({ pressed }) => [
                      cpStyles.childCard,
                      {
                        backgroundColor: isDark ? (isLast ? theme.accent + "15" : theme.background) : (isLast ? "#FFF8EC" : "#fff"),
                        borderColor: isLast ? theme.accent + "40" : (isDark ? theme.border : "#E8E0D0"),
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID={`child-picker-${child.id}`}
                  >
                    <LinearGradient
                      colors={
                        child.ageGroup === "little_lambs"
                          ? ["#FF6B35", "#E55100"]
                          : child.ageGroup === "young_disciples"
                          ? ["#3B6CB5", "#2A4F8F"]
                          : ["#8B5CF6", "#6D3BD4"]
                      }
                      style={cpStyles.avatar}
                    >
                      <Text style={[cpStyles.avatarText, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
                    </LinearGradient>
                    <View style={cpStyles.childInfo}>
                      <Text style={[cpStyles.childName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                        {child.name}
                      </Text>
                      <Text style={[cpStyles.childTier, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                        {tierInfo.label} · {tierInfo.ages}
                      </Text>
                    </View>
                    {isLast && (
                      <View style={[cpStyles.lastBadge, { backgroundColor: theme.accent + "20" }]}>
                        <Text style={[cpStyles.lastBadgeText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                          Last
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowAddForm(true)}
                style={({ pressed }) => [
                  cpStyles.addChildBtn,
                  {
                    borderColor: isDark ? theme.border : "#E8E0D0",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="add-circle-outline" size={22} color={theme.accent} />
                <Text style={[cpStyles.addChildText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  Add Child
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {(!isLoading && (!hasChildren || showAddForm)) && (
            <View style={cpStyles.addForm}>
              {showAddForm && hasChildren && (
                <Pressable onPress={() => setShowAddForm(false)} style={cpStyles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={theme.accent} />
                  <Text style={[cpStyles.backText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>Back</Text>
                </Pressable>
              )}
              {!hasChildren && (
                <Text style={[cpStyles.emptyText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Add a child to get started
                </Text>
              )}
              <TextInput
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="Child's name"
                placeholderTextColor={theme.textMuted}
                style={[cpStyles.input, { color: theme.text, borderColor: isDark ? theme.border : "#E0D8C8", backgroundColor: isDark ? theme.background : "#fff", fontFamily: "Inter_400Regular" }]}
                testID="add-child-name-input"
              />
              <Text style={[cpStyles.tierLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                Age Group
              </Text>
              <View style={cpStyles.tierRow}>
                {AGE_TIERS.map((tier) => (
                  <Pressable
                    key={tier.value}
                    onPress={() => setNewChildTier(tier.value)}
                    style={[
                      cpStyles.tierChip,
                      {
                        backgroundColor: newChildTier === tier.value ? theme.accent + "20" : (isDark ? theme.background : "#F5F0E8"),
                        borderColor: newChildTier === tier.value ? theme.accent : (isDark ? theme.border : "#E0D8C8"),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        cpStyles.tierChipText,
                        {
                          color: newChildTier === tier.value ? theme.accent : theme.textSecondary,
                          fontFamily: newChildTier === tier.value ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {tier.label}
                    </Text>
                    <Text style={[cpStyles.tierChipAges, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {tier.ages}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => {
                  if (!newChildName.trim()) {
                    if (Platform.OS === "web") window.alert("Please enter a name");
                    else Alert.alert("Name required", "Please enter a name for the child.");
                    return;
                  }
                  addChildMutation.mutate();
                }}
                disabled={addChildMutation.isPending}
                style={({ pressed }) => [
                  cpStyles.addSubmitBtn,
                  { backgroundColor: theme.accent, opacity: pressed || addChildMutation.isPending ? 0.7 : 1 },
                ]}
                testID="add-child-submit"
              >
                <Text style={[cpStyles.addSubmitText, { fontFamily: "Inter_600SemiBold" }]}>
                  {addChildMutation.isPending ? "Adding..." : "Add & Start Reading"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const cpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 22 },
  loadingWrap: { padding: 32, alignItems: "center" },
  loadingText: { fontSize: 14 },
  childList: { maxHeight: 350 },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18 },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, marginBottom: 2 },
  childTier: { fontSize: 12 },
  lastBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lastBadgeText: { fontSize: 10 },
  addChildBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 14,
    marginTop: 4,
  },
  addChildText: { fontSize: 14 },
  addForm: { gap: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 14 },
  emptyText: { fontSize: 14, textAlign: "center", marginBottom: 8, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  tierLabel: { fontSize: 13, marginTop: 4 },
  tierRow: { gap: 8 },
  tierChip: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierChipText: { fontSize: 14 },
  tierChipAges: { fontSize: 11 },
  addSubmitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  addSubmitText: { color: "#fff", fontSize: 15 },
});

function LiveNowSection({ theme, isDark }: { theme: typeof Colors.dark; isDark: boolean }) {
  const { data: activeStreams } = useQuery<any[]>({
    queryKey: ["/api/streams/active"],
    refetchInterval: 30000,
  });

  if (!activeStreams || activeStreams.length === 0) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" }} />
        <Text style={{ color: "#FF3B30", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 }}>
          LIVE NOW
        </Text>
      </View>
      {activeStreams.map((stream: any) => (
        <Pressable
          key={stream.id}
          onPress={() => router.push(`/stream/${stream.id}` as any)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE",
            borderRadius: 16,
            padding: 14,
            gap: 12,
            marginBottom: 8,
            opacity: pressed ? 0.85 : 1,
            borderWidth: 1,
            borderColor: "#FF3B3030",
          })}
        >
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#FF3B3015",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="videocam" size={22} color="#FF3B30" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 14, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
              {stream.title}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              {stream.hostDisplayName || "Host"}{stream.groupName ? ` \u00B7 ${stream.groupName}` : ""}
            </Text>
          </View>
          <View style={{
            backgroundColor: "#FF3B30",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
          }}>
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>JOIN</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

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

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface WeeklyStreakData {
  daysRead: boolean[];
  perfectWeeks: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
}

function WeeklyCalendar({ data, theme, isDark }: { data: WeeklyStreakData; theme: typeof Colors.dark; isDark: boolean }) {
  const todayIdx = new Date().getDay();
  return (
    <View style={s.weekRow}>
      {DAY_LABELS.map((label, i) => {
        const isToday = i === todayIdx;
        const didRead = data.daysRead[i];
        return (
          <View key={i} style={s.weekDayCol}>
            <Text style={[s.weekLabel, { color: isToday ? theme.accent : theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {label}
            </Text>
            <View
              style={[
                s.weekDot,
                didRead && s.weekDotFilled,
                isToday && !didRead && { borderColor: theme.accent, borderWidth: 2 },
                didRead && { backgroundColor: theme.accent },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

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

  const lastRead = recentReads?.[0];
  const streak = weeklyData?.currentStreak ?? 0;
  const perfectWeeks = weeklyData?.perfectWeeks ?? 0;

  const hasActivePlan = todayData?.today != null;
  const progress = todayData?.completedCount ?? 0;
  const total = todayData?.totalDays ?? 1;

  const isSabbathMode = sabbath.isSabbath;

  const sabbathBanner = isSabbathMode ? (
    <Pressable
      onPress={() => router.push("/sabbath-experience" as any)}
      style={{
        backgroundColor: theme.accent + "12",
        borderWidth: 1,
        borderColor: theme.accent + "30",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
      testID="sabbath-banner"
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.accent + "20",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Ionicons name="sunny" size={20} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: theme.text,
            fontFamily: "Lora_600SemiBold",
            fontSize: 15,
          }}>
            Sabbath has begun. Enter sacred time.
          </Text>
        </View>
      </View>
      <View style={{
        backgroundColor: theme.accent,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
        marginTop: 12,
      }}>
        <Text style={{
          color: "#fff",
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
        }}>
          Enter Sabbath
        </Text>
      </View>
    </Pressable>
  ) : null;

  const verseSection = (
    <View style={s.verseCardWrap}>
      <ImageBackground
        source={{ uri: bgImage }}
        style={s.verseImageBg}
        imageStyle={s.verseImageStyle}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.8)"]}
          style={s.verseOverlay}
        >
          <View style={s.verseBadge}>
            <View style={s.verseBadgeDot} />
            <Text style={[s.verseBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
              Verse of the Day
            </Text>
          </View>

          <Text style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
            {"\u201C"}{verse.text}{"\u201D"}
          </Text>

          <View style={s.verseFooter}>
            <View>
              <Text style={[s.verseRef, { fontFamily: "Lora_600SemiBold" }]}>
                {verse.reference}
              </Text>
              <Text style={[s.verseTrans, { fontFamily: "Inter_400Regular" }]}>KJV</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );

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

  const continueReadingSection = lastRead ? (
    <Pressable
      onPress={() => router.push(`/read/${lastRead.bookId}/${lastRead.chapter}?translation=${lastRead.translation || "KJV"}`)}
      style={({ pressed }) => [
        s.continueCard,
        { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.85 : 1 },
      ]}
      testID="home-continue-reading"
    >
      <View style={s.continueTop}>
        <LinearGradient
          colors={[theme.accent, theme.accentDark]}
          style={s.continueIcon}
        >
          <Ionicons name="book" size={20} color="#fff" />
        </LinearGradient>
        <View style={s.continueInfo}>
          <Text style={[s.continueLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Continue Reading
          </Text>
          <Text style={[s.continueTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]} numberOfLines={1}>
            {lastRead.bookName} {lastRead.chapter}
          </Text>
        </View>
      </View>
      <View style={s.continueBottom}>
        <Text style={[s.continueHint, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Pick up where you left off
        </Text>
        <Ionicons name="play-circle" size={36} color={theme.accent} />
      </View>
    </Pressable>
  ) : null;

  const guidedToolsSection = (
    <View style={s.guidedRow}>
      <Pressable
        onPress={() => router.push({ pathname: "/(tabs)/study", params: { showIntro: "true" } })}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ["#14172E", "#0D1028"] : ["#1A1F3C", "#141833"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.guidedCard}
        >
          <View style={s.guidedIconWrap}>
            <Ionicons name="layers" size={20} color={theme.accent} />
          </View>
          <Text style={[s.guidedTitle, { fontFamily: "Inter_600SemiBold" }]}>4-Layer Study</Text>
          <Text style={[s.guidedSub, { fontFamily: "Inter_400Regular" }]}>Deep Bible analysis</Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => router.push("/prayer-journal")}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ["#1A1610", "#15120D"] : ["#2E3D1F", "#1B2A12"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.guidedCard}
        >
          <View style={[s.guidedIconWrap, { backgroundColor: "rgba(102,187,106,0.15)" }]}>
            <Ionicons name="journal" size={20} color="#66BB6A" />
          </View>
          <Text style={[s.guidedTitle, { fontFamily: "Inter_600SemiBold" }]}>Prayer Journal</Text>
          <Text style={[s.guidedSub, { fontFamily: "Inter_400Regular" }]}>Your prayer life</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const devotionalSection = (
    <Pressable
      onPress={() => {
        if (hasActivePlan && todayData?.enrollment?.planId) {
          router.push(`/devotional-day?planId=${todayData.enrollment.planId}`);
        } else if (hasActivePlan) {
          router.push("/devotional-day");
        } else {
          router.push("/devotionals");
        }
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={isDark ? ["#1A1610", "#15120D"] : ["#FFF8EC", "#FFFDF6"]}
        style={s.devotionalCard}
      >
        <View style={s.devotionalLeft}>
          <View style={[s.devotionalIconWrap, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="flame" size={22} color={theme.accent} />
          </View>
          <View style={s.devotionalInfo}>
            <Text style={[s.devotionalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {hasActivePlan ? "Continue Your Plan" : "Devotional Plans"}
            </Text>
            <Text style={[s.devotionalSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {hasActivePlan
                ? `Day ${progress} of ${total}`
                : "Guided daily reading"}
            </Text>
          </View>
        </View>
        {hasActivePlan && (
          <View style={s.devotionalProgress}>
            <View style={[s.devotionalProgressTrack, { backgroundColor: isDark ? "#2A2520" : theme.border }]}>
              <LinearGradient
                colors={[theme.accent, theme.accentDark]}
                style={[s.devotionalProgressFill, { width: `${Math.min((progress / total) * 100, 100)}%` as any }]}
              />
            </View>
          </View>
        )}
        {!hasActivePlan && (
          <Ionicons name="chevron-forward" size={20} color={theme.accent} />
        )}
      </LinearGradient>
    </Pressable>
  );

  const worshipPathwaysSection = (
    <>
      <LiveNowSection theme={theme} isDark={isDark} />
    </>
  );

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
        <View>
          <Text style={[s.greeting, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {greeting}
          </Text>
          <Text style={[s.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Grace through Faith
          </Text>
          <Text style={[s.headerTagline, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            Adventist Spiritual Formation
          </Text>
        </View>
        <View>
          {showTooltip && (
            <View style={[s.tooltip, { backgroundColor: theme.accent }]}>
              <Text style={s.tooltipText}>Switch to Kids Mode</Text>
              <View style={[s.tooltipArrow, { borderTopColor: theme.accent }]} />
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
          {sabbathBanner}
          {worshipPathwaysSection}
          <GoldDivider theme={theme} />
          <SpiritualRings theme={theme} isDark={isDark} />
          {continueReadingSection}
          {guidedToolsSection}
          {devotionalSection}
          {verseSection}
        </>
      ) : (
        <>
          {verseSection}
          <SpiritualRings theme={theme} isDark={isDark} />
          {continueReadingSection}
          {guidedToolsSection}
          {devotionalSection}
          <GoldDivider theme={theme} />
          {worshipPathwaysSection}
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
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
  headerTitle: { fontSize: 26, letterSpacing: -0.3, marginBottom: 2 },
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
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  tooltip: {
    position: "absolute",
    bottom: "100%" as any,
    right: 0,
    marginBottom: 8,
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
    bottom: -6,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  verseCardWrap: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
  },
  verseImageBg: {
    width: "100%",
    minHeight: 280,
  },
  verseImageStyle: {
    borderRadius: 22,
  },
  verseOverlay: {
    flex: 1,
    padding: 24,
    paddingTop: 28,
    justifyContent: "flex-end",
    minHeight: 280,
  },
  verseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  verseBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9933A",
  },
  verseBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  verseText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 32,
    marginBottom: 20,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  verseRef: { color: "#C9933A", fontSize: 16, marginBottom: 2 },
  verseTrans: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
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
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  weekDayCol: {
    alignItems: "center",
    gap: 8,
  },
  weekLabel: { fontSize: 12 },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  weekDotFilled: {
    alignItems: "center",
    justifyContent: "center",
  },
  continueCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },
  continueTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  continueIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueInfo: { flex: 1 },
  continueLabel: { fontSize: 12, marginBottom: 3 },
  continueTitle: { fontSize: 19 },
  continueBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201,147,58,0.15)",
  },
  continueHint: { fontSize: 13, lineHeight: 19 },
  guidedRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  guidedCard: {
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  guidedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(201,147,58,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  guidedTitle: { color: "#fff", fontSize: 15 },
  guidedSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 18 },
  devotionalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  devotionalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  devotionalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  devotionalInfo: { flex: 1 },
  devotionalTitle: { fontSize: 16, marginBottom: 2 },
  devotionalSub: { fontSize: 13, lineHeight: 19 },
  devotionalProgress: { width: 56, marginLeft: 12 },
  devotionalProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  devotionalProgressFill: {
    height: 6,
    borderRadius: 3,
  },
});
