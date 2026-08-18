import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { HV2, F } from "./theme";

// Pastel chips tinted with category tokens (§1.2).
// TODO (Discover brief): deep-link each chip to Discover pre-filtered by topic.
// Discover filtering isn't wired yet, so chips open Discover un-filtered for now.
const CHIPS = [
  { label: "Anxiety", bg: "#FCE1EC", fg: "#C2367C" },
  { label: "Hope", bg: "#DDF0FB", fg: HV2.catSignpost },
  { label: "Sabbath", bg: "#DFF6F2", fg: HV2.catSabbath },
  { label: "Prayer", bg: "#FFF0D9", fg: HV2.catEGW },
  { label: "Grace", bg: "#EAE6FA", fg: HV2.catPlans },
];

export default function TopicChips() {
  return (
    <View style={s.section}>
      <Text style={s.heading}>Explore Topics</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.rail}
      >
        {CHIPS.map((c) => (
          <Pressable
            key={c.label}
            style={[s.chip, { backgroundColor: c.bg }]}
            onPress={() => router.push("/(tabs)/search" as any)}
            accessibilityRole="button"
            accessibilityLabel={`Explore ${c.label}`}
          >
            <Text style={[s.chipLabel, { color: c.fg }]}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 28 },
  heading: { fontFamily: F.loraSemi, fontSize: 19, color: HV2.ink, paddingHorizontal: 20 },
  rail: { flexDirection: "row", gap: 8, marginTop: 14, paddingHorizontal: 20 },
  chip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  chipLabel: { fontFamily: F.interSemi, fontSize: 13 },
});
