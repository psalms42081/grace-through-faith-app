import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  testID?: string;
}

const sizeConfig: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number; iconSize: number; minHeight: number }> = {
  sm: { paddingH: 12, paddingV: 8, fontSize: 13, iconSize: 16, minHeight: 34 },
  md: { paddingH: 16, paddingV: 12, fontSize: 15, iconSize: 20, minHeight: 44 },
  lg: { paddingH: 20, paddingV: 14, fontSize: 16, iconSize: 22, minHeight: 50 },
};

export default function Button({
  variant = "primary",
  size = "md",
  title,
  icon,
  iconSize: customIconSize,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const cfg = sizeConfig[size];
  const finalIconSize = customIconSize || cfg.iconSize;

  const getVariantStyle = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: disabled ? theme.textMuted : theme.accent,
            borderRadius: 12,
          },
          text: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" as const },
          iconColor: "#FFFFFF",
        };
      case "secondary":
        return {
          container: {
            backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.accent + "40",
          },
          text: { color: theme.accent, fontFamily: "Inter_600SemiBold" as const },
          iconColor: theme.accent,
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
            borderRadius: 12,
          },
          text: { color: theme.accent, fontFamily: "Inter_600SemiBold" as const },
          iconColor: theme.accent,
        };
      case "icon":
        return {
          container: {
            backgroundColor: theme.accent + "12",
            borderRadius: cfg.minHeight / 2,
            width: cfg.minHeight,
            height: cfg.minHeight,
            paddingHorizontal: 0,
            paddingVertical: 0,
            alignItems: "center" as const,
            justifyContent: "center" as const,
          },
          text: { color: theme.accent, fontFamily: "Inter_600SemiBold" as const },
          iconColor: theme.accent,
        };
    }
  };

  const vs = getVariantStyle();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        {
          paddingHorizontal: variant === "icon" ? 0 : cfg.paddingH,
          paddingVertical: variant === "icon" ? 0 : cfg.paddingV,
          minHeight: cfg.minHeight,
          opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
        },
        vs.container,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.iconColor} />
      ) : (
        <View style={s.content}>
          {icon && <Ionicons name={icon} size={finalIconSize} color={vs.iconColor} />}
          {title && variant !== "icon" && (
            <Text style={[s.text, { fontSize: cfg.fontSize }, vs.text, textStyle]}>
              {title}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    textAlign: "center",
  },
});
