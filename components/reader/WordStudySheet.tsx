import React, { useEffect, useState } from "react";
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
import { formatStrongId, isAiWordStudyMap, type ReaderStrongMap } from "@/lib/reader-word-study";
import { AIGeneratedLabel } from "@/components/AIGeneratedLabel";
import { expandStepMorph } from "@/lib/step-morph";
import {
  lexiconFullDefinition,
  lexiconShortMeaning,
  wordStudyEnglishPhrase,
  wordStudyPlainSentence,
} from "@/lib/word-study-copy";
import { READER_WORD_STUDY_FOOTER } from "@/lib/word-study-attribution";

export type WordStudySheetTarget = {
  surface: string;
  mapping: ReaderStrongMap;
  bookName?: string;
  chapter?: number;
  verse?: number;
  verseText?: string;
  useCount?: number;
};

type LexiconPayload = {
  kjvUseCount?: number;
  definition?: string;
  extendedDefinition?: string | null;
  derivation?: string | null;
  lemma?: string;
  transliteration?: string | null;
  language?: string;
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
  const [showMore, setShowMore] = useState(false);
  const mapping = target?.mapping;
  const entry = mapping?.entry;
  const displayId = formatStrongId(mapping?.map.strongId || entry?.id || "");
  const { data: lexicon } = useQuery<LexiconPayload>({
    queryKey: [`/api/strong/${encodeURIComponent(mapping?.map.strongId || displayId)}`],
    enabled: !!target && !!(mapping?.map.strongId || displayId),
  });

  useEffect(() => {
    setShowMore(false);
  }, [target?.surface, mapping?.map.strongId, target?.verse]);

  const original = entry?.lemma || mapping?.map.originalWord || lexicon?.lemma || "";
  const transliteration = entry?.transliteration || lexicon?.transliteration || "";
  const language = entry?.language || lexicon?.language || "";
  const definition = entry?.definition || lexicon?.definition || "";
  const extended = entry?.extendedDefinition || lexicon?.extendedDefinition || "";
  const derivation = (entry?.derivation || lexicon?.derivation || "").trim();
  const morphLine = expandStepMorph(mapping?.map.morph, language);
  const fullDefinition = lexiconFullDefinition(definition, extended);
  const shortMeaning = lexiconShortMeaning(definition, entry?.kjvUsage);
  const useCount = typeof lexicon?.kjvUseCount === "number" ? lexicon.kjvUseCount : undefined;
  const useLabel =
    typeof useCount === "number"
      ? `See all ${useCount} uses in the KJV`
      : "See all uses in the KJV";
  const englishPhrase = target
    ? wordStudyEnglishPhrase({
        surface: target.surface,
        verseText: target.verseText,
        translatedWord: mapping?.map.translatedWord,
        kjvUsage: entry?.kjvUsage,
      })
    : "";
  const plainSentence = target
    ? wordStudyPlainSentence({
        bookName: target.bookName,
        chapter: target.chapter,
        verse: target.verse,
        language,
        lemma: original,
        transliteration,
        surface: englishPhrase,
      })
    : "";

  const usesLink = target ? (
    <Pressable
      onPress={() => onSeeUses(displayId || mapping?.map.strongId || "", original)}
      accessibilityRole="link"
      accessibilityLabel={useLabel}
      testID="reader-word-study-uses"
    >
      <Text style={s.link}>{useLabel}</Text>
    </Pressable>
  ) : null;

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
              {englishPhrase}
            </Text>
            {mapping && isAiWordStudyMap(mapping.map) ? (
              <View style={{ marginBottom: 8 }}>
                <AIGeneratedLabel />
              </View>
            ) : null}
            {plainSentence ? (
              <Text style={s.plain} testID="reader-word-study-plain">
                {plainSentence}
              </Text>
            ) : null}
            {shortMeaning ? (
              <Text style={s.meaning} testID="reader-word-study-meaning">
                {shortMeaning}
              </Text>
            ) : null}

            <Pressable
              onPress={() => setShowMore((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showMore }}
              testID="reader-word-study-more"
            >
              <Text style={s.moreToggle}>{showMore ? "Show less" : "Show more"}</Text>
            </Pressable>

            {showMore ? (
              <View style={s.moreBlock} testID="reader-word-study-details">
                {displayId ? (
                  <View style={s.chip}>
                    <Text style={s.chipText}>{displayId}</Text>
                  </View>
                ) : null}
                {morphLine ? (
                  <Text style={s.morph} testID="reader-word-study-morph">
                    {morphLine}
                  </Text>
                ) : null}
                {fullDefinition ? (
                  <Text style={s.definition}>{fullDefinition}</Text>
                ) : (
                  <Text style={s.definitionMuted}>No lexicon definition for this number yet.</Text>
                )}
                {derivation ? (
                  <Text style={s.derivation} testID="reader-word-study-derivation">
                    {derivation}
                  </Text>
                ) : null}
                {entry?.kjvUsage ? (
                  <View style={s.usageBlock}>
                    <Text style={s.usageLabel}>KJV usage</Text>
                    <Text style={s.usage}>{entry.kjvUsage.replace(/^:--/, "").trim()}</Text>
                  </View>
                ) : null}
                {usesLink}
              </View>
            ) : (
              usesLink
            )}
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
  plain: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: PathB.ink,
  },
  meaning: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: PathB.ink,
  },
  moreToggle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#6B6660",
    paddingVertical: 2,
  },
  moreBlock: {
    gap: 10,
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
  morph: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#6B6660",
    marginTop: -4,
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
  derivation: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
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
