import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBlock({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.6]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.08)",
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function VerseCardSkeleton() {
  return (
    <View style={sk.verseCard}>
      <SkeletonBlock height={12} width={120} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={14} width="100%" style={{ marginBottom: 8 }} />
      <SkeletonBlock height={14} width="90%" style={{ marginBottom: 8 }} />
      <SkeletonBlock height={14} width="70%" style={{ marginBottom: 16 }} />
      <SkeletonBlock height={12} width={100} />
    </View>
  );
}

export function BannerCardSkeleton() {
  return (
    <View style={sk.bannerCard}>
      <SkeletonBlock height={20} width={140} style={{ marginBottom: 8 }} />
      <SkeletonBlock height={14} width={200} />
    </View>
  );
}

export function SpeakerCardSkeleton() {
  return (
    <View style={sk.speakerCard}>
      <SkeletonBlock width={56} height={56} borderRadius={28} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock height={16} width={140} />
        <SkeletonBlock height={12} width={100} />
      </View>
    </View>
  );
}

export function SermonCardSkeleton() {
  return (
    <View style={sk.sermonCard}>
      <SkeletonBlock height={180} borderRadius={12} style={{ marginBottom: 12 }} />
      <SkeletonBlock height={14} width="80%" style={{ marginBottom: 6 }} />
      <SkeletonBlock height={12} width="50%" />
    </View>
  );
}

export function StudyCardSkeleton() {
  return (
    <View style={sk.studyCard}>
      <SkeletonBlock height={14} width={100} style={{ marginBottom: 16 }} />
      <BannerCardSkeleton />
      <BannerCardSkeleton />
      <BannerCardSkeleton />
    </View>
  );
}

export function ContentLoadingMessage({ message }: { message: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 1.0]),
  }));

  return (
    <Animated.Text
      style={[
        {
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
          fontFamily: "Inter_400Regular",
          textAlign: "center" as const,
          paddingVertical: 24,
        },
        animatedStyle,
      ]}
    >
      {message}
    </Animated.Text>
  );
}

export function LoadingTimeout({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={sk.timeoutContainer}>
      <Animated.Text style={sk.timeoutText}>{message}</Animated.Text>
      <Animated.Text style={sk.retryButton} onPress={onRetry}>
        Try again
      </Animated.Text>
    </View>
  );
}

export { SkeletonBlock };

const sk = StyleSheet.create({
  verseCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    height: 200,
    justifyContent: "center",
  },
  bannerCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    height: 100,
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  speakerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    marginBottom: 10,
  },
  sermonCard: {
    marginBottom: 16,
  },
  studyCard: {
    gap: 8,
    marginBottom: 20,
  },
  timeoutContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  timeoutText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryButton: {
    color: "#C9933A",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
});
