import React, { useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  Animated as RNAnimated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

type CardVariant = "standard" | "elevated" | "hero";

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  gradient?: string[];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  testID?: string;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  standard: {
    borderRadius: 16,
    padding: 16,
  },
  elevated: {
    borderRadius: 18,
    padding: 18,
  },
  hero: {
    borderRadius: 24,
    padding: 24,
  },
};

export default function Card({
  variant = "standard",
  children,
  onPress,
  style,
  gradient,
  gradientStart,
  gradientEnd,
  testID,
}: CardProps) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const baseStyle: ViewStyle = {
    ...variantStyles[variant],
    backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
    borderWidth: 1,
    borderColor: theme.border,
  };

  const handlePressIn = () => {
    if (variant === "hero") {
      RNAnimated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (variant === "hero") {
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const content = gradient ? (
    <LinearGradient
      colors={gradient as any}
      start={gradientStart || { x: 0, y: 0 }}
      end={gradientEnd || { x: 1, y: 1 }}
      style={[baseStyle, { borderWidth: 0 }, style]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={[baseStyle, style]}>{children}</View>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={gradient ? s.gradientWrapper : undefined}>
        {content}
      </View>
    );
  }

  return (
    <RNAnimated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          gradient ? s.gradientWrapper : undefined,
          { opacity: pressed && variant !== "hero" ? 0.85 : 1 },
        ]}
        testID={testID}
      >
        {content}
      </Pressable>
    </RNAnimated.View>
  );
}

const s = StyleSheet.create({
  gradientWrapper: {
    borderRadius: 18,
    overflow: "hidden",
  },
});
