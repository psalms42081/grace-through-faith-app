import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

export interface BookMapEntry {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  chaptersRead: number;
  explored: boolean;
}

interface LayerSummary {
  word: number;
  context: number;
  voices: number;
  application: number;
}

const HEATMAP_COLS = 11;
const CELL_SIZE = 28;
const CELL_GAP = 3;
const CELL_RADIUS = 5;

interface BibleHeatmapProps {
  bibleMap: BookMapEntry[];
  theme: typeof Colors.dark;
  isDark: boolean;
  userId: string;
}

export default function BibleHeatmap({ bibleMap, theme, isDark, userId }: BibleHeatmapProps) {
  const [selectedBook, setSelectedBook] = useState<BookMapEntry | null>(null);

  const { data: layerSummary } = useQuery<LayerSummary>({
    queryKey: [`/api/layer-completions/book-summary?userId=${userId}&bookId=${selectedBook?.id}`],
    enabled: !!selectedBook,
  });

  const getCellColor = (book: BookMapEntry) => {
    if (!book.explored) return isDark ? "#1a1a1f" : "#e8e4df";
    const ratio = Math.min(book.chaptersRead / Math.max(book.chapterCount, 1), 1);
    if (ratio >= 0.8) return "#C9933A";
    if (ratio >= 0.4) return "rgba(201,147,58,0.65)";
    return "rgba(201,147,58,0.30)";
  };

  return (
    <View>
      <View style={styles.grid}>
        {bibleMap.map((book) => {
          const isSelected = selectedBook?.id === book.id;
          return (
            <Pressable
              key={book.id}
              onPress={() => setSelectedBook(isSelected ? null : book)}
              accessibilityLabel={`${book.name}: ${book.chaptersRead} of ${book.chapterCount} chapters`}
              style={[
                styles.cell,
                {
                  backgroundColor: getCellColor(book),
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: isSelected ? theme.accent : "transparent",
                },
              ]}
            />
          );
        })}
      </View>

      {selectedBook && (
        <View style={[styles.tooltip, { backgroundColor: isDark ? "#1c1c22" : "#f0ede8" }]}>
          <Text style={[styles.tooltipName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {selectedBook.name}
          </Text>
          <Text style={[styles.tooltipDetail, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {selectedBook.chaptersRead} of {selectedBook.chapterCount} chapters read
          </Text>
          {layerSummary && (layerSummary.word > 0 || layerSummary.context > 0 || layerSummary.voices > 0 || layerSummary.application > 0) && (
            <View style={styles.layerSummary}>
              {[
                { key: "word", label: "Text" },
                { key: "context", label: "Context" },
                { key: "voices", label: "Insight" },
                { key: "application", label: "Transform" },
              ].map((l) => {
                const pct = layerSummary[l.key as keyof LayerSummary];
                return (
                  <View key={l.key} style={styles.layerRow}>
                    <Text style={[styles.layerLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {l.label}
                    </Text>
                    <View style={[styles.layerBarBg, { backgroundColor: isDark ? "#2a2a2f" : "#ddd8d0" }]}>
                      <View style={[styles.layerBarFill, { width: `${pct}%` as any, backgroundColor: theme.accent }]} />
                    </View>
                    <Text style={[styles.layerPct, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={styles.legendRow}>
        <View style={styles.legendGroup}>
          <Text style={[styles.legendLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            OT
          </Text>
          <Text style={[styles.legendCount, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {bibleMap.filter((b) => b.testament === "OT" && b.explored).length}/39
          </Text>
        </View>
        <View style={styles.legendGroup}>
          <Text style={[styles.legendLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            NT
          </Text>
          <Text style={[styles.legendCount, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {bibleMap.filter((b) => b.testament === "NT" && b.explored).length}/27
          </Text>
        </View>
        <View style={styles.legendSpacer} />
        <View style={styles.legendScaleRow}>
          <View style={[styles.legendDot, { backgroundColor: isDark ? "#1a1a1f" : "#e8e4df" }]} />
          <View style={[styles.legendDot, { backgroundColor: "rgba(201,147,58,0.30)" }]} />
          <View style={[styles.legendDot, { backgroundColor: "rgba(201,147,58,0.65)" }]} />
          <View style={[styles.legendDot, { backgroundColor: "#C9933A" }]} />
          <Text style={[styles.legendLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            depth
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL_GAP,
    justifyContent: "center",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
  },
  tooltip: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  tooltipName: { fontSize: 15, marginBottom: 2 },
  tooltipDetail: { fontSize: 12 },
  layerSummary: {
    marginTop: 10,
    width: "100%",
    gap: 6,
  },
  layerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layerLabel: {
    fontSize: 10,
    width: 56,
    letterSpacing: 0.2,
  },
  layerBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  layerBarFill: {
    height: 6,
    borderRadius: 3,
  },
  layerPct: {
    fontSize: 10,
    width: 28,
    textAlign: "right",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 12,
  },
  legendGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendLabel: { fontSize: 11 },
  legendCount: { fontSize: 12 },
  legendSpacer: { flex: 1 },
  legendScaleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
