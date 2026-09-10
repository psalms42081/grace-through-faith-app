import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { PathB } from "@/constants/colors";
import { formatStrongId } from "@/lib/reader-word-study";
import {
  concordanceHeading,
  formatUseReference,
  type StrongConcordanceUse,
} from "@/lib/strong-concordance";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";
import { READER_WORD_STUDY_FOOTER } from "@/lib/word-study-attribution";
import { useTranslation } from "@/context/TranslationContext";

type LexiconHit = {
  id: string;
  lemma: string;
  transliteration?: string | null;
  definition?: string;
};

type UsesResponse = {
  strongId: string;
  total: number;
  limit: number;
  offset: number;
  uses: StrongConcordanceUse[];
};

const PAGE = 80;

export default function StrongConcordanceScreen() {
  const { strong, lemma: lemmaParam } = useLocalSearchParams<{
    strong?: string;
    lemma?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { translation } = useTranslation();
  const strongId = formatStrongId(typeof strong === "string" ? strong : "");
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const searchQuery = useQuery<LexiconHit[]>({
    queryKey: [`/api/strong/search?q=${encodeURIComponent(strongId)}`],
    enabled: strongId.length >= 2,
  });

  const entry = searchQuery.data?.[0];
  const heading = concordanceHeading(entry?.id || strongId, entry?.lemma || lemmaParam);

  const usesQuery = useQuery<UsesResponse>({
    queryKey: [`/api/strong/${encodeURIComponent(strongId)}/uses?limit=${visibleCount}&offset=0`],
    enabled: strongId.length >= 2,
  });

  const uses = usesQuery.data?.uses ?? [];
  const total = usesQuery.data?.total ?? 0;
  const canLoadMore = uses.length < total;

  const subtitle = useMemo(() => {
    if (!total) return "KJV occurrences";
    return `${total} uses in the KJV`;
  }, [total]);

  return (
    <>
      <Stack.Screen
        options={{
          title: heading,
          headerStyle: { backgroundColor: PathB.surface },
          headerTintColor: PathB.ink,
        }}
      />
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.body, { paddingBottom: bottomPad + 28 }]}
        testID="strong-concordance-list"
      >
        <Text style={s.heading} testID="strong-concordance-heading">
          {heading}
        </Text>
        {entry?.transliteration ? (
          <Text style={s.translit}>{entry.transliteration}</Text>
        ) : null}
        <Text style={s.meta}>{subtitle}</Text>
        {entry?.definition ? (
          <Text style={s.definition}>{entry.definition}</Text>
        ) : null}

        {searchQuery.isLoading || usesQuery.isLoading ? (
          <ActivityIndicator color={PathB.coral} style={{ marginTop: 28 }} />
        ) : null}

        {uses.map((row) => {
          const ref = formatUseReference(row.bookName, row.chapter, row.verse);
          return (
            <Pressable
              key={`${row.verseId}-${row.verse}`}
              onPress={() =>
                navigateToScriptureByParts(row.bookId, row.chapter, row.verse, translation)
              }
              accessibilityRole="link"
              accessibilityLabel={ref}
              testID={`strong-concordance-ref-${row.bookId}-${row.chapter}-${row.verse}`}
              style={({ pressed }) => [s.row, { opacity: pressed ? 0.65 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.ref}>{ref}</Text>
                <Text style={s.snippet} numberOfLines={3}>
                  {row.text}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B6660" />
            </Pressable>
          );
        })}

        {!usesQuery.isLoading && uses.length === 0 ? (
          <Text style={s.empty}>No KJV occurrences found for this number.</Text>
        ) : null}

        {canLoadMore ? (
          <Pressable
            onPress={() => setVisibleCount((n) => n + PAGE)}
            style={({ pressed }) => [s.more, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Text style={s.moreText}>Load more</Text>
          </Pressable>
        ) : null}

        <Text style={s.footer}>{READER_WORD_STUDY_FOOTER}</Text>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PathB.surface },
  body: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  heading: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: PathB.ink,
  },
  translit: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B6660",
    marginTop: -4,
  },
  meta: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#6B6660",
  },
  definition: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: PathB.ink,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7E0D2",
  },
  ref: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: PathB.coral,
    marginBottom: 4,
  },
  snippet: {
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: PathB.ink,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#6B6660",
    marginTop: 16,
  },
  more: {
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1EBDD",
  },
  moreText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: PathB.ink,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: "#6B6660",
    marginTop: 16,
  },
});
