import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { HV2, F } from "./theme";

interface Props {
  quarterTitle?: string | null;
  lessonTitle?: string | null;
  lessonNumber?: number | null;
  completedDays: number;
  dayLabel: string; // e.g. "Wednesday"
}

// The ONE gradient on this screen (§1.3). All other cards are flat white.
export default function SSGradientCard({
  quarterTitle, lessonTitle, lessonNumber, completedDays, dayLabel,
}: Props) {
  const progress = Math.min(Math.max(completedDays / 7, 0), 1);
  const goToSS = () => router.push("/(tabs)/ss/sabbath-school" as any);

  return (
    <View style={s.wrap}>
      <LinearGradient
        colors={[...HV2.ssGradientSafe]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={s.inner}
      >
        <View style={s.topRow}>
          <Text style={s.eyebrow} numberOfLines={1}>
            SABBATH SCHOOL{quarterTitle ? ` · ${quarterTitle}` : ""}
          </Text>
          {lessonNumber != null && (
            <View style={s.badge}>
              <Text style={s.badgeText}>Lesson {lessonNumber} of 13</Text>
            </View>
          )}
        </View>
        <Text style={s.title} numberOfLines={2}>
          {lessonTitle ?? "This week's lesson"}
        </Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={s.btnRow}>
          <Pressable style={s.continueBtn} onPress={goToSS} accessibilityRole="button">
            <Text style={s.continueLabel}>Continue — {dayLabel}</Text>
          </Pressable>
          <Pressable style={s.watchBtn} onPress={goToSS} accessibilityRole="button">
            <Text style={s.watchLabel}>▶ Watch</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 28,
    overflow: "hidden",
    ...HV2.cardShadow,
  },
  inner: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: {
    flex: 1,
    fontFamily: F.interBold,
    fontSize: 11.5,
    letterSpacing: 1.6,
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: F.interSemi, fontSize: 11, color: "#FFFFFF" },
  title: { fontFamily: F.loraSemi, fontSize: 21, lineHeight: 28, color: "#FFFFFF", marginTop: 12 },
  track: {
    marginTop: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  continueBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  continueLabel: { fontFamily: F.interSemi, fontSize: 13.5, color: "#1F7A70" },
  watchBtn: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  watchLabel: { fontFamily: F.interSemi, fontSize: 13.5, color: "#FFFFFF" },
});
