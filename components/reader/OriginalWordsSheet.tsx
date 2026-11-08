import React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PathB } from "@/constants/colors";
import {
  type OriginalWordRow,
  type ReaderStrongMap,
} from "@/lib/reader-word-study";

const INK = PathB.ink;
const MUTED = "#6B6660";
const BORDER = "#E7E0D2";
const PILL = "#F1EBDD";

export function OriginalWordsSheet({
  visible,
  reference,
  rows,
  maps,
  loading,
  onClose,
  onWordActivate,
  emptyMessage,
}: {
  visible: boolean;
  reference: string;
  rows: OriginalWordRow[];
  maps: ReaderStrongMap[];
  loading: boolean;
  onClose: () => void;
  onWordActivate: (surface: string, mapping: ReaderStrongMap) => void;
  emptyMessage?: string | null;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="Dismiss original words" />
      <View style={s.sheet} testID="reader-original-words-sheet">
        <View style={s.handle} />
        <Text style={s.title}>Original words</Text>
        {reference ? <Text style={s.ref}>{reference}</Text> : null}
        {loading && rows.length === 0 ? (
          <ActivityIndicator color={INK} style={{ marginVertical: 24 }} />
        ) : rows.length === 0 ? (
          <Text style={s.empty} testID="reader-original-words-empty">
            {emptyMessage || "No original-language tagging for this verse."}
          </Text>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.list}
          >
            {rows.map((row) => {
              const mapping = maps[row.mapIndex];
              if (!mapping) return null;
              const surface = row.gloss || row.original;
              const label = [row.original, row.transliteration, row.gloss, row.strongId]
                .filter(Boolean)
                .join(", ");
              return (
                <Pressable
                  key={`${row.mapIndex}-${row.strongId}-${row.original}`}
                  testID={`reader-original-word-${row.mapIndex}`}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => onWordActivate(surface, mapping)}
                  style={({ pressed }) => [s.row, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <View style={s.originalCol}>
                    <Text style={s.original}>{row.original || "—"}</Text>
                    {row.transliteration ? (
                      <Text style={s.translit}>{row.transliteration}</Text>
                    ) : null}
                  </View>
                  <Text style={s.gloss} numberOfLines={2}>
                    {row.gloss}
                  </Text>
                  {row.strongId ? (
                    <View style={s.chip}>
                      <Text style={s.chipText}>{row.strongId}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </Pressable>
              );
            })}
            <Text style={s.footer}>Tagging: STEP Bible</Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: "rgba(31, 26, 18, 0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "78%",
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D0BE",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: INK,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  ref: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  list: {
    paddingBottom: 12,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  originalCol: {
    width: 132,
    flexShrink: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
  },
  original: {
    fontSize: 20,
    lineHeight: 28,
    color: INK,
    textAlign: "left",
    writingDirection: "rtl",
  },
  translit: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    textAlign: "left",
    writingDirection: "ltr",
  },
  gloss: {
    flex: 1,
    flexShrink: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 18,
    color: INK,
    textAlign: "left",
    writingDirection: "ltr",
  },
  chip: {
    flexShrink: 0,
    backgroundColor: PILL,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: INK,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
