import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { HV2, F } from "./theme";

// Pastel chips tinted with category tokens (§1.2).
// Each chip opens the canonical topic screen directly.
const CHIPS = [
  { label: "Anxiety", topic: "anxiety", bg: "#FCE1EC", fg: "#C2367C" },
  { label: "Hope", topic: "hope", bg: "#DDF0FB", fg: HV2.catSignpost },
  { label: "Sabbath", topic: "sabbath", bg: "#DFF6F2", fg: HV2.catSabbath },
  { label: "Prayer", topic: "prayer", bg: "#FFF0D9", fg: HV2.catEGW },
  { label: "Grace", topic: "gods-grace", bg: "#EAE6FA", fg: HV2.catPlans },
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
            onPress={() =>
              router.push({
                pathname: "/touchpoint-topic",
                params: { topicId: c.topic },
              } as any)
            }
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
