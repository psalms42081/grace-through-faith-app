import React from "react";
import { View, Image, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";
import { useEffect } from "react";
import { PIONEERS } from "@/constants/pioneers";
import type { Pioneer } from "@/constants/pioneers";

interface PioneerPortraitProps {
  pioneerId: string;
  size?: number;
  isSpeaking?: boolean;
  onPress?: () => void;
  testID?: string;
}

export default function PioneerPortrait({
  pioneerId,
  size = 56,
  isSpeaking = false,
  onPress,
  testID,
}: PioneerPortraitProps) {
  const pioneer = PIONEERS.find((p) => p.id === pioneerId);
  const photoSource = pioneer?.photoAsset ?? PIONEERS[0].photoAsset;

  const glowOpacity = useSharedValue(0.3);
  const glowScale = useSharedValue(1);
  const ringPulse1 = useSharedValue(0);
  const ringPulse2 = useSharedValue(0);
  const faceSway = useSharedValue(0);
  const faceBreath = useSharedValue(0);

  useEffect(() => {
    faceBreath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    if (isSpeaking) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      ringPulse1.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      ringPulse2.value = withDelay(
        800,
        withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );
      faceSway.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      glowOpacity.value = withTiming(0.3, { duration: 400 });
      glowScale.value = withTiming(1, { duration: 400 });
      cancelAnimation(ringPulse1);
      cancelAnimation(ringPulse2);
      ringPulse1.value = 0;
      ringPulse2.value = 0;
      faceSway.value = withTiming(0, { duration: 400 });
    }
    return () => {
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
      cancelAnimation(ringPulse1);
      cancelAnimation(ringPulse2);
      cancelAnimation(faceSway);
      cancelAnimation(faceBreath);
    };
  }, [isSpeaking]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: size + 24,
    height: size + 24,
    borderRadius: (size + 24) / 2,
    borderWidth: 1.5,
    borderColor: `rgba(201,147,58,${interpolate(ringPulse1.value, [0, 1], [0.5, 0])})`,
    transform: [{ scale: interpolate(ringPulse1.value, [0, 1], [1, 1.5]) }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    width: size + 24,
    height: size + 24,
    borderRadius: (size + 24) / 2,
    borderWidth: 1,
    borderColor: `rgba(201,147,58,${interpolate(ringPulse2.value, [0, 1], [0.3, 0])})`,
    transform: [{ scale: interpolate(ringPulse2.value, [0, 1], [1, 1.8]) }],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(faceSway.value, [-1, 0, 1], [-1.5, 0, 1.5]) },
      { translateY: interpolate(faceBreath.value, [0, 1], [0, -1.5]) },
      { scale: interpolate(faceBreath.value, [0, 1], [1, 1.02]) },
    ],
  }));

  const borderRadius = size / 2;

  return (
    <Pressable onPress={onPress} testID={testID}>
      <View style={[styles.container, { width: size + 24, height: size + 24 }]}>
        {isSpeaking && <Animated.View style={ring1Style} />}
        {isSpeaking && <Animated.View style={ring2Style} />}
        <Animated.View
          style={[
            styles.glow,
            {
              width: size + 16,
              height: size + 16,
              borderRadius: (size + 16) / 2,
            },
            glowStyle,
          ]}
        />
        <View
          style={[
            styles.border,
            {
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
            },
          ]}
        >
          <View
            style={[
              styles.imageContainer,
              { width: size, height: size, borderRadius },
            ]}
          >
            <Animated.View
              style={[
                { width: size, height: size },
                faceStyle,
              ]}
            >
            <Animated.Image
              source={photoSource}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            </Animated.View>
          </View>
        </View>
        {isSpeaking && (
          <View
            style={[
              styles.activeIndicator,
              {
                right: 8,
                bottom: 8,
              },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(201,147,58,0.15)",
  },
  border: {
    padding: 2,
    borderWidth: 2,
    borderColor: "rgba(201,147,58,0.5)",
  },
  imageContainer: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  activeIndicator: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C9933A",
    borderWidth: 2,
    borderColor: "#050507",
  },
});
