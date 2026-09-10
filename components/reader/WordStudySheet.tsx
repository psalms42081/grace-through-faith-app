import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { formatStrongId, type ReaderStrongMap } from "@/lib/reader-word-study";
import { READER_WORD_STUDY_FOOTER } from "@/lib/word-study-attribution";

export type WordStudySheetTarget = {
  surface: string;
  mapping: ReaderStrongMap;
  useCount?: number;
};

export function WordStudySheet({
  target,
  onClose,
  onSeeUses,
}: {
  target: WordStudySheetTarget | null;
  onClose: () => void;
  onSeeUses: (strongId: string, lemma?: string) => void;
}) {
  const mapping = target?.mapping;
  const entry = mapping?.entry;
  const displayId = formatStrongId(mapping?.map.strongId || entry?.id || "");
  const { data: lexicon } = useQuery<{ kjvUseCount?: number }>({
    queryKey: [`/api/strong/${encodeURIComponent(mapping?.map.strongId || displayId)}`],
    enabled: !!target && !!(mapping?.map.strongId || displayId),
  });
  const original = entry?.lemma || mapping?.map.originalWord || "";
  const definition = entry?.definition?.trim() || "";
  const useCount = typeof lexicon?.kjvUseCount === "number" ? lexicon.kjvUseCount : undefined;
  const useLabel =
    typeof useCount === "number"
      ? `See all ${useCount} uses in the KJV`
      : "See all uses in the KJV";

  return (
    <Modal
      visible={!!target}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="Dismiss word study" />
      {target && (
        <View style={s.sheet} testID="reader-word-study-sheet">
          <View style={s.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.body}
          >
            <Text style={s.english} testID="reader-word-study-english">
              {target.surface}
            </Text>
            {original ? (
              <Text style={s.original} accessibilityLanguage={entry?.language === "he" ? "he" : "el"}>
                {original}
              </Text>
            ) : null}
            {entry?.transliteration || entry?.pronunciation ? (
              <Text style={s.translit}>
                {[entry?.transliteration, entry?.pronunciation].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            {displayId ? (
              <View style={s.chip}>
                <Text style={s.chipText}>{displayId}</Text>
              </View>
            ) : null}
            {definition ? (
              <Text style={s.definition}>{definition}</Text>
            ) : (
              <Text style={s.definitionMuted}>No lexicon definition for this number yet.</Text>
            )}
            {entry?.kjvUsage ? (
              <View style={s.usageBlock}>
                <Text style={s.usageLabel}>KJV usage</Text>
                <Text style={s.usage}>{entry.kjvUsage.replace(/^:--/, "").trim()}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={() =>
                onSeeUses(displayId || mapping?.map.strongId || "", original)
              }
              accessibilityRole="link"
              accessibilityLabel={useLabel}
              testID="reader-word-study-uses"
            >
              <Text style={s.link}>{useLabel}</Text>
            </Pressable>
            <Text style={s.footer}>{READER_WORD_STUDY_FOOTER}</Text>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: "rgba(31, 26, 18, 0.35)",
  },
  sheet: {
    backgroundColor: PathB.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    maxHeight: "72%",
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
  body: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 10,
  },
  english: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: PathB.ink,
  },
  original: {
    fontFamily: "Lora_400Regular",
    fontSize: 28,
    lineHeight: 36,
    color: PathB.ink,
  },
  translit: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B6660",
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(91, 107, 122, 0.14)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: PathB.catBible,
    letterSpacing: 0.3,
  },
  definition: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: PathB.ink,
  },
  definitionMuted: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: "#6B6660",
  },
  usageBlock: {
    gap: 4,
  },
  usageLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6B6660",
  },
  usage: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: PathB.ink,
  },
  link: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: PathB.coral,
    paddingVertical: 4,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: "#6B6660",
    marginTop: 8,
  },
});
