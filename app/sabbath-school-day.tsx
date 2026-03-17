import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

interface DayData {
  id: string;
  dayNumber: number;
  title: string | null;
  date: string | null;
  contentMarkdown: string | null;
  completed: boolean;
  journalEntry: string | null;
}

interface LessonResponse {
  lesson: {
    id: string;
    lessonNumber: number;
    title: string;
    days: DayData[];
  };
  quarterly: {
    title: string;
  };
}

function MarkdownRenderer({
  content,
  theme,
}: {
  content: string;
  theme: any;
}) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let blockquote: string[] = [];

  const flushBlockquote = () => {
    if (blockquote.length > 0) {
      const text = blockquote
        .map((l) => l.replace(/^>\s*/, "").replace(/<p>|<\/p>/g, ""))
        .join(" ")
        .trim();
      elements.push(
        <View
          key={`bq-${elements.length}`}
          style={[styles.blockquote, { borderLeftColor: theme.accent }]}
        >
          <Text style={[styles.blockquoteText, { color: theme.text }]}>
            {formatInlineText(text, theme)}
          </Text>
        </View>
      );
      blockquote = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith(">")) {
      blockquote.push(line);
      continue;
    }
    flushBlockquote();

    if (line.startsWith("### ")) {
      elements.push(
        <Text key={i} style={[styles.mdH3, { color: theme.text }]}>
          {line.replace(/^###\s*/, "")}
        </Text>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <Text key={i} style={[styles.mdH2, { color: theme.text }]}>
          {line.replace(/^##\s*/, "")}
        </Text>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <Text key={i} style={[styles.mdH1, { color: theme.text }]}>
          {line.replace(/^#\s*/, "")}
        </Text>
      );
    } else if (line.startsWith("---")) {
      elements.push(
        <View
          key={i}
          style={[styles.mdHr, { backgroundColor: theme.border }]}
        />
      );
    } else if (line.trim() === "") {
      elements.push(<View key={i} style={{ height: 8 }} />);
    } else {
      const cleaned = line
        .replace(/<p>|<\/p>/g, "")
        .replace(/\\\s*$/, "")
        .trim();
      if (cleaned) {
        elements.push(
          <Text key={i} style={[styles.mdParagraph, { color: theme.textSecondary }]}>
            {formatInlineText(cleaned, theme)}
          </Text>
        );
      }
    }
  }
  flushBlockquote();

  return <View style={styles.mdContainer}>{elements}</View>;
}

function formatInlineText(text: string, theme: any): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/_(.+?)_/);
    const firstMatch =
      boldMatch && italicMatch
        ? (boldMatch.index || 0) <= (italicMatch.index || 0)
          ? boldMatch
          : italicMatch
        : boldMatch || italicMatch;

    if (!firstMatch || firstMatch.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.substring(0, firstMatch.index));
    }

    if (firstMatch === boldMatch) {
      parts.push(
        <Text key={key++} style={{ fontFamily: "Inter_700Bold" }}>
          {firstMatch[1]}
        </Text>
      );
    } else {
      parts.push(
        <Text key={key++} style={{ fontStyle: "italic" }}>
          {firstMatch[1]}
        </Text>
      );
    }

    remaining = remaining.substring(
      (firstMatch.index || 0) + firstMatch[0].length
    );
  }

  return parts;
}

export default function SabbathSchoolDayScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    lessonNumber: string;
    dayNumber: string;
    quarterCode?: string;
  }>();

  const lessonNumber = parseInt(params.lessonNumber || "1");
  const dayNumber = parseInt(params.dayNumber || "1");
  const quarterCode = params.quarterCode || "";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const queryPath = quarterCode
    ? `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}&quarterCode=${quarterCode}`
    : `/api/sabbath-school/lesson/${lessonNumber}?userId=${userId}`;

  const { data, isLoading } = useQuery<LessonResponse>({
    queryKey: [queryPath],
  });

  const day = data?.lesson?.days?.find((d) => d.dayNumber === dayNumber);
  const totalDays = data?.lesson?.days?.length || 7;

  const [journalText, setJournalText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  React.useEffect(() => {
    if (day) {
      setIsCompleted(day.completed);
      if (day.journalEntry) setJournalText(day.journalEntry);
    }
  }, [day?.id]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/sabbath-school/complete", {
        userId,
        dayId: day!.id,
        journalEntry: journalText || null,
      });
    },
    onSuccess: () => {
      setIsCompleted(true);
      queryClient.invalidateQueries({
        queryKey: [queryPath],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/sabbath-school/current?userId=${userId}`],
      });
    },
  });

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sabbath"];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {DAY_NAMES[dayNumber - 1] || `Day ${dayNumber}`}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>
            Lesson {lessonNumber}
          </Text>
        </View>
        <View style={styles.navBtns}>
          {dayNumber > 1 && (
            <Pressable
              onPress={() =>
                router.replace(
                  `/sabbath-school-day?lessonNumber=${lessonNumber}&dayNumber=${dayNumber - 1}${quarterCode ? `&quarterCode=${quarterCode}` : ''}` as any
                )
              }
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color={theme.textMuted} />
            </Pressable>
          )}
          {dayNumber < totalDays && (
            <Pressable
              onPress={() =>
                router.replace(
                  `/sabbath-school-day?lessonNumber=${lessonNumber}&dayNumber=${dayNumber + 1}${quarterCode ? `&quarterCode=${quarterCode}` : ''}` as any
                )
              }
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : !day ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Day content not available.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {day.title && (
            <Text style={[styles.dayMainTitle, { color: theme.text }]}>
              {day.title}
            </Text>
          )}

          {day.contentMarkdown && (
            <MarkdownRenderer content={day.contentMarkdown} theme={theme} />
          )}

          <View style={[styles.sourceAttribution, { borderTopColor: theme.border }]}>
            <Ionicons name="library-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.sourceText, { color: theme.textMuted }]}>
              Lesson content provided by Adventech / Sabbath School Lessons (sabbath-school.adventech.io). Used under open-source license.
            </Text>
          </View>

          <View style={[styles.journalSection, { borderTopColor: theme.border }]}>
            <View style={styles.journalHeader}>
              <Ionicons name="journal-outline" size={18} color={theme.accent} />
              <Text style={[styles.journalLabel, { color: theme.accent }]}>
                Personal Reflection
              </Text>
            </View>
            <TextInput
              style={[
                styles.journalInput,
                {
                  backgroundColor: theme.backgroundCard,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="What stood out to you today?"
              placeholderTextColor={theme.textMuted}
              multiline
              value={journalText}
              onChangeText={setJournalText}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={() => completeMutation.mutate()}
            disabled={isCompleted || completeMutation.isPending}
            style={({ pressed }) => [
              styles.completeBtn,
              {
                backgroundColor: isCompleted
                  ? "rgba(34, 197, 94, 0.15)"
                  : theme.accent,
                opacity: pressed && !isCompleted ? 0.85 : 1,
              },
            ]}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator size="small" color={isCompleted ? "#22C55E" : "#050507"} />
            ) : (
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                size={22}
                color={isCompleted ? "#22C55E" : "#050507"}
              />
            )}
            <Text
              style={[
                styles.completeBtnText,
                { color: isCompleted ? "#22C55E" : "#050507" },
              ]}
            >
              {isCompleted ? "Completed" : "Mark as Complete"}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Lora_700Bold", fontSize: 18 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  navBtns: { flexDirection: "row", gap: 8, width: 50, justifyContent: "flex-end" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 8 },
  dayMainTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 8,
  },
  mdContainer: { gap: 4 },
  mdH1: { fontFamily: "Lora_700Bold", fontSize: 22, lineHeight: 30, marginTop: 16 },
  mdH2: { fontFamily: "Lora_600SemiBold", fontSize: 18, lineHeight: 26, marginTop: 14 },
  mdH3: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24, marginTop: 12 },
  mdParagraph: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },
  mdHr: { height: 1, marginVertical: 16 },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 8,
    marginVertical: 8,
  },
  blockquoteText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 15,
    lineHeight: 24,
  },
  sourceAttribution: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  sourceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  journalSection: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  journalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  journalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  journalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 100,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 12,
  },
  completeBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
