import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const HOME_IMAGES = {
  read: require("@/assets/home-cards/read.png"),
  study: require("@/assets/home-cards/study.png"),
};

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
  image: any;
  label: string;
  subtitle: string;
  completed: boolean;
  onPress: () => void;
}

interface TodaysPathProps {
  theme: any;
  isDark: boolean;
  hasRecentRead: boolean;
  dailyVerseRef?: string;
}

export default function TodaysPath({
  theme,
  isDark,
  hasRecentRead,
  dailyVerseRef,
}: TodaysPathProps) {
  const parsed = dailyVerseRef ? parseReference(dailyVerseRef) : null;

  const items: PathItem[] = [
    {
      image: HOME_IMAGES.read,
      label: "Today's Reading",
      subtitle: "Open Scripture in quiet devotion",
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
      image: HOME_IMAGES.study,
      label: "Study",
      subtitle: "Reflect on today's passage",
      completed: false,
      onPress: () => router.push("/(tabs)/explore"),
    },
  ];

  return (
    <View style={s.container}>
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
            s.card,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Image source={item.image} style={s.cardImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.68)"]}
            locations={[0, 0.5, 1]}
            style={s.cardOverlay}
          >
            <View style={s.cardContent}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardLabel, { fontFamily: "Inter_600SemiBold" }]}>
                  {item.label}
                </Text>
                <Text style={[s.cardSubtitle, { fontFamily: "Inter_400Regular" }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    height: 100,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 2,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(78,204,163,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
});
