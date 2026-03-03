import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { type TraditionKey, getDisclaimerText } from "@/constants/traditions";

export default function TraditionDisclaimer({
  traditionKey,
  color,
}: {
  traditionKey: TraditionKey;
  color?: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const text = getDisclaimerText(traditionKey);

  if (!text) return null;

  const accentColor = color || theme.accent;

  return (
    <View style={[st.container, { backgroundColor: accentColor + "0A", borderColor: accentColor + "20" }]}>
      <Ionicons name="information-circle-outline" size={18} color={accentColor} style={st.icon} />
      <Text style={[st.text, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    alignItems: "flex-start",
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
