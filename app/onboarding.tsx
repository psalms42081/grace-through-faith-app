import React, { useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { track } from "@/lib/analytics";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const ONBOARDING_KEY = "@grace-through-faith/onboarded";

const QUOTE =
  "The Word of God is living and powerful.\nYou have come to the right place —\nopen your heart, and let it speak.";

const ease = Easing.out(Easing.ease);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const hasStartedRef = useRef(false);
  const cancelledRef = useRef(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flameOpacity = useSharedValue(0);
  const flameScale = useSharedValue(0.85);
  const quoteOpacity = useSharedValue(0);
  const attributionOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const handleEnter = useCallback(async () => {
    track("onboarding_completed", { method: "enter" });
    cancelledRef.current = true;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  }, []);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    flameOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 2000, easing: ease })
    );
    flameScale.value = withDelay(
      1000,
      withTiming(1, { duration: 2500, easing: Easing.out(Easing.cubic) })
    );

    quoteOpacity.value = withDelay(
      3000,
      withTiming(1, { duration: 1800, easing: ease })
    );

    attributionOpacity.value = withDelay(
      4200,
      withTiming(0.5, { duration: 1200, easing: ease })
    );

    buttonOpacity.value = withDelay(
      6500,
      withTiming(1, { duration: 1000, easing: ease })
    );

    // Preserve the previous voiceover-completion timing without playing audio.
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (!cancelledRef.current) handleEnter();
    }, 11750);
  }, [
    handleEnter,
    flameOpacity,
    flameScale,
    quoteOpacity,
    attributionOpacity,
    buttonOpacity,
  ]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: flameOpacity.value,
    transform: [{ scale: flameScale.value }],
  }));

  const quoteStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
  }));

  const attributionStyle = useAnimatedStyle(() => ({
    opacity: attributionOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  return (
    <View style={[s.root, { paddingBottom: bottomPad }]}>
      <View style={s.center}>
        <Animated.View style={[s.brandBlock, flameStyle]}>
          <Image
            source={require("@/assets/images/informed-ministries-icon.png")}
            style={s.flame}
            resizeMode="contain"
          />
          <Text style={s.ministryName}>Informed Ministries</Text>
        </Animated.View>

        <View style={s.quoteBlock}>
          <Animated.View style={quoteStyle}>
            <Text style={s.quoteText}>{QUOTE}</Text>
          </Animated.View>
          <Animated.View style={attributionStyle}>
            <Text style={s.attribution}>— Ellen G. White</Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[s.bottomArea, buttonStyle]}>
        <Pressable
          style={({ pressed }) => [s.enterBtn, pressed && { opacity: 0.8 }]}
          onPress={handleEnter}
        >
          <Text style={s.enterBtnText}>Enter</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PathB.surface,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flame: {
    width: 88,
    height: 88,
    borderRadius: 18,
  },
  brandBlock: {
    alignItems: "center",
  },
  ministryName: {
    marginTop: 8,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: PathB.ink,
    letterSpacing: 1.2,
  },
  quoteBlock: {
    marginTop: 20,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  quoteText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 18,
    color: PathB.ink,
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: 0.3,
  },
  attribution: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: HV2.inkMutedText,
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bottomArea: {
    alignItems: "center",
    paddingBottom: Platform.OS === "web" ? 48 : 32,
  },
  enterBtn: {
    width: 160,
    height: 52,
    borderRadius: 26,
    backgroundColor: PathB.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  enterBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#fff",
    letterSpacing: 1,
  },
});
