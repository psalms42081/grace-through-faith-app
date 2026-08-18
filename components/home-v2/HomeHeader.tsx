import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { HV2, F } from "./theme";

interface Props {
  dateLine: string;
  greeting: string; // "Good evening, Joe"
  streak: number;
  onKidsPress: () => void;
  onAvatarPress?: () => void;
  initial: string;
}

export default function HomeHeader({ dateLine, greeting, streak, onKidsPress, onAvatarPress, initial }: Props) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={s.date}>{dateLine}</Text>
        <Text style={s.greeting} numberOfLines={2}>{greeting}</Text>
      </View>
      <View style={s.right}>
        <Pressable
          style={s.pill}
          onPress={onKidsPress}
          testID="enter-kids-mode"
          accessibilityLabel="Switch to Kids Mode"
          accessibilityRole="button"
        >
          <Text style={s.pillEmoji}>🧒</Text>
          <Text style={s.pillLabel}>Kids</Text>
        </Pressable>
        <View style={s.pill} accessibilityLabel={`${streak} day reading streak`}>
          {/* Gold appears exactly once on this screen: the streak flame (§1.3) */}
          <Text style={s.pillEmoji}>🔥</Text>
          <Text style={s.streakCount}>{streak}</Text>
        </View>
        {/* Flat coral avatar — §1.3 allows ONE gradient per screen (the SS card) */}
        <Pressable
          onPress={onAvatarPress}
          accessibilityLabel="Profile"
          accessibilityRole="button"
          style={s.avatar}
        >
          <Text style={s.avatarInitial}>{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  date: { fontFamily: F.interMed, fontSize: 13, color: HV2.inkMutedText },
  greeting: { fontFamily: F.loraSemi, fontSize: 26, color: HV2.ink, marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: HV2.surfaceCard,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...HV2.rowShadow,
  },
  pillEmoji: { fontSize: 14 },
  pillLabel: { fontFamily: F.interSemi, fontSize: 13, color: HV2.ink },
  streakCount: { fontFamily: F.interBold, fontSize: 13.5, color: HV2.ink },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: HV2.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontFamily: F.interBold, fontSize: 16, color: "#FFFFFF" },
});
