import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

const BOOK_NAME_TO_ID: Record<string, number> = {
  "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
  "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19,
  "Proverbs": 20, "Ecclesiastes": 21, "Song of Solomon": 22, "Psalm": 19, "Isaiah": 23,
  "Jeremiah": 24, "Lamentations": 25, "Ezekiel": 26, "Daniel": 27,
  "Hosea": 28, "Joel": 29, "Amos": 30, "Obadiah": 31, "Jonah": 32,
  "Micah": 33, "Nahum": 34, "Habakkuk": 35, "Zephaniah": 36, "Haggai": 37,
  "Zechariah": 38, "Malachi": 39, "Matthew": 40, "Mark": 41, "Luke": 42,
  "John": 43, "Acts": 44, "Romans": 45, "1 Corinthians": 46,
  "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49, "Philippians": 50,
  "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, "Titus": 56, "Philemon": 57,
  "Hebrews": 58, "James": 59, "1 Peter": 60, "2 Peter": 61,
  "1 John": 62, "2 John": 63, "3 John": 64, "Jude": 65, "Revelation": 66,
};

export interface ParsedPassage {
  bookName: string;
  bookId: number;
  chapter: number;
  verse: number;
  reference: string;
}

export function parsePassageReference(passage: string): ParsedPassage | null {
  const match = passage.match(/^(\d?\s?[A-Za-z]+)\s+(\d+):?(\d+)?/);
  if (!match) return null;
  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : 1;
  const bookId = BOOK_NAME_TO_ID[bookName];
  if (!bookId) return null;
  return { bookName, chapter, verse, bookId, reference: passage };
}

interface RelatedStudiesSectionProps {
  keyPassages: string[];
  entityName: string;
  showProphecyExplorer?: boolean;
  showHistoricVoices?: boolean;
  showViewOnMap?: boolean;
  mapParams?: Record<string, string>;
  showViewOnTimeline?: boolean;
  timelineParams?: Record<string, string>;
}

interface StudyAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress: () => void;
}

export default function RelatedStudiesSection({
  keyPassages,
  entityName,
  showProphecyExplorer = false,
  showHistoricVoices = false,
  showViewOnMap = false,
  mapParams,
  showViewOnTimeline = false,
  timelineParams,
}: RelatedStudiesSectionProps) {
  const { theme } = useTheme();
  const parsed = keyPassages.length > 0 ? parsePassageReference(keyPassages[0]) : null;

  const actions: StudyAction[] = [];

  if (keyPassages.length > 0) {
    actions.push({
      id: "read",
      icon: "book-outline",
      iconColor: "#3B82F6",
      title: "Read Passages",
      subtitle: parsed ? `Start with ${keyPassages[0]}` : "No passages available",
      disabled: !parsed,
      onPress: () => {
        if (parsed) {
          router.push(`/read/${parsed.bookId}/${parsed.chapter}` as any);
        }
      },
    });

    actions.push({
      id: "guided",
      icon: "chatbubbles-outline",
      iconColor: "#8B5CF6",
      title: "Start Guided Study",
      subtitle: parsed ? `Guided session on ${keyPassages[0]}` : "No passages available",
      disabled: !parsed,
      onPress: () => {
        if (parsed) {
          router.push({
            pathname: "/study-guide",
            params: {
              verseReference: parsed.reference,
              verseText: `${entityName} - ${parsed.reference}`,
              bookName: parsed.bookName,
              chapter: String(parsed.chapter),
              verse: String(parsed.verse),
            },
          } as any);
        }
      },
    });

    actions.push({
      id: "deep",
      icon: "layers-outline",
      iconColor: "#C9933A",
      title: "Start Deep Dive",
      subtitle: parsed ? `Deep Dive on ${keyPassages[0]}` : "No passages available",
      disabled: !parsed,
      onPress: () => {
        if (parsed) {
          router.push({
            pathname: "/deep-study-picker-v2",
            params: {
              bookId: String(parsed.bookId),
              chapter: String(parsed.chapter),
            },
          } as any);
        }
      },
    });
  }

  if (showHistoricVoices && parsed) {
    actions.push({
      id: "historic-voices",
      icon: "mic-outline",
      iconColor: "#EC4899",
      title: "Open Historic Voices",
      subtitle: `Commentary on ${keyPassages[0]}`,
      onPress: () => {
        router.push({
          pathname: "/historic-voices",
          params: {
            bookId: String(parsed.bookId),
            chapter: String(parsed.chapter),
            bookName: parsed.bookName,
          },
        } as any);
      },
    });
  } else if (showHistoricVoices && !parsed) {
    actions.push({
      id: "historic-voices-disabled",
      icon: "mic-outline",
      iconColor: "#6B7280",
      title: "Historic Voices (coming soon)",
      subtitle: "No passage reference available",
      disabled: true,
      onPress: () => {},
    });
  }

  if (showProphecyExplorer) {
    actions.push({
      id: "prophecy",
      icon: "flash-outline",
      iconColor: "#F59E0B",
      title: "Open Prophecy Explorer",
      subtitle: "Deep dive into prophetic themes",
      onPress: () => {
        router.push("/prophecy-hub" as any);
      },
    });
  }

  if (showViewOnMap && mapParams) {
    actions.push({
      id: "map",
      icon: "map-outline",
      iconColor: "#22C55E",
      title: "View on Map",
      subtitle: "See this on Bible Maps",
      onPress: () => {
        router.push({
          pathname: "/maps-timeline",
          params: { tab: "maps", ...mapParams },
        } as any);
      },
    });
  }

  if (showViewOnTimeline && timelineParams) {
    actions.push({
      id: "timeline",
      icon: "time-outline",
      iconColor: "#06B6D4",
      title: "View on Timeline",
      subtitle: "Explore the historical context",
      onPress: () => {
        router.push({
          pathname: "/maps-timeline",
          params: { tab: "timeline", ...timelineParams },
        } as any);
      },
    });
  }

  if (actions.length === 0) return null;

  return (
    <View style={st.container}>
      <Text style={[st.sectionTitle, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
        RELATED STUDIES
      </Text>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={action.onPress}
          disabled={action.disabled}
          style={({ pressed }) => [
            st.row,
            {
              backgroundColor: theme.backgroundCard,
              opacity: action.disabled ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[st.iconWrap, { backgroundColor: action.iconColor + "18" }]}>
            <Ionicons name={action.icon} size={18} color={action.iconColor} />
          </View>
          <View style={st.textWrap}>
            <Text style={[st.title, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {action.title}
            </Text>
            <Text style={[st.subtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {action.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 12,
  },
});
