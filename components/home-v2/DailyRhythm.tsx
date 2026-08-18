import React from "react";
import { View, Text, Pressable, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { Check } from "lucide-react-native";
import { HV2, F } from "./theme";

export interface RhythmRowData {
  key: string;
  icon: ImageSourcePropType;
  iconBg: string;
  title: string;
  meta: string;
  done: boolean;
  onPress: () => void;
}

interface Props {
  rows: RhythmRowData[];
}

export default function DailyRhythm({ rows }: Props) {
  const doneCount = rows.filter((r) => r.done).length;
  return (
    <View style={s.section}>
      <View style={s.headRow}>
        <Text style={s.heading}>Daily Rhythm</Text>
        <Text style={s.count}>{doneCount} of {rows.length} done</Text>
      </View>
      <View style={s.rows}>
        {rows.map((r) => (
          <Pressable key={r.key} style={s.row} onPress={r.onPress} accessibilityRole="button">
            <View style={[s.iconBox, { backgroundColor: r.iconBg }]}>
              <Image source={r.icon} style={s.iconImg} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{r.title}</Text>
              <Text style={s.meta} numberOfLines={1}>{r.meta}</Text>
            </View>
            {r.done ? (
              <View style={s.doneCircle}>
                <Check size={15} color="#FFFFFF" strokeWidth={3} />
              </View>
            ) : (
              <View style={s.todoCircle} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 28 },
  headRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  heading: { fontFamily: F.loraSemi, fontSize: 19, color: HV2.ink },
  count: { fontFamily: F.interSemi, fontSize: 13, color: HV2.inkMutedText },
  rows: { gap: 10, marginTop: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: HV2.surfaceCard,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...HV2.rowShadow,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconImg: { width: 28, height: 28 },
  title: { fontFamily: F.interSemi, fontSize: 15, color: HV2.ink },
  meta: { fontFamily: F.inter, fontSize: 12.5, color: HV2.inkMutedText, marginTop: 2 },
  // Completion check is coral per §1.3 (coral = progress/completion)
  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: HV2.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  todoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E1DB",
  },
});
