import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { usePioneer } from "@/contexts/PioneerContext";
import PioneerPortrait from "./PioneerPortrait";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";

const PORTRAIT_SIZE = 64;
const TAB_BAR_HEIGHT = 50;
const WEB_BOTTOM_INSET = 34;
const GOLD = "#C9933A";

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
};

function getPositions(w: number, h: number, bottomInset: number) {
  const tabBarTop = h - TAB_BAR_HEIGHT - (Platform.OS === "web" ? WEB_BOTTOM_INSET : bottomInset);
  const tabWidth = w / 5;
  const tabCenterY = tabBarTop - PORTRAIT_SIZE - 12;

  const positions: Record<string, { x: number; y: number; bubbleAlign: "left" | "right" | "center" }> = {
    "verse-of-day":     { x: w - PORTRAIT_SIZE - 20, y: 120, bubbleAlign: "right" },
    "continue-study":   { x: 20, y: 200, bubbleAlign: "left" },
    "tab-read":         { x: tabWidth * 1 + tabWidth / 2 - PORTRAIT_SIZE / 2, y: tabCenterY, bubbleAlign: "center" },
    "tab-connect":      { x: tabWidth * 2 + tabWidth / 2 - PORTRAIT_SIZE / 2, y: tabCenterY, bubbleAlign: "center" },
    "tab-study":        { x: tabWidth * 3 + tabWidth / 2 - PORTRAIT_SIZE / 2, y: tabCenterY, bubbleAlign: "center" },
    "tab-profile":      { x: tabWidth * 4 + tabWidth / 2 - PORTRAIT_SIZE / 2, y: tabCenterY, bubbleAlign: "center" },
    "ss-lesson-card":   { x: 20, y: 160, bubbleAlign: "left" },
    "ss-discussion-section": { x: w - PORTRAIT_SIZE - 20, y: 200, bubbleAlign: "right" },
    "ss-content":       { x: w / 2 - PORTRAIT_SIZE / 2, y: 180, bubbleAlign: "center" },
    "study-guide-content": { x: 20, y: 160, bubbleAlign: "left" },
    "persona-selector": { x: w - PORTRAIT_SIZE - 20, y: 200, bubbleAlign: "right" },
    "phase-indicators": { x: 20, y: 240, bubbleAlign: "left" },
    "heatmap-grid":     { x: w - PORTRAIT_SIZE - 20, y: 160, bubbleAlign: "right" },
    "analytics-overview": { x: 20, y: 160, bubbleAlign: "left" },
    "timeline-view":    { x: w - PORTRAIT_SIZE - 20, y: 180, bubbleAlign: "right" },
    "reader-view":      { x: 20, y: 160, bubbleAlign: "left" },
  };
  const defaultPos = { x: w - PORTRAIT_SIZE - 20, y: h - 240, bubbleAlign: "right" as const };
  return { positions, defaultPos };
}

function PointerArrow({ fromX, fromY, isTabTarget }: { fromX: number; fromY: number; isTabTarget: boolean }) {
  const arrowPulse = useSharedValue(0);

  useEffect(() => {
    if (isTabTarget) {
      arrowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(arrowPulse);
      arrowPulse.value = 0;
    }
    return () => cancelAnimation(arrowPulse);
  }, [isTabTarget]);

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: isTabTarget ? interpolate(arrowPulse.value, [0, 1], [0.4, 0.9]) : 0,
    transform: [{ translateY: interpolate(arrowPulse.value, [0, 1], [0, 6]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: fromX + PORTRAIT_SIZE / 2 - 12,
          top: fromY + PORTRAIT_SIZE + 4,
          zIndex: 12,
        },
        arrowStyle,
      ]}
    >
      <Ionicons name="arrow-down" size={24} color="rgba(201,147,58,0.7)" />
    </Animated.View>
  );
}

export default function EllenWhiteHologram() {
  const {
    isVisible,
    currentSteps,
    currentStepIndex,
    nextStep,
    dismiss,
    selectedPioneer,
  } = usePioneer();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const { positions, defaultPos } = useMemo(
    () => getPositions(screenW, screenH, insets.bottom),
    [screenW, screenH, insets.bottom]
  );

  const getPos = useCallback((target: string) => positions[target] || defaultPos, [positions, defaultPos]);

  const overlayOpacity = useSharedValue(0);
  const portraitScale = useSharedValue(0.7);
  const portraitOpacity = useSharedValue(0);
  const portraitX = useSharedValue(defaultPos.x);
  const portraitY = useSharedValue(defaultPos.y);
  const breathe = useSharedValue(0);

  const stopSpeaking = useCallback(async () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const pioneerVoiceKey = selectedPioneer.voiceKey;

  const speakText = useCallback((text: string) => {
    stopSpeaking();

    speechTimeoutRef.current = setTimeout(async () => {
      try {
        const apiUrl = getApiUrl();
        const prepareUrl = new URL("/api/tts/prepare", apiUrl).toString();

        const prepRes = await fetch(prepareUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: pioneerVoiceKey }),
        });

        if (!prepRes.ok) throw new Error(`TTS prepare failed: ${prepRes.status}`);

        const { audioId } = await prepRes.json();
        if (!mountedRef.current) return;

        const audioUri = new URL(`/api/tts/audio/${audioId}`, apiUrl).toString();

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              if (mountedRef.current) setIsSpeaking(false);
              sound.unloadAsync().catch(() => {});
              soundRef.current = null;
            }
          },
        );
        soundRef.current = sound;
        if (mountedRef.current) setIsSpeaking(true);
      } catch (err) {
        console.warn("[ellen-white] TTS unavailable:", err);
      }
    }, 600);
  }, [stopSpeaking]);

  useEffect(() => {
    if (isVisible && currentSteps.length > 0) {
      const step = currentSteps[0];
      const pos = getPos(step.spotlightTarget);
      portraitX.value = pos.x;
      portraitY.value = pos.y;

      overlayOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      portraitScale.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) }));
      portraitOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

      breathe.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );

      speakText(step.text);
    } else {
      stopSpeaking();
      overlayOpacity.value = withTiming(0, { duration: 250 });
      portraitScale.value = withTiming(0.7, { duration: 200 });
      portraitOpacity.value = withTiming(0, { duration: 200 });
      cancelAnimation(breathe);
    }

    return () => {
      stopSpeaking();
      cancelAnimation(breathe);
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && currentSteps.length > 0) {
      const step = currentSteps[currentStepIndex];
      const pos = getPos(step.spotlightTarget);

      portraitX.value = withSpring(pos.x, SPRING_CONFIG);
      portraitY.value = withSpring(pos.y, SPRING_CONFIG);

      speakText(step.text);

      const nextIdx = currentStepIndex + 1;
      if (nextIdx < currentSteps.length) {
        const nextText = currentSteps[nextIdx].text;
        try {
          const apiUrl = getApiUrl();
          fetch(new URL("/api/tts/prepare", apiUrl).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: nextText, voice: pioneerVoiceKey }),
          }).catch(() => {});
        } catch {}
      }
    }
  }, [currentStepIndex]);

  const handleDismiss = useCallback(() => {
    stopSpeaking();
    dismiss();
  }, [dismiss, stopSpeaking]);

  const handleNext = useCallback(() => {
    stopSpeaking();
    nextStep();
  }, [nextStep, stopSpeaking]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const portraitAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(portraitScale.value, [0.7, 1], [0.7, 1]) },
      { translateY: interpolate(breathe.value, [0, 1], [0, -3]) },
    ],
    opacity: portraitOpacity.value,
    left: portraitX.value,
    top: portraitY.value,
  }));

  if (!isVisible || currentSteps.length === 0) return null;

  const step = currentSteps[currentStepIndex];
  const isLastStep = currentStepIndex === currentSteps.length - 1;
  const pos = getPos(step.spotlightTarget);
  const isTabTarget = step.spotlightTarget.startsWith("tab-");

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel="Tap to continue tour"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.skipContainer,
          { top: insets.top + (Platform.OS === "web" ? 67 : 8) },
          overlayStyle,
        ]}
      >
        <Pressable onPress={handleDismiss} style={styles.skipButton} testID="ellen-white-skip">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>

      <PointerArrow fromX={pos.x} fromY={pos.y} isTabTarget={isTabTarget} />

      <Animated.View
        style={[
          styles.portraitContainer,
          portraitAnimStyle,
        ]}
      >
        <Pressable onPress={handleNext} testID="ellen-white-portrait-tap" style={styles.portraitTouchable}>
          <PioneerPortrait pioneerId={selectedPioneer.id} size={PORTRAIT_SIZE} isSpeaking={isSpeaking} testID="pioneer-portrait" />
          <Text style={styles.tapContinueText}>Tap to continue</Text>
        </Pressable>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  skipContainer: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
  portraitContainer: {
    position: "absolute",
    zIndex: 11,
  },
  portraitTouchable: {
    padding: 8,
    alignItems: "center",
  },
  tapContinueText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
});
