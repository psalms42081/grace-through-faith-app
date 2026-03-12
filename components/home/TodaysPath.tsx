import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const BOOK_IDS: Record<string, number> = {
  "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
  "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Psalm": 19,
  "Proverbs": 20, "Ecclesiastes": 21, "Song of Solomon": 22, "Isaiah": 23,
  "Jeremiah": 24, "Lamentations": 25, "Ezekiel": 26, "Daniel": 27, "Hosea": 28,
  "Joel": 29, "Amos": 30, "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34,
  "Habakkuk": 35, "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39,
  "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44, "Romans": 45,
  "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49,
  "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, "Titus": 56, "Philemon": 57, "Hebrews": 58,
  "James": 59, "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63,
  "3 John": 64, "Jude": 65, "Revelation": 66,
};

function parseReference(ref: string): { bookId: number; chapter: number } | null {
  const match = ref.match(/^(.+?)\s+(\d+)/);
  if (!match) return null;
  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const bookId = BOOK_IDS[bookName];
  if (!bookId) return null;
  return { bookId, chapter };
}

interface PathItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  completed: boolean;
  onPress: () => void;
}

interface TodaysPathProps {
  theme: any;
  isDark: boolean;
  prayerDone: boolean;
  hasRecentRead: boolean;
  dailyVerseRef?: string;
}

export default function TodaysPath({
  theme,
  isDark,
  prayerDone,
  hasRecentRead,
  dailyVerseRef,
}: TodaysPathProps) {
  const parsed = dailyVerseRef ? parseReference(dailyVerseRef) : null;

  const items: PathItem[] = [
    {
      icon: "book-outline",
      label: dailyVerseRef ? `Read ${dailyVerseRef.replace(/:\d+$/, "")}` : "Read today's passage",
      completed: hasRecentRead,
      onPress: () => {
        if (parsed) {
          router.push(`/read/${parsed.bookId}/${parsed.chapter}`);
        } else {
          router.push("/(tabs)/read");
        }
      },
    },
    {
      icon: "layers-outline",
      label: "Study",
      subtitle: "Go deeper with 4-layer study",
      completed: false,
      onPress: () => {
        if (parsed) {
          router.push({ pathname: "/(tabs)/study", params: { bookId: String(parsed.bookId), chapter: String(parsed.chapter), bookName: dailyVerseRef?.replace(/\s+\d+.*$/, "") || "" } } as any);
        } else {
          router.push("/(tabs)/explore" as any);
        }
      },
    },
    {
      icon: "hand-left-outline",
      label: "Pray",
      completed: prayerDone,
      onPress: () => router.push("/prayer-journal"),
    },
  ];

  return (
    <View style={[s.card, { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6" }]}>
      <View style={s.header}>
        <Ionicons name="sunny-outline" size={18} color={theme.accent} />
        <Text style={[s.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Your Daily Rhythm
        </Text>
      </View>
      {items.map((item, i) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [
            s.row,
            i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[s.iconWrap, { backgroundColor: item.completed ? theme.accent + "20" : (isDark ? "#1E1E38" : "#EBE5D8") }]}>
            <Ionicons
              name={item.completed ? "checkmark" : item.icon}
              size={18}
              color={item.completed ? theme.accent : (isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                s.label,
                {
                  color: item.completed ? theme.textMuted : theme.text,
                  fontFamily: "Inter_500Medium",
                  textDecorationLine: item.completed ? "line-through" : "none",
                },
              ]}
            >
              {item.label}
            </Text>
            {item.subtitle && !item.completed && (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                {item.subtitle}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
  },
});
