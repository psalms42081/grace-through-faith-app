import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { KidsColors } from "@/constants/colors";
import { useKidsMode } from "@/context/KidsModeContext";

interface ProgressItem {
  id: string;
  storyId: string;
  completed: boolean;
  quizScore: number | null;
  memoryVerseMemorized: boolean;
  completedAt: string | null;
}

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  requirement: string | null;
  requiredCount: number;
}

interface EarnedBadge extends Badge {
  earnedAt: string;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

function AnimatedSection({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500).springify()}>
      {children}
    </Animated.View>
  );
}

function PulsingStarCard({ totalStars, theme }: { totalStars: number; theme: any }) {
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.starCard, { backgroundColor: theme.starGold || theme.accent }]}>
      <Animated.View style={[styles.starGlowOverlay, glowStyle]} />
      <Ionicons name="star" size={44} color="#fff" />
      <Text style={[styles.starCount, { fontFamily: "Lora_700Bold" }]}>{totalStars}</Text>
      <Text style={[styles.starLabel, { fontFamily: "Inter_500Medium" }]}>Total Stars</Text>
    </Animated.View>
  );
}

function AnimatedFlameIcon() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={wobbleStyle}>
      <Ionicons name="flame" size={24} color="#FF6B35" />
    </Animated.View>
  );
}

function AnimatedBadgeItem({
  badge,
  earned,
  theme,
  BADGE_ICONS,
}: {
  badge: Badge;
  earned: boolean;
  theme: any;
  BADGE_ICONS: Record<string, string>;
}) {
  const scale = useSharedValue(earned ? 0.95 : 1);

  useEffect(() => {
    if (earned) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.98, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [earned]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badgeItem,
        scaleStyle,
        {
          backgroundColor: earned ? theme.accent + "15" : theme.backgroundCard,
          borderColor: earned ? theme.accent : theme.border,
        },
      ]}
    >
      <View style={[styles.badgeIconCircle, { backgroundColor: earned ? theme.accent + "20" : theme.border + "60" }]}>
        <Ionicons
          name={(BADGE_ICONS[badge.icon || "star"] || "star") as any}
          size={28}
          color={earned ? theme.accent : theme.textMuted}
        />
      </View>
      <Text
        style={[
          styles.badgeName,
          {
            color: earned ? theme.text : theme.textMuted,
            fontFamily: "Inter_600SemiBold",
          },
        ]}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      {badge.description && (
        <Text
          style={[styles.badgeDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
          numberOfLines={2}
        >
          {badge.description}
        </Text>
      )}
      {earned && (
        <Ionicons name="checkmark-circle" size={16} color={theme.success} style={{ marginTop: 4 }} />
      )}
    </Animated.View>
  );
}

export default function KidsStarsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? KidsColors.dark : KidsColors.light;
  const insets = useSafeAreaInsets();
  const { exitKidsMode, pin } = useKidsMode();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAttempt, setPinAttempt] = useState("");
  const [pinError, setPinError] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: progress, isLoading: loadingProgress } = useQuery<ProgressItem[]>({
    queryKey: ["/api/kids/progress/guest"],
  });

  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: ["/api/kids/badges"],
  });

  const { data: earnedBadges } = useQuery<EarnedBadge[]>({
    queryKey: ["/api/kids/badges/guest"],
  });

  const { data: streak } = useQuery<StreakInfo>({
    queryKey: ["/api/kids/streak/guest"],
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;
  const quizCount = progress?.filter(p => p.quizScore !== null).length ?? 0;
  const memorizedCount = progress?.filter(p => p.memoryVerseMemorized).length ?? 0;
  const totalStars = completedCount + quizCount + (memorizedCount * 2);
  const earnedIds = new Set(earnedBadges?.map(b => b.id) ?? []);

  const BADGE_ICONS: Record<string, string> = {
    "footsteps": "footsteps",
    "bookmark": "bookmark",
    "compass": "compass",
    "book": "book",
    "trophy": "trophy",
    "star": "star",
    "ribbon": "ribbon",
    "shield": "shield",
  };

  const handleExitKidsMode = async () => {
    if (!pin) {
      await exitKidsMode("");
      return;
    }
    setShowPinModal(true);
    setPinAttempt("");
    setPinError(false);
  };

  const handlePinSubmit = async () => {
    const success = await exitKidsMode(pinAttempt);
    if (!success) {
      setPinError(true);
      setPinAttempt("");
    } else {
      setShowPinModal(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          My Stars
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection index={0}>
          <PulsingStarCard totalStars={totalStars} theme={theme} />
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons name="book" size={22} color={theme.accent} />
              </View>
              <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Stories</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons name="help-circle" size={22} color={theme.accent} />
              </View>
              <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{quizCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Quizzes</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons name="bookmark" size={22} color={theme.accent} />
              </View>
              <Text style={[styles.statNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{memorizedCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>Verses</Text>
            </View>
          </View>
        </AnimatedSection>

        {streak && (
          <AnimatedSection index={2}>
            <View style={[styles.streakCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
              <View style={styles.streakHeader}>
                <AnimatedFlameIcon />
                <Text style={[styles.streakTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Reading Streak
                </Text>
              </View>
              <View style={styles.streakStats}>
                <View style={styles.streakStatItem}>
                  <Text style={[styles.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                    {streak.currentStreak}
                  </Text>
                  <Text style={[styles.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Current
                  </Text>
                </View>
                <View style={[styles.streakDivider, { backgroundColor: theme.border }]} />
                <View style={styles.streakStatItem}>
                  <Text style={[styles.streakNum, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                    {streak.longestStreak}
                  </Text>
                  <Text style={[styles.streakLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Best
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedSection>
        )}

        <AnimatedSection index={3}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Badges
          </Text>
        </AnimatedSection>

        <AnimatedSection index={4}>
          <View style={styles.badgeGrid}>
            {allBadges?.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <AnimatedBadgeItem
                  key={badge.id}
                  badge={badge}
                  earned={earned}
                  theme={theme}
                  BADGE_ICONS={BADGE_ICONS}
                />
              );
            })}
          </View>
        </AnimatedSection>

        <AnimatedSection index={5}>
          <Pressable
            onPress={handleExitKidsMode}
            style={styles.exitBtn}
            testID="exit-kids-mode"
          >
            <Ionicons name="log-out-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.exitBtnText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Switch to Adult Mode
            </Text>
          </Pressable>
        </AnimatedSection>
      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.pinOverlay}>
          <View style={[styles.pinModal, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[styles.pinTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              Enter PIN
            </Text>
            <Text style={[styles.pinDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              A parent or guardian must enter the PIN to exit Kids Club.
            </Text>
            <TextInput
              style={[styles.pinInput, { color: theme.text, borderColor: pinError ? "#E74C3C" : theme.border, backgroundColor: theme.background }]}
              value={pinAttempt}
              onChangeText={(t) => { setPinAttempt(t); setPinError(false); }}
              placeholder="Enter PIN"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              testID="pin-input"
            />
            {pinError && (
              <Text style={[styles.pinErrorText, { fontFamily: "Inter_500Medium" }]}>
                Incorrect PIN. Please try again.
              </Text>
            )}
            <View style={styles.pinButtons}>
              <Pressable
                onPress={() => setShowPinModal(false)}
                style={[styles.pinBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.pinBtnText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handlePinSubmit}
                style={[styles.pinBtn, styles.pinBtnPrimary, { backgroundColor: theme.accent }]}
                testID="pin-submit"
              >
                <Text style={[styles.pinBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  starCard: {
    alignItems: "center",
    paddingVertical: 32,
    borderRadius: 22,
    marginTop: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  starGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 22,
  },
  starCount: { fontSize: 48, color: "#fff", marginTop: 6 },
  starLabel: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statNum: { fontSize: 22, marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2 },
  streakCard: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  streakHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  streakTitle: { fontSize: 16 },
  streakStats: { flexDirection: "row", alignItems: "center" },
  streakStatItem: { flex: 1, alignItems: "center" },
  streakNum: { fontSize: 28 },
  streakLabel: { fontSize: 12, marginTop: 2 },
  streakDivider: { width: 1, height: 40 },
  sectionTitle: { fontSize: 14, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  badgeItem: {
    width: "47%" as any,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  badgeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: { fontSize: 13, marginTop: 8, textAlign: "center" },
  badgeDesc: { fontSize: 11, marginTop: 4, textAlign: "center", lineHeight: 15 },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 20,
    opacity: 0.6,
  },
  exitBtnText: { fontSize: 12 },
  pinOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  pinModal: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  pinTitle: { fontSize: 20, marginBottom: 8 },
  pinDesc: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  pinInput: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 8,
  },
  pinErrorText: { color: "#E74C3C", fontSize: 13, marginBottom: 8 },
  pinButtons: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  pinBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  pinBtnPrimary: { borderWidth: 0 },
  pinBtnText: { fontSize: 15 },
});
