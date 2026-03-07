import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
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

const RING_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  study: "book",
  prayer: "hand-left",
  engage: "sparkles",
};

const SIZE = 160;
const STROKE_WIDTH = 14;
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

function RingLabel({
  ring,
  colorKey,
  theme,
}: {
  ring: RingData;
  colorKey: keyof typeof RING_COLORS;
  theme: typeof Colors.dark;
}) {
  const progress = Math.min(ring.current / ring.goal, 1);
  const isClosed = ring.current >= ring.goal;
  return (
    <View style={styles.ringLabelRow}>
      <View style={[styles.ringDot, { backgroundColor: RING_COLORS[colorKey].main }]} />
      <Ionicons
        name={RING_ICONS[colorKey]}
        size={14}
        color={RING_COLORS[colorKey].main}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.ringLabelText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
        {ring.label}
      </Text>
      <Text
        style={[
          styles.ringLabelValue,
          { color: isClosed ? RING_COLORS[colorKey].main : theme.textMuted, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {ring.current}/{ring.goal}
      </Text>
      {isClosed && (
        <Ionicons name="checkmark-circle" size={14} color={RING_COLORS[colorKey].main} />
      )}
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
  const middleR = outerR - STROKE_WIDTH - 3;
  const innerR = middleR - STROKE_WIDTH - 3;

  return (
    <>
    <FeatureTutorial tutorialId="spiritual-rings" steps={SPIRITUAL_RINGS_TUTORIAL_STEPS} />
    <View style={[styles.card, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Daily Formation
        </Text>
        {allClosed && (
          <View style={[styles.completeBadge, { backgroundColor: "rgba(78,204,163,0.12)" }]}>
            <Ionicons name="checkmark-done" size={14} color="#4ECCA3" />
            <Text style={[styles.completeText, { fontFamily: "Inter_600SemiBold" }]}>Complete</Text>
          </View>
        )}
      </View>

      <View style={styles.ringsRow}>
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
              <Ionicons name="checkmark-done-circle" size={28} color="#4ECCA3" />
            ) : (
              <>
                <Ionicons name="flame" size={22} color={theme.accent} />
                <Text style={[styles.centerPercent, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {Math.round(((studyProgress + prayerProgress + engageProgress) / 3) * 100)}%
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.labelsCol}>
          <RingLabel ring={study} colorKey="study" theme={theme} />
          <RingLabel ring={prayer} colorKey="prayer" theme={theme} />
          <RingLabel ring={engage} colorKey="engage" theme={theme} />

          <View style={[styles.tipBox, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
            <Ionicons name="bulb-outline" size={12} color={theme.accent} />
            <Text style={[styles.tipText, { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)", fontFamily: "Inter_400Regular" }]}>
              {study.current < study.goal
                ? "Read a chapter to grow your study ring"
                : prayer.current < prayer.goal
                ? "Add a prayer to close your prayer ring"
                : engage.current < engage.goal
                ? "Write a journal entry to close engage"
                : "All rings closed! Great discipline today"}
            </Text>
          </View>
        </View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontSize: 18 },
  completeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  completeText: { color: "#4ECCA3", fontSize: 12 },
  ringsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
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
  centerPercent: { fontSize: 16 },
  labelsCol: {
    flex: 1,
    gap: 8,
  },
  ringLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ringLabelText: { fontSize: 12, flex: 1 },
  ringLabelValue: { fontSize: 12 },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  tipText: { fontSize: 11, lineHeight: 16, flex: 1 },
});
