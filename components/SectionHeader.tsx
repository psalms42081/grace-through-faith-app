import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface SectionHeaderProps {
  title: string;
  color: string;
  fontFamily?: string;
}

export default function SectionHeader({ title, color, fontFamily = "Lora_700Bold" }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color, fontFamily }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    letterSpacing: 0.15,
  },
});
