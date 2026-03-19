import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface OnboardingCategoryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
  theme: typeof Colors.dark;
  onPress: () => void;
}

export default function OnboardingCategoryCard({
  icon,
  label,
  description,
  color,
  theme,
  onPress,
}: OnboardingCategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`onboarding-category-${label.toLowerCase()}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
