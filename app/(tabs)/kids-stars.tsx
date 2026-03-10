import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
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
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
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

interface ProfileStats {
  totalPoints: number;
  currentLevel: number;
  name: string | null;
}

import AnimatedSection from "@/components/AnimatedSection";

function StarCardSparkle({ index, color }: { index: number; color: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const angle = (index * 72) * (Math.PI / 180);
    const startDelay = 400 + index * 120;
    scale.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withSpring(1.2, { damping: 5, stiffness: 160 }),
          withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 200 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      )
    );
  }, []);

  const angle = (index * 72) * (Math.PI / 180);
  const radius = 55;
  const animStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    left: Math.cos(angle) * radius,
    top: Math.sin(angle) * radius,
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="sparkles" size={12} color={color} />
    </Animated.View>
  );
}

function AnimatedStarCount({ target }: { target: number }) {
  const [displayVal, setDisplayVal] = useState(0);
  const animProgress = useSharedValue(0);
  const prevRef = useRef(0);

  useEffect(() => {
    prevRef.current = displayVal;
    animProgress.value = 0;
    animProgress.value = withTiming(1, {
      duration: Math.min(900, Math.max(400, Math.abs(target - prevRef.current) * 50)),
      easing: Easing.out(Easing.cubic),
    });
  }, [target]);

  const updateVal = React.useCallback((v: number) => {
    setDisplayVal(Math.round(v));
  }, []);

  useAnimatedStyle(() => {
    const current = interpolate(
      animProgress.value,
      [0, 1],
      [prevRef.current, target]
    );
    runOnJS(updateVal)(current);
    return {};
  });

  return (
    <Text style={[styles.starCount, { fontFamily: "Lora_700Bold" }]}>{displayVal}</Text>
  );
}

function PulsingStarCard({ totalStars, seedPoints, theme }: { totalStars: number; seedPoints: number; theme: any }) {
  const glowOpacity = useSharedValue(0.6);
  const starScale = useSharedValue(0.8);
  const countScale = useSharedValue(0.5);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    starScale.value = withSequence(
      withSpring(1.2, { damping: 6, stiffness: 140 }),
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    countScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.15, { damping: 6, stiffness: 150 }),
        withSpring(1, { damping: 10, stiffness: 130 })
      )
    );
  }, [totalStars]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const starIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  return (
    <Animated.View style={[styles.starCard, { backgroundColor: theme.starGold || theme.accent }]}>
      <Animated.View style={[styles.starGlowOverlay, glowStyle]} />
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={starIconStyle}>
          <Ionicons name="star" size={44} color="#fff" />
        </Animated.View>
        {[0, 1, 2, 3, 4].map((i) => (
          <StarCardSparkle key={i} index={i} color="rgba(255,255,255,0.7)" />
        ))}
      </View>
      <Animated.View style={countStyle}>
        <AnimatedStarCount target={totalStars} />
      </Animated.View>
      <Text style={[styles.starLabel, { fontFamily: "Inter_500Medium" }]}>Total Stars</Text>
      {seedPoints > 0 && (
        <Text style={[styles.seedPointsLabel, { fontFamily: "Inter_400Regular" }]}>
          {seedPoints} Seed Points earned
        </Text>
      )}
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

function BadgeStarburst({ earned, color }: { earned: boolean; color: string }) {
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);

  useEffect(() => {
    if (earned) {
      burstScale.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(1.6, { duration: 800, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 100 })
          ),
          -1,
          false
        )
      );
      burstOpacity.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(0.6, { duration: 200 }),
            withTiming(0, { duration: 700 })
          ),
          -1,
          false
        )
      );
    }
  }, [earned]);

  const burstStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: color,
    transform: [{ scale: burstScale.value }],
    opacity: burstOpacity.value,
  }));

  if (!earned) return null;
  return <Animated.View style={burstStyle} />;
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
  const glowOpacity = useSharedValue(0);

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
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [earned]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.accent,
    borderRadius: 18,
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.badgeItem,
        scaleStyle,
        {
          backgroundColor: earned ? theme.accent + "15" : theme.backgroundCard,
          borderColor: earned ? theme.accent : theme.border,
          overflow: "hidden" as const,
        },
      ]}
    >
      {earned && <Animated.View style={glowStyle} />}
      <View style={[styles.badgeIconCircle, { backgroundColor: earned ? theme.accent + "20" : theme.border + "60", alignItems: "center", justifyContent: "center" }]}>
        <BadgeStarburst earned={earned} color={theme.accent} />
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
  const { theme, isDark } = useTheme(true);
  const insets = useSafeAreaInsets();
  const { exitKidsMode, pin, activeChildProfileId } = useKidsMode();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAttempt, setPinAttempt] = useState("");
  const [pinError, setPinError] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const progressUserId = activeChildProfileId || "guest";

  const { data: progress, isLoading: loadingProgress } = useQuery<ProgressItem[]>({
    queryKey: [`/api/kids/progress?_uid=${progressUserId}`],
  });

  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: ["/api/kids/badges"],
    staleTime: 0,
  });

  const { data: earnedBadges } = useQuery<EarnedBadge[]>({
    queryKey: [`/api/kids/badges/earned?_uid=${progressUserId}`],
  });

  const { data: streak } = useQuery<StreakInfo>({
    queryKey: [`/api/kids/streak?_uid=${progressUserId}`],
  });

  const { data: profileStats } = useQuery<ProfileStats>({
    queryKey: [`/api/kids/profile/stats?_uid=${progressUserId}`],
    enabled: progressUserId !== "guest",
  });

  const completedCount = progress?.filter(p => p.completed).length ?? 0;
  const quizCount = progress?.filter(p => p.quizScore !== null).length ?? 0;
  const memorizedCount = progress?.filter(p => p.memoryVerseMemorized).length ?? 0;
  const seedPoints = profileStats?.totalPoints ?? 0;
  const totalStars = completedCount + quizCount + (memorizedCount * 2);
  const earnedNames = useMemo(() => new Set(earnedBadges?.map(b => b.name) ?? []), [earnedBadges]);
  const earnedIds = useMemo(() => new Set(earnedBadges?.map(b => b.id) ?? []), [earnedBadges]);

  const dedupedBadges = useMemo(() => {
    if (!allBadges) return [];
    const seen = new Set<string>();
    return allBadges
      .filter(b => {
        if (seen.has(b.name)) return false;
        seen.add(b.name);
        return true;
      })
      .sort((a, b) => {
        const aEarned = (earnedIds.has(a.id) || earnedNames.has(a.name)) ? 0 : 1;
        const bEarned = (earnedIds.has(b.id) || earnedNames.has(b.name)) ? 0 : 1;
        return aEarned - bEarned;
      });
  }, [allBadges, earnedIds, earnedNames]);

  const BADGE_ICONS: Record<string, string> = {
    "footsteps": "footsteps",
    "footprints": "footsteps",
    "bookmark": "bookmark",
    "compass": "compass",
    "book": "book",
    "brain": "bulb",
    "trophy": "trophy",
    "star": "star",
    "ribbon": "ribbon",
    "shield": "shield",
    "flame": "flame",
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
        <AnimatedSection index={0} delayMultiplier={100}>
          <PulsingStarCard totalStars={totalStars} seedPoints={seedPoints} theme={theme} />
        </AnimatedSection>

        <AnimatedSection index={1} delayMultiplier={100}>
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
          <AnimatedSection index={2} delayMultiplier={100}>
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

        <AnimatedSection index={3} delayMultiplier={100}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            Badges
          </Text>
        </AnimatedSection>

        <AnimatedSection index={4} delayMultiplier={100}>
          <View style={styles.badgeGrid}>
            {dedupedBadges.map((badge) => {
              const earned = earnedIds.has(badge.id) || earnedNames.has(badge.name);
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

        <AnimatedSection index={5} delayMultiplier={100}>
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
  seedPointsLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 },
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
