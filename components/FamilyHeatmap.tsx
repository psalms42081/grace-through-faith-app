import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  Modal,
} from "react-native";
import Svg, { Rect, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useProStatus } from "@/contexts/ProContext";
import { useAuth } from "@/contexts/AuthContext";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface BookHeat {
  bookId: number;
  bookName: string;
  progress: number;
  conquered: boolean;
  members: { name: string; role: string; progress: number }[];
}

interface HeatmapData {
  books: BookHeat[];
  familyQuest: {
    bookName: string;
    message: string;
  } | null;
}

const BIBLE_SECTIONS: { label: string; books: { id: number; abbr: string }[] }[] = [
  {
    label: "Law",
    books: [
      { id: 1, abbr: "Gen" }, { id: 2, abbr: "Exo" }, { id: 3, abbr: "Lev" },
      { id: 4, abbr: "Num" }, { id: 5, abbr: "Deu" },
    ],
  },
  {
    label: "History",
    books: [
      { id: 6, abbr: "Jos" }, { id: 7, abbr: "Jdg" }, { id: 8, abbr: "Rut" },
      { id: 9, abbr: "1Sa" }, { id: 10, abbr: "2Sa" }, { id: 11, abbr: "1Ki" },
      { id: 12, abbr: "2Ki" }, { id: 13, abbr: "1Ch" }, { id: 14, abbr: "2Ch" },
      { id: 15, abbr: "Ezr" }, { id: 16, abbr: "Neh" }, { id: 17, abbr: "Est" },
    ],
  },
  {
    label: "Poetry",
    books: [
      { id: 18, abbr: "Job" }, { id: 19, abbr: "Psa" }, { id: 20, abbr: "Pro" },
      { id: 21, abbr: "Ecc" }, { id: 22, abbr: "Sng" },
    ],
  },
  {
    label: "Major Prophets",
    books: [
      { id: 23, abbr: "Isa" }, { id: 24, abbr: "Jer" }, { id: 25, abbr: "Lam" },
      { id: 26, abbr: "Eze" }, { id: 27, abbr: "Dan" },
    ],
  },
  {
    label: "Minor Prophets",
    books: [
      { id: 28, abbr: "Hos" }, { id: 29, abbr: "Joe" }, { id: 30, abbr: "Amo" },
      { id: 31, abbr: "Oba" }, { id: 32, abbr: "Jon" }, { id: 33, abbr: "Mic" },
      { id: 34, abbr: "Nah" }, { id: 35, abbr: "Hab" }, { id: 36, abbr: "Zep" },
      { id: 37, abbr: "Hag" }, { id: 38, abbr: "Zec" }, { id: 39, abbr: "Mal" },
    ],
  },
  {
    label: "Gospels & Acts",
    books: [
      { id: 40, abbr: "Mat" }, { id: 41, abbr: "Mar" }, { id: 42, abbr: "Luk" },
      { id: 43, abbr: "Joh" }, { id: 44, abbr: "Act" },
    ],
  },
  {
    label: "Epistles",
    books: [
      { id: 45, abbr: "Rom" }, { id: 46, abbr: "1Co" }, { id: 47, abbr: "2Co" },
      { id: 48, abbr: "Gal" }, { id: 49, abbr: "Eph" }, { id: 50, abbr: "Php" },
      { id: 51, abbr: "Col" }, { id: 52, abbr: "1Th" }, { id: 53, abbr: "2Th" },
      { id: 54, abbr: "1Ti" }, { id: 55, abbr: "2Ti" }, { id: 56, abbr: "Tit" },
      { id: 57, abbr: "Phm" }, { id: 58, abbr: "Heb" }, { id: 59, abbr: "Jas" },
      { id: 60, abbr: "1Pe" }, { id: 61, abbr: "2Pe" }, { id: 62, abbr: "1Jn" },
      { id: 63, abbr: "2Jn" }, { id: 64, abbr: "3Jn" }, { id: 65, abbr: "Jud" },
    ],
  },
  {
    label: "Prophecy",
    books: [
      { id: 66, abbr: "Rev" },
    ],
  },
];

function getHeatColor(progress: number, conquered: boolean, isDark: boolean): string {
  if (conquered) return "#C9933A";
  if (progress >= 76) return "#9B59B6";
  if (progress >= 26) return isDark ? "#3B82F6" : "#2563EB";
  if (progress >= 1) return isDark ? "#93C5FD" : "#BFDBFE";
  return isDark ? "#2A2A3A" : "#E5E7EB";
}

function getHeatLabel(progress: number, conquered: boolean): string {
  if (conquered) return "Mastered";
  if (progress >= 76) return "Thriving";
  if (progress >= 26) return "Deepening";
  if (progress >= 1) return "First Steps";
  return "Unexplored";
}

function HeatSquare({
  bookId,
  abbr,
  progress,
  conquered,
  isDark,
  index,
  onPress,
  cellSize,
}: {
  bookId: number;
  abbr: string;
  progress: number;
  conquered: boolean;
  isDark: boolean;
  index: number;
  onPress: () => void;
  cellSize: number;
}) {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withDelay(
      index * 30,
      withTiming(progress / 100, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    width: fillWidth.value * (cellSize - 2),
  }));

  const color = getHeatColor(progress, conquered, isDark);
  const bgColor = isDark ? "#1A1A2E" : "#F3F4F6";

  return (
    <Pressable onPress={onPress} testID={`heatmap-book-${bookId}`}>
      <Svg width={cellSize} height={cellSize}>
        <Rect
          x={1}
          y={1}
          width={cellSize - 2}
          height={cellSize - 2}
          rx={4}
          fill={bgColor}
          stroke={conquered ? "#C9933A" : "transparent"}
          strokeWidth={conquered ? 2 : 0}
        />
        <AnimatedRect
          x={1}
          y={1}
          animatedProps={animatedProps}
          height={cellSize - 2}
          rx={4}
          fill={color}
          opacity={0.85}
        />
        <Rect x={1} y={1} width={cellSize - 2} height={cellSize - 2} rx={4} fill="transparent" />
      </Svg>
      <View style={[squareStyles.labelContainer, { width: cellSize, height: cellSize }]}>
        <Text style={[squareStyles.label, { color: progress > 25 ? "#fff" : isDark ? "#888" : "#666", fontSize: cellSize < 36 ? 7 : 8 }]}>
          {abbr}
        </Text>
      </View>
    </Pressable>
  );
}

const squareStyles = StyleSheet.create({
  labelContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});

function BookPopup({
  visible,
  book,
  isDark,
  theme,
  onClose,
}: {
  visible: boolean;
  book: BookHeat | null;
  isDark: boolean;
  theme: any;
  onClose: () => void;
}) {
  if (!book) return null;
  const color = getHeatColor(book.progress, book.conquered, isDark);
  const label = getHeatLabel(book.progress, book.conquered);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={popupStyles.overlay} onPress={onClose}>
        <View style={[popupStyles.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={popupStyles.titleRow}>
            <View style={[popupStyles.dot, { backgroundColor: color }]} />
            <Text style={[popupStyles.bookName, { color: theme.text }]}>{book.bookName}</Text>
            <Text style={[popupStyles.statusBadge, { backgroundColor: color + "25", color }]}>{label}</Text>
          </View>

          <View style={popupStyles.progressRow}>
            <View style={[popupStyles.progressBar, { backgroundColor: isDark ? "#2A2A3A" : "#E5E7EB" }]}>
              <View style={[popupStyles.progressFill, { width: `${book.progress}%`, backgroundColor: color }]} />
            </View>
            <Text style={[popupStyles.progressText, { color: theme.textSecondary }]}>{book.progress}%</Text>
          </View>

          {book.members.length > 0 && (
            <View style={popupStyles.memberList}>
              {book.members.map((m, i) => (
                <View key={i} style={popupStyles.memberRow}>
                  <Ionicons
                    name={m.role === "parent" ? "person" : "happy"}
                    size={14}
                    color={theme.accent}
                  />
                  <Text style={[popupStyles.memberName, { color: theme.text }]}>{m.name}</Text>
                  <View style={[popupStyles.memberBar, { backgroundColor: isDark ? "#2A2A3A" : "#E5E7EB" }]}>
                    <View
                      style={[
                        popupStyles.memberFill,
                        {
                          width: `${m.progress}%`,
                          backgroundColor: getHeatColor(m.progress, false, isDark),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[popupStyles.memberPct, { color: theme.textMuted }]}>{m.progress}%</Text>
                </View>
              ))}
            </View>
          )}

          {book.conquered && (
            <View style={popupStyles.conqueredBanner}>
              <Ionicons name="trophy" size={16} color="#C9933A" />
              <Text style={[popupStyles.conqueredText, { color: "#C9933A" }]}>
                Family Conquered
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    gap: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bookName: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
    flex: 1,
  },
  statusBadge: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    minWidth: 36,
    textAlign: "right",
  },
  memberList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    width: 80,
  },
  memberBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  memberFill: {
    height: "100%",
    borderRadius: 2,
  },
  memberPct: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    minWidth: 30,
    textAlign: "right",
  },
  conqueredBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(201,147,58,0.1)",
  },
  conqueredText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});

const LEGEND_ITEMS = [
  { label: "Unexplored", progress: 0 },
  { label: "First Steps", progress: 10 },
  { label: "Deepening", progress: 50 },
  { label: "Thriving", progress: 85 },
  { label: "Mastered", progress: 100 },
];

export default function FamilyHeatmap() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { isPro, isPatron } = useProStatus();
  const { userId } = useAuth();
  const [selectedBook, setSelectedBook] = useState<BookHeat | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const { data: heatmapData } = useQuery<HeatmapData>({
    queryKey: [`/api/family/heatmap?userId=${userId}`],
    enabled: isPro,
  });

  const getBookHeat = useCallback(
    (bookId: number): BookHeat => {
      const found = heatmapData?.books.find((b) => b.bookId === bookId);
      return found || { bookId, bookName: "", progress: 0, conquered: false, members: [] };
    },
    [heatmapData]
  );

  const handlePress = useCallback((bookId: number) => {
    const heat = getBookHeat(bookId);
    setSelectedBook(heat);
    setPopupVisible(true);
  }, [getBookHeat]);

  const cellSize = Platform.OS === "web" ? 34 : 36;
  const gap = 3;
  let globalIndex = 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundCard, borderColor: isPatron ? "#C9933A" : theme.border, borderWidth: isPatron ? 2 : 1 }]}>
      {heatmapData?.familyQuest && (
        <View style={[styles.questBanner, { backgroundColor: theme.accent + "12" }]}>
          <Ionicons name="compass" size={18} color={theme.accent} />
          <Text style={[styles.questText, { color: theme.text }]} numberOfLines={2}>
            {heatmapData.familyQuest.message}
          </Text>
        </View>
      )}

      <View style={styles.titleRow}>
        <Ionicons name="map" size={18} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>Family Kingdom Map</Text>
      </View>

      {BIBLE_SECTIONS.map((section) => {
        const sectionItems = section.books.map((book) => {
          const heat = getBookHeat(book.id);
          const idx = globalIndex++;
          return (
            <HeatSquare
              key={book.id}
              bookId={book.id}
              abbr={book.abbr}
              progress={heat.progress}
              conquered={heat.conquered}
              isDark={isDark}
              index={idx}
              onPress={() => handlePress(book.id)}
              cellSize={cellSize}
            />
          );
        });

        return (
          <View key={section.label} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              {section.label}
            </Text>
            <View style={[styles.grid, { gap }]}>
              {sectionItems}
            </View>
          </View>
        );
      })}

      <View style={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: getHeatColor(item.progress, item.progress === 100, isDark),
                  borderWidth: item.progress === 100 ? 1 : 0,
                  borderColor: "#C9933A",
                },
              ]}
            />
            <Text style={[styles.legendLabel, { color: theme.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <BookPopup
        visible={popupVisible}
        book={selectedBook}
        isDark={isDark}
        theme={theme}
        onClose={() => setPopupVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  questBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  questText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  section: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
});
