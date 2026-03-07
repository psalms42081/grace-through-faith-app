import React, { ReactNode } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightAction?: ReactNode;
  backIcon?: "arrow-back" | "chevron-back";
  testID?: string;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBackButton = true,
  rightAction,
  backIcon = "arrow-back",
  testID,
}: ScreenHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad + 12 }]} testID={testID}>
      {showBackButton ? (
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name={backIcon} size={24} color={theme.text} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction ? rightAction : <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  spacer: {
    width: 36,
  },
});
