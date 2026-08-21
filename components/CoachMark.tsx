import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTutorial, TutorialId } from "@/contexts/TutorialContext";

export type ArrowDirection = "up" | "down" | "left" | "right";

interface CoachMarkProps {
  id: TutorialId;
  text: string;
  targetLayout: { x: number; y: number; width: number; height: number } | null;
  arrowDirection: ArrowDirection;
  onDismiss?: () => void;
  visible?: boolean;
}

/** Dark card + gold hairline (replaces former blue #1E88E5 fill). */
const COACH_CARD_BG = "rgba(26,31,60,0.96)";
const COACH_BORDER = "rgba(201,147,58,0.55)";
const COACH_TEXT = "#F5EFE0";
const COACH_GOLD = "#C9933A";
const ARROW_W = 4;
const ARROW_H = 6;
const MAX_W = 260;
const EDGE_MARGIN = 12;

export default function CoachMark({
  id,
  text,
  targetLayout,
  arrowDirection,
  onDismiss,
  visible = true,
}: CoachMarkProps) {
  const { hasSeenTutorial, markTutorialSeen, isLoaded } = useTutorial();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  const shouldShow = isLoaded && visible && !hasSeenTutorial(id) && targetLayout !== null;

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

  if (!shouldShow || !targetLayout) return null;

  const screen = Dimensions.get("window");
  const { x, y, width, height } = targetLayout;

  const halfTip = MAX_W / 2;
  let tooltipStyle: any = {};
  let arrowStyle: any = {};

  const clampH = (left: number) => {
    const clamped = Math.max(EDGE_MARGIN, Math.min(left, screen.width - MAX_W - EDGE_MARGIN));
    return clamped;
  };

  const clampV = (top: number) => {
    const clamped = Math.max(EDGE_MARGIN, Math.min(top, screen.height - 50 - EDGE_MARGIN));
    return clamped;
  };

  switch (arrowDirection) {
    case "up": {
      const rawLeft = x + width / 2 - halfTip;
      const tipLeft = clampH(rawLeft);
      const tipTop = clampV(y + height + ARROW_H + 4);
      const arrowLeft = Math.min(Math.max(12, x + width / 2 - tipLeft - ARROW_W), MAX_W - 20);
      tooltipStyle = { top: tipTop, left: tipLeft };
      arrowStyle = {
        position: "absolute" as const,
        top: -ARROW_H,
        left: arrowLeft,
        width: 0,
        height: 0,
        borderLeftWidth: ARROW_W,
        borderRightWidth: ARROW_W,
        borderBottomWidth: ARROW_H,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: COACH_CARD_BG,
      };
      break;
    }
    case "down": {
      const rawLeft = x + width / 2 - halfTip;
      const tipLeft = clampH(rawLeft);
      const tipTop = clampV(y - ARROW_H - 4 - 40);
      const arrowLeft = Math.min(Math.max(12, x + width / 2 - tipLeft - ARROW_W), MAX_W - 20);
      tooltipStyle = { top: tipTop, left: tipLeft };
      arrowStyle = {
        position: "absolute" as const,
        bottom: -ARROW_H,
        left: arrowLeft,
        width: 0,
        height: 0,
        borderLeftWidth: ARROW_W,
        borderRightWidth: ARROW_W,
        borderTopWidth: ARROW_H,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: COACH_CARD_BG,
      };
      break;
    }
    case "left": {
      const tipLeft = clampH(x + width + ARROW_W + 4);
      const tipTop = clampV(y + height / 2 - 18);
      tooltipStyle = { top: tipTop, left: tipLeft };
      arrowStyle = {
        position: "absolute" as const,
        left: -ARROW_W,
        top: 12,
        width: 0,
        height: 0,
        borderTopWidth: ARROW_W,
        borderBottomWidth: ARROW_W,
        borderRightWidth: ARROW_W,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: COACH_CARD_BG,
      };
      break;
    }
    case "right": {
      const tipTop = clampV(y + height / 2 - 18);
      tooltipStyle = { top: tipTop, right: Math.max(EDGE_MARGIN, screen.width - x + ARROW_W + 4) };
      arrowStyle = {
        position: "absolute" as const,
        right: -ARROW_W,
        top: 12,
        width: 0,
        height: 0,
        borderTopWidth: ARROW_W,
        borderBottomWidth: ARROW_W,
        borderLeftWidth: ARROW_W,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: COACH_CARD_BG,
      };
      break;
    }
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      testID={`coach-mark-overlay-${id}`}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          st.backdrop,
          { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) },
        ]}
      />

      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss tip: ${text}`}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View
          style={[
            st.tooltip,
            tooltipStyle,
            {
              opacity: fadeAnim,
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <View style={arrowStyle} />
          <Text style={st.tooltipText} accessibilityRole="text" numberOfLines={1}>
            {text}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: COACH_CARD_BG,
    borderWidth: 1,
    borderColor: COACH_BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: MAX_W,
    zIndex: 10000,
    ...Platform.select({
      ios: {
        shadowColor: COACH_GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: "0 2px 14px rgba(201,147,58,0.12), 0 3px 12px rgba(0,0,0,0.25)",
      },
    }),
  },
  tooltipText: {
    color: COACH_TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
});
