import React, { useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { track } from "@/lib/analytics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const ONBOARDING_KEY = "@grace-through-faith/onboarded";

const GOLD = "#C9933A";
const NAVY = "#1A1F3C";
const DEEP_NAVY = "#0D1025";
const PARCHMENT = "#F5EFE0";

const QUOTE =
  "The Word of God is living and powerful.\nYou have come to the right place —\nopen your heart, and let it speak.";

const ease = Easing.out(Easing.ease);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const hasStartedRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cancelledRef = useRef(false);

  const flameOpacity = useSharedValue(0);
  const flameScale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0);
  const quoteOpacity = useSharedValue(0);
  const attributionOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const handleEnter = useCallback(async () => {
    track("onboarding_completed", { method: "enter" });
    cancelledRef.current = true;
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); } catch {}
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

    glowOpacity.value = withDelay(
      1500,
      withTiming(0.12, { duration: 2500, easing: ease })
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

    // Configure audio session then play voiceover
    setTimeout(async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require("@/assets/audio/invitation-quote.mp3"),
          { shouldPlay: true, volume: 0.7 },
          (status) => {
            // Auto-advance as soon as the voiceover finishes
            if (status.isLoaded && status.didJustFinish) {
              setTimeout(() => handleEnter(), 1500);
            }
          }
        );
        if (!cancelledRef.current) {
          soundRef.current = sound;
        } else {
          sound.unloadAsync().catch(() => {});
        }
      } catch {
        // If audio fails, auto-advance after a generous delay
        setTimeout(() => handleEnter(), 10000);
      }
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (soundRef.current) {
        soundRef.current
          .stopAsync()
          .catch(() => {})
          .finally(() => soundRef.current?.unloadAsync().catch(() => {}));
      }
    };
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: flameOpacity.value,
    transform: [{ scale: flameScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
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
        <Animated.View style={[s.glowRing, glowStyle]} />

        <Animated.View style={flameStyle}>
          <Image
            source={require("@/assets/images/adventist-symbol-gold.png")}
            style={s.flame}
            resizeMode="contain"
          />
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
    backgroundColor: DEEP_NAVY,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: GOLD,
  },
  flame: {
    width: 90,
    height: 90,
  },
  quoteBlock: {
    marginTop: 48,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  quoteText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 18,
    color: PARCHMENT,
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: 0.3,
  },
  attribution: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: GOLD,
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
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  enterBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: NAVY,
    letterSpacing: 1,
  },
});
