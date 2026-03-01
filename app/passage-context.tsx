import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface ContextCard {
  id: string;
  bookId: number;
  chapter: number | null;
  title: string;
  content: string;
  historicalBackground: string | null;
  culturalNotes: string | null;
  authorInfo: string | null;
  dateWritten: string | null;
  audience: string | null;
  themes: string[] | null;
}

interface CommentaryEntryData {
  id: string;
  commentatorId: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  title: string | null;
  content: string;
}

interface Commentator {
  id: string;
  name: string;
  dates: string | null;
  tradition: string | null;
  bio: string | null;
  isExternal?: boolean;
  externalUrl?: string;
}

interface CommentaryResult {
  entry: CommentaryEntryData;
  commentator: Commentator | null;
}

export default function PassageContextScreen() {
  const { bookId, chapter, bookName } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
    bookName: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: contextCards, isLoading: ctxLoading } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${bookId}&chapter=${chapter}`],
  });

  const { data: commentaryResults, isLoading: comLoading } = useQuery<CommentaryResult[]>({
    queryKey: [`/api/commentary?book=${bookId}&chapter=${chapter}`],
  });

  const generateCtxMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/context/generate", { bookId: Number(bookId), chapter: Number(chapter) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/context?book=${bookId}&chapter=${chapter}`] });
    },
  });

  const generateComMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/commentary/generate", { bookId: Number(bookId), chapter: Number(chapter) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/commentary?book=${bookId}&chapter=${chapter}`] });
    },
  });

  const hasContext = (contextCards?.length ?? 0) > 0;
  const hasCommentary = (commentaryResults?.length ?? 0) > 0;
  const isGenerating = generateCtxMutation.isPending || generateComMutation.isPending;
  const isLoading = ctxLoading || comLoading || isGenerating;
  const hasContent = hasContext || hasCommentary;

  const [ctxGenDone, setCtxGenDone] = React.useState(false);
  const [comGenDone, setComGenDone] = React.useState(false);

  useEffect(() => {
    if (!ctxLoading && !hasContext && !generateCtxMutation.isPending && !ctxGenDone) {
      setCtxGenDone(true);
      generateCtxMutation.mutate();
    }
  }, [ctxLoading, hasContext]);

  useEffect(() => {
    if (!comLoading && !hasCommentary && !generateComMutation.isPending && !comGenDone) {
      setComGenDone(true);
      generateComMutation.mutate();
    }
  }, [comLoading, hasCommentary]);

  return (
    <>
      <Stack.Screen
        options={{
          title: `${bookName} ${chapter} — Study`,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
          <View style={[styles.heroBadge, { backgroundColor: "rgba(201,147,58,0.25)" }]}>
            <Ionicons name="layers-outline" size={14} color="#C9933A" />
            <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
              Passage Study
            </Text>
          </View>
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>
            {bookName} {chapter}
          </Text>
          <Text style={[styles.heroSub, { fontFamily: "Inter_400Regular" }]}>
            Context, background & commentary
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {isGenerating ? "Generating study materials..." : "Loading study materials..."}
            </Text>
          </View>
        ) : !hasContent ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Ionicons name="library-outline" size={36} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
              Study materials coming soon
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Context cards and commentary for this passage will be added in future updates.
            </Text>
          </View>
        ) : (
          <>
            {hasContext && (
              <>
                <SectionHeader icon="time-outline" label="Historical Context" theme={theme} />
                {contextCards!.map((card) => (
                  <ContextCardView key={card.id} card={card} theme={theme} />
                ))}
              </>
            )}

            {hasCommentary && (
              <>
                <SectionHeader icon="chatbubbles-outline" label="Commentary" theme={theme} />
                {commentaryResults!.map((result) => (
                  <CommentaryCardView key={result.entry.id} result={result} theme={theme} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

function SectionHeader({
  icon,
  label,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: typeof Colors.light;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={theme.accent} />
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </View>
  );
}

function ContextCardView({ card, theme }: { card: any; theme: typeof Colors.light }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
        {card.title}
      </Text>
      <Text style={[styles.cardContent, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
        {card.content}
      </Text>

      {card.historicalBackground && (
        <InfoRow icon="time-outline" label="Background" value={card.historicalBackground} theme={theme} />
      )}
      {card.culturalNotes && (
        <InfoRow icon="people-outline" label="Cultural Notes" value={card.culturalNotes} theme={theme} />
      )}
      {card.authorInfo && (
        <InfoRow icon="person-outline" label="Author" value={card.authorInfo} theme={theme} />
      )}
      {card.dateWritten && (
        <InfoRow icon="calendar-outline" label="Date Written" value={card.dateWritten} theme={theme} />
      )}
      {card.audience && (
        <InfoRow icon="megaphone-outline" label="Audience" value={card.audience} theme={theme} />
      )}

      {card.themes && card.themes.length > 0 && (
        <View style={styles.themesRow}>
          {card.themes.map((t: string, i: number) => (
            <View key={i} style={[styles.themePill, { backgroundColor: theme.accent + "18" }]}>
              <Text style={[styles.themeText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CommentaryCardView({ result, theme }: { result: CommentaryResult; theme: typeof Colors.light }) {
  const { entry, commentator } = result;
  const verseRange = entry.verseEnd
    ? `vv. ${entry.verseStart}-${entry.verseEnd}`
    : `v. ${entry.verseStart}`;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.commentaryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.commentatorName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {commentator?.name ?? "Unknown"}
          </Text>
          <Text style={[styles.commentatorMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {[commentator?.tradition, commentator?.dates].filter(Boolean).join(" | ")}
          </Text>
        </View>
        <View style={[styles.verseBadge, { backgroundColor: theme.accent + "18" }]}>
          <Text style={[styles.verseBadgeText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
            {verseRange}
          </Text>
        </View>
      </View>
      {entry.title && (
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Lora_600SemiBold", marginTop: 8 }]}>
          {entry.title}
        </Text>
      )}
      <Text style={[styles.cardContent, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
        {entry.content}
      </Text>
      {commentator?.isExternal && commentator?.externalUrl && (
        <View style={[styles.externalBadge, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="open-outline" size={12} color={theme.accent} />
          <Text style={[styles.externalText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            External resource
          </Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: typeof Colors.light;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={theme.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  heroBadgeText: { color: "#C9933A", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const },
  heroTitle: { color: "#EDE5D5", fontSize: 24, marginBottom: 4 },
  heroSub: { color: "rgba(237,229,213,0.6)", fontSize: 13 },
  loadingBox: { alignItems: "center" as const, gap: 12, paddingTop: 40 },
  loadingText: { fontSize: 14 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: "center" as const,
    gap: 10,
  },
  emptyTitle: { fontSize: 16 },
  emptySub: { fontSize: 13, textAlign: "center" as const, lineHeight: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, marginBottom: 8 },
  cardContent: { fontSize: 14, lineHeight: 22 },
  commentaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  commentatorName: { fontSize: 14 },
  commentatorMeta: { fontSize: 11, marginTop: 2 },
  verseBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  verseBadgeText: { fontSize: 11 },
  externalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  externalText: { fontSize: 11 },
  infoRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  infoLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 2 },
  infoValue: { fontSize: 13, lineHeight: 20 },
  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  themePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  themeText: { fontSize: 11 },
});
