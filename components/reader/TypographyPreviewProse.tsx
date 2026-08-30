import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  groupVersesByParagraphStarts,
  splitParagraphGroupAtHeadings,
} from "@/lib/group-verses-by-paragraph";

export interface PreviewVerse {
  id: string;
  verse: number;
  text: string;
}

export { groupVersesByParagraphStarts, splitParagraphGroupAtHeadings };

export function TypographyPreviewProse({
  verses,
  headingsByVerse,
  paragraphStarts,
  fontScale,
  getHighlightBg,
  onVerseTap,
  onVerseLongPress,
  activeVerse,
  bookmarkedVerseIds,
  bookId,
  chapterNum,
}: {
  verses: PreviewVerse[];
  headingsByVerse: Map<number, string[]>;
  paragraphStarts: Set<number>;
  fontScale: number;
  getHighlightBg: (verseId: string, verseNum: number, index: number) => string;
  onVerseTap: (verse: PreviewVerse) => void;
  onVerseLongPress: (verse: PreviewVerse) => void;
  activeVerse: number | null;
  bookmarkedVerseIds: Set<string>;
  bookId: string;
  chapterNum: number;
}) {
  const groups = groupVersesByParagraphStarts(verses, paragraphStarts);
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    verses.forEach((v, i) => map.set(v.id, i));
    return map;
  }, [verses]);
  const bodySize = 18 * fontScale;
  const bodyLine = 32 * fontScale;
  const superSize = 10 * fontScale;

  return (
    <View style={s.prose} testID="reader-typography-preview-prose">
      {groups.map((group) => {
        const runs = splitParagraphGroupAtHeadings(group, headingsByVerse);
        return runs.map((run) => {
          const lead = run.verses[0];
          return (
            <View key={`p-${lead.id}`} style={s.paragraphBlock}>
              {run.headings.map((heading, headingIndex) => (
                <Text
                  key={`${lead.id}-heading-${headingIndex}`}
                  style={s.heading}
                  accessibilityRole="header"
                >
                  {heading}
                </Text>
              ))}
              <Text style={[s.body, { fontSize: bodySize, lineHeight: bodyLine }]}>
                {run.verses.map((v) => {
                  const index = indexById.get(v.id) ?? -1;
                  const highlightBg = getHighlightBg(v.id, v.verse, index);
                  const isActive = activeVerse === v.verse;
                  const isBookmarked =
                    bookmarkedVerseIds.has(v.id) ||
                    bookmarkedVerseIds.has(`${bookId}:${chapterNum}:${v.verse}`);
                  const bg =
                    isActive
                      ? "rgba(31,26,18,0.06)"
                      : highlightBg !== "transparent"
                        ? highlightBg
                        : "transparent";
                  return (
                    <Text
                      key={v.id}
                      onPress={() => onVerseTap(v)}
                      onLongPress={() => onVerseLongPress(v)}
                      delayLongPress={400}
                      style={{ backgroundColor: bg }}
                      accessibilityRole="button"
                      accessibilityLabel={`Verse ${v.verse}`}
                    >
                      <Text style={[s.verseNum, { fontSize: superSize, lineHeight: bodyLine * 0.72 }]}>
                        {v.verse}{" "}
                      </Text>
                      {v.text}
                      {isBookmarked ? <Text style={s.bookmarkMark}> ◆</Text> : null}
                      {" "}
                    </Text>
                  );
                })}
              </Text>
            </View>
          );
        });
      })}
    </View>
  );
}

const s = StyleSheet.create({
  prose: {
    paddingBottom: 24,
  },
  paragraphBlock: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: "Lora_700Bold",
    color: "#1F1A12",
    marginTop: 8,
    marginBottom: 10,
  },
  body: {
    fontFamily: "Lora_400Regular",
    color: "#1F1A12",
    letterSpacing: 0.15,
  },
  verseNum: {
    fontFamily: "Inter_600SemiBold",
    color: "#6B6660",
  },
  bookmarkMark: {
    color: "#6B6660",
    fontSize: 10,
  },
});
