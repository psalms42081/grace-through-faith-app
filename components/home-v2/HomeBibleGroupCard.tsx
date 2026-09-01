import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";

type GroupCard = {
  id: string;
  name: string;
  currentWeek: {
    lessonNumber: number;
    lessonTitle: string;
  } | null;
};

export default function HomeBibleGroupCard({
  groups,
  onOpen,
}: {
  groups: GroupCard[];
  onOpen: (groupId: string) => void;
}) {
  if (groups.length === 0) return null;
  const first = groups[0];
  const extra = groups.length - 1;
  const weekLabel = first.currentWeek
    ? `Lesson ${first.currentWeek.lessonNumber} · ${first.currentWeek.lessonTitle}`
    : "This week's lesson";

  return (
    <Pressable
      style={s.card}
      onPress={() => onOpen(first.id)}
      testID="home-bible-group-card"
      accessibilityRole="button"
      accessibilityLabel={`${first.name}, ${weekLabel}`}
    >
      <View style={s.iconWrap}>
        <Ionicons name="people-outline" size={20} color={PathB.coral} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.eyebrow}>SMALL GROUP</Text>
        <Text style={s.title} numberOfLines={1}>
          {first.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {weekLabel}
          {extra > 0 ? `  ·  and ${extra} more` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={HV2.inkMutedText} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: PathB.surfaceCard,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...HV2.rowShadow,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1EBDD",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
    color: PathB.coralInk,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: PathB.ink,
  },
  meta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: HV2.inkMutedText,
    marginTop: 2,
  },
});
