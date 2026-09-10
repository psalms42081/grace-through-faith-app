import React, { useState } from "react";
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
  buildConcordanceSnippet,
  concordanceHeading,
  formatUseReference,
  type ConcordanceBookCount,
  type ConcordanceSnippet,
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
  filteredTotal?: number;
  limit: number;
  offset: number;
  bookId?: number | null;
  books?: ConcordanceBookCount[];
  uses: StrongConcordanceUse[];
};

const PAGE = 80;

function ConcordanceSnippetText({ snippet }: { snippet: ConcordanceSnippet }) {
  return (
    <Text style={s.snippet}>
      {snippet.leadingEllipsis ? "…" : null}
      {snippet.parts.map((part, index) => (
        <Text key={`${index}-${part.bold ? "b" : "n"}`} style={part.bold ? s.snippetBold : undefined}>
          {part.text}
        </Text>
      ))}
      {snippet.trailingEllipsis ? "…" : null}
    </Text>
  );
}

export default function StrongConcordanceScreen() {
  const { strong, lemma: lemmaParam } = useLocalSearchParams<{
    strong?: string;
    lemma?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { translation } = useTranslation();
  const strongId = formatStrongId(typeof strong === "string" ? strong : "");
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [bookId, setBookId] = useState<number | null>(null);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const searchQuery = useQuery<LexiconHit[]>({
    queryKey: [`/api/strong/search?q=${encodeURIComponent(strongId)}`],
    enabled: strongId.length >= 2,
  });

  const entry = searchQuery.data?.[0];

  const usesKey = bookId
    ? `/api/strong/${encodeURIComponent(strongId)}/uses?limit=${visibleCount}&offset=0&bookId=${bookId}`
    : `/api/strong/${encodeURIComponent(strongId)}/uses?limit=${visibleCount}&offset=0`;

  const usesQuery = useQuery<UsesResponse>({
    queryKey: [usesKey],
    enabled: strongId.length >= 2,
  });

  const uses = usesQuery.data?.uses ?? [];
  const total = usesQuery.data?.total ?? 0;
  const filteredTotal = usesQuery.data?.filteredTotal ?? total;
  const books = usesQuery.data?.books ?? [];
  const canLoadMore = uses.length < filteredTotal;
  const heading = concordanceHeading(
    entry?.id || strongId,
    entry?.lemma || lemmaParam,
    entry?.transliteration,
    total || undefined,
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: formatStrongId(entry?.id || strongId) || "Concordance",
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
        {entry?.definition ? (
          <Text style={s.definition}>{entry.definition}</Text>
        ) : null}

        {books.length > 0 ? (
          <View style={s.bookRow} testID="strong-concordance-books">
            {books.map((book, index) => {
              const selected = bookId === book.bookId;
              return (
                <View key={book.bookId} style={s.bookChipWrap}>
                  {index > 0 ? <Text style={s.bookDot}> · </Text> : null}
                  <Pressable
                    onPress={() => {
                      setVisibleCount(PAGE);
                      setBookId((current) => (current === book.bookId ? null : book.bookId));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${book.bookName} ${book.count}`}
                    testID={`strong-concordance-book-${book.bookId}`}
                    style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
                  >
                    <Text style={[s.bookChip, selected && s.bookChipOn]}>
                      {book.bookName} {book.count}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {searchQuery.isLoading || usesQuery.isLoading ? (
          <ActivityIndicator color={PathB.coral} style={{ marginTop: 28 }} />
        ) : null}

        {uses.map((row) => {
          const ref = formatUseReference(row.bookName, row.chapter, row.verse);
          const snippet = buildConcordanceSnippet(row.text, row.translatedWords ?? []);
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
                <ConcordanceSnippetText snippet={snippet} />
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
    fontSize: 22,
    lineHeight: 30,
    color: PathB.ink,
  },
  definition: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: PathB.ink,
    marginBottom: 4,
  },
  bookRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4,
  },
  bookChipWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookDot: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B6660",
  },
  bookChip: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
    color: PathB.coral,
  },
  bookChipOn: {
    textDecorationLine: "underline",
    color: PathB.ink,
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
  snippetBold: {
    fontFamily: "Lora_700Bold",
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
