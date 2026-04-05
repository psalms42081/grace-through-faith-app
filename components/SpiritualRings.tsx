import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Image, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import FeatureTutorial from "@/components/FeatureTutorial";
import { SPIRITUAL_RINGS_TUTORIAL_STEPS } from "@/lib/tutorial-steps";
import { useTutorial } from "@/contexts/TutorialContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingData {
  current: number;
  goal: number;
  label: string;
}

interface SpiritualRingsData {
  study: RingData;
  prayer: RingData;
  engage: RingData;
}

const RING_COLORS = {
  study: { main: "#5B8DEF", dim: "rgba(91,141,239,0.15)" },
  prayer: { main: "#4ECCA3", dim: "rgba(78,204,163,0.15)" },
  engage: { main: "#E8A838", dim: "rgba(232,168,56,0.15)" },
};

const RING_IMAGES: Record<string, any> = {
  study: require("@/assets/home-cards/ring-study.png"),
  prayer: require("@/assets/home-cards/ring-prayer.png"),
  engage: require("@/assets/home-cards/ring-engage.png"),
};

const SIZE = 190;
const STROKE_WIDTH = 16;
const CENTER = SIZE / 2;

function AnimatedRing({
  radius,
  progress,
  color,
  bgColor,
}: {
  radius: number;
  progress: number;
  color: string;
  bgColor: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 1.15), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <>
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        stroke={bgColor}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <AnimatedCircle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
    </>
  );
}

function StatCard({
  ring,
  colorKey,
  theme,
  isDark,
}: {
  ring: RingData;
  colorKey: keyof typeof RING_COLORS;
  theme: typeof Colors.dark;
  isDark: boolean;
}) {
  const isClosed = ring.current >= ring.goal;
  const color = RING_COLORS[colorKey].main;
  const progress = ring.goal > 0 ? Math.min(ring.current / ring.goal, 1) : 0;

  return (
    <View style={[styles.statCard, { borderColor: color + "25" }]}>
      <LinearGradient
        colors={[color + "12", color + "06"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCardInner}
      >
        <View style={styles.statCardHeader}>
          <View style={styles.thumbWrap}>
            <Image
              source={RING_IMAGES[colorKey]}
              style={[styles.statThumb, { borderColor: color + "60" }]}
              resizeMode="cover"
            />
            {isClosed && (
              <View style={[styles.thumbCheck, { backgroundColor: color }]}>
                <Ionicons name="checkmark" size={8} color="#fff" />
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            style={[styles.statLabel, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
          >
            {ring.label}
          </Text>
        </View>
        <View style={styles.statValueRow}>
          <Text style={[styles.statCurrent, { color, fontFamily: "Inter_700Bold" }]}>
            {ring.current}
          </Text>
          <Text style={[styles.statDivider, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            /
          </Text>
          <Text style={[styles.statGoal, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
            {ring.goal}
          </Text>
        </View>
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${progress * 100}%` as any, backgroundColor: color }]} />
        </View>
      </LinearGradient>
    </View>
  );
}

export default function SpiritualRings({
  theme,
  isDark,
}: {
  theme: typeof Colors.dark;
  isDark: boolean;
}) {
  const { userId } = useAuth();
  const { hasSeenTutorial, isLoaded: tutorialLoaded } = useTutorial();
  const [tutorialActivated, setTutorialActivated] = useState(false);

  const handleCardPress = () => {
    if (tutorialLoaded && !hasSeenTutorial("spiritual-rings") && !tutorialActivated) {
      setTutorialActivated(true);
    }
  };

  const { data } = useQuery<SpiritualRingsData>({
    queryKey: [`/api/spiritual-rings?userId=${userId}`],
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const study = data?.study ?? { current: 0, goal: 3, label: "Study" };
  const prayer = data?.prayer ?? { current: 0, goal: 2, label: "Prayer" };
  const engage = data?.engage ?? { current: 0, goal: 2, label: "Engage" };

  const studyProgress = study.current / study.goal;
  const prayerProgress = prayer.current / prayer.goal;
  const engageProgress = engage.current / engage.goal;

  const allClosed = study.current >= study.goal && prayer.current >= prayer.goal && engage.current >= engage.goal;

  const outerR = (SIZE - STROKE_WIDTH) / 2;
  const middleR = outerR - STROKE_WIDTH - 4;
  const innerR = middleR - STROKE_WIDTH - 4;

  return (
    <>
    {tutorialActivated && (
      <FeatureTutorial tutorialId="spiritual-rings" steps={SPIRITUAL_RINGS_TUTORIAL_STEPS} />
    )}
    <Pressable onPress={handleCardPress} style={styles.card}>
      <ImageBackground
        source={require("@/assets/home-cards/pray.png")}
        style={styles.bgImage}
        imageStyle={styles.bgImageInner}
        resizeMode="cover"
      >
        <LinearGradient
          colors={isDark
            ? ["rgba(5,5,7,0.58)", "rgba(5,5,7,0.42)", "rgba(5,5,7,0.58)"]
            : ["rgba(255,253,246,0.88)", "rgba(255,248,237,0.78)", "rgba(255,245,230,0.88)"]
          }
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerDot} />
              <Text style={[styles.headerLabel, { fontFamily: "Inter_500Medium" }]}>
                Daily Formation
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
              Close Your Rings
            </Text>
            {allClosed && (
              <View style={[styles.completeBadge, { backgroundColor: "rgba(78,204,163,0.12)" }]}>
                <Ionicons name="checkmark-done" size={14} color="#4ECCA3" />
                <Text style={[styles.completeText, { fontFamily: "Inter_600SemiBold" }]}>Complete</Text>
              </View>
            )}
          </View>

          <View style={styles.ringsCenter}>
            <View style={styles.ringsGlowWrap}>
              <View style={styles.svgContainer}>
                <Svg width={SIZE} height={SIZE}>
                  <AnimatedRing
                    radius={outerR}
                    progress={studyProgress}
                    color={RING_COLORS.study.main}
                    bgColor={RING_COLORS.study.dim}
                  />
                  <AnimatedRing
                    radius={middleR}
                    progress={prayerProgress}
                    color={RING_COLORS.prayer.main}
                    bgColor={RING_COLORS.prayer.dim}
                  />
                  <AnimatedRing
                    radius={innerR}
                    progress={engageProgress}
                    color={RING_COLORS.engage.main}
                    bgColor={RING_COLORS.engage.dim}
                  />
                </Svg>

                <View style={styles.centerContent}>
                  {allClosed ? (
                    <Ionicons name="checkmark-done-circle" size={36} color="#4ECCA3" />
                  ) : studyProgress + prayerProgress + engageProgress === 0 ? (
                    <>
                      <Ionicons name="flame-outline" size={28} color={theme.accent} />
                      <Text style={[styles.centerStart, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                        Start{"\n"}today
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="flame" size={30} color={theme.accent} />
                      <Text style={[styles.centerPercent, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                        {Math.round(((studyProgress + prayerProgress + engageProgress) / 3) * 100)}%
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard ring={study} colorKey="study" theme={theme} isDark={isDark} />
            <StatCard ring={prayer} colorKey="prayer" theme={theme} isDark={isDark} />
            <StatCard ring={engage} colorKey="engage" theme={theme} isDark={isDark} />
          </View>

          <LinearGradient
            colors={isDark ? ["rgba(201,147,58,0.1)", "rgba(201,147,58,0.04)"] : ["rgba(201,147,58,0.08)", "rgba(201,147,58,0.03)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.tipBox, { borderWidth: 1, borderColor: "rgba(201,147,58,0.15)" }]}
          >
            <Ionicons name="bulb-outline" size={14} color="#C9933A" />
            <Text style={[styles.tipText, { color: isDark ? "rgba(245,240,232,0.55)" : "rgba(80,60,30,0.65)", fontFamily: "Inter_400Regular" }]}>
              {study.current < study.goal
                ? "Scripture renews the mind. Read a chapter to grow your study ring."
                : prayer.current < prayer.goal
                ? "Prayer strengthens trust. Add a prayer to grow your prayer ring."
                : engage.current < engage.goal
                ? "Faith grows through action. Complete a study to grow your engage ring."
                : "All rings closed! Great discipline today."}
            </Text>
          </LinearGradient>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  bgImage: {
    width: "100%",
  },
  bgImageInner: {
    borderRadius: 20,
    opacity: 0.45,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 22,
  },
  headerRow: {
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9933A",
  },
  headerLabel: {
    fontSize: 11,
    color: "#C9933A",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  title: { fontSize: 22 },
  completeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  completeText: { color: "#4ECCA3", fontSize: 12 },
  ringsCenter: {
    alignItems: "center",
    marginBottom: 20,
  },
  ringsGlowWrap: {
    padding: 16,
    borderRadius: SIZE / 2 + 16,
    backgroundColor: "rgba(201,147,58,0.04)",
    borderWidth: 1,
    borderColor: "rgba(201,147,58,0.08)",
  },
  svgContainer: {
    width: SIZE,
    height: SIZE,
    position: "relative",
  },
  centerContent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  centerPercent: { fontSize: 22 },
  centerStart: { fontSize: 14, textAlign: "center" as const, lineHeight: 18 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  statCardInner: {
    padding: 10,
    borderRadius: 13,
    gap: 6,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  thumbWrap: {
    position: "relative",
  },
  statThumb: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  thumbCheck: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  statLabel: { fontSize: 11, flex: 1 },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    paddingLeft: 2,
  },
  statCurrent: { fontSize: 24 },
  statDivider: { fontSize: 16 },
  statGoal: { fontSize: 16 },
  miniProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 4,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: 3,
    borderRadius: 2,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  tipText: { fontSize: 13, lineHeight: 19, flex: 1 },
});
