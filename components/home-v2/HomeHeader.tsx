import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { formatGreeting, greetingThatFits } from "./home-data";
import { HV2, F } from "./theme";

interface Props {
  dateLine: string;
  greetingBase: string;
  displayName?: string | null;
  streak: number;
  onKidsPress: () => void;
}

function nodeWidth(node: unknown): number {
  const element = node as { getBoundingClientRect?: () => { width: number } } | null;
  const width = element?.getBoundingClientRect?.()?.width ?? 0;
  return Number.isFinite(width) ? width : 0;
}

export default function HomeHeader({ dateLine, greetingBase, displayName, streak, onKidsPress }: Props) {
  const measureRef = useRef<Text>(null);
  const slotRef = useRef<View>(null);
  const [slotWidth, setSlotWidth] = useState(0);
  const [namedWidth, setNamedWidth] = useState(0);
  const greeting = greetingThatFits(greetingBase, displayName, namedWidth, slotWidth);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const named = nodeWidth(measureRef.current);
      const slot = nodeWidth(slotRef.current);
      if (cancelled) return;
      if (named > 0) setNamedWidth(named);
      if (slot > 0) setSlotWidth(slot);
    };
    measure();
    const fonts = (globalThis as { document?: { fonts?: { ready: Promise<unknown> } } }).document?.fonts;
    void fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [greetingBase, displayName]);

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Text style={s.date}>{dateLine}</Text>
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
        </View>
      </View>
      <View
        ref={slotRef}
        style={s.slot}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0) setSlotWidth(width);
        }}
      >
        <Text
          ref={measureRef}
          style={[s.greeting, s.measure]}
          pointerEvents="none"
          onLayout={(event) => {
            const width = nodeWidth(measureRef.current) || event.nativeEvent.layout.width;
            if (width > 0) setNamedWidth(width);
          }}
        >
          {formatGreeting(greetingBase, displayName)}
        </Text>
        <Text style={s.greeting} testID="home-greeting">
          {greeting}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  date: { flex: 1, fontFamily: F.interMed, fontSize: 13, color: HV2.inkMutedText },
  greeting: { fontFamily: F.loraSemi, fontSize: 22, color: HV2.ink, marginTop: 2 },
  slot: { overflow: "hidden" },
  measure: {
    position: "absolute",
    opacity: 0,
    left: 0,
    top: 0,
    alignSelf: "flex-start",
    ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap", width: "max-content" } as object) : null),
  },
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
});
