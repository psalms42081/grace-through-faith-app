import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTutorial, TutorialId } from "@/contexts/TutorialContext";

/** Dark card + gold hairline (replaces former blue #1E88E5 fill). */
const COACH_CARD_BG = "rgba(26,31,60,0.96)";
const COACH_BORDER = "rgba(201,147,58,0.55)";
const COACH_TEXT = "#F5EFE0";
const COACH_GOLD = "#C9933A";
const ARROW_W = 4;
const ARROW_H = 6;

interface InlineCoachTipProps {
  id: TutorialId;
  text: string;
  visible?: boolean;
  onDismiss?: () => void;
}

export default function InlineCoachTip({
  id,
  text,
  visible = true,
  onDismiss,
}: InlineCoachTipProps) {
  const { hasSeenTutorial, markTutorialSeen, isLoaded } = useTutorial();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  const shouldShow = isLoaded && visible && !hasSeenTutorial(id);

  useEffect(() => {
    if (shouldShow) {
      dismissed.current = false;
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -6,
            duration: 750,
            useNativeDriver: true,
            easing: (t: number) => t * t * (3 - 2 * t),
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
            easing: (t: number) => t * t * (3 - 2 * t),
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      floatAnim.setValue(0);
    }
  }, [shouldShow, fadeAnim, floatAnim]);

  const handleDismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Haptics.selectionAsync();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      markTutorialSeen(id);
      onDismiss?.();
    });
  };

  if (!shouldShow) return null;

  return (
    <Pressable onPress={handleDismiss} accessibilityRole="button" accessibilityLabel={`Dismiss tip: ${text}`}>
      <Animated.View
        style={[
          s.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        <View style={s.arrow} />
        <Text style={s.text} numberOfLines={2}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: COACH_CARD_BG,
    borderWidth: 1,
    borderColor: COACH_BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 4,
    maxWidth: 300,
    alignSelf: "flex-start",
    ...Platform.select({
      ios: {
        shadowColor: COACH_GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: `0 2px 14px rgba(201,147,58,0.12), 0 3px 12px rgba(0,0,0,0.25)` } as any,
    }),
  },
  arrow: {
    position: "absolute",
    top: -ARROW_H,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_W,
    borderRightWidth: ARROW_W,
    borderBottomWidth: ARROW_H,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: COACH_CARD_BG,
  },
  text: {
    color: COACH_TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
});
