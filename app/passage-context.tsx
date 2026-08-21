import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";

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


export default function PassageContextScreen() {
  const { bookId, chapter, bookName } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
    bookName: string;
  }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: contextCards, isLoading: ctxLoading } = useQuery<ContextCard[]>({
    queryKey: [`/api/context?book=${bookId}&chapter=${chapter}`],
  });

  const hasContext = (contextCards?.length ?? 0) > 0;
  const isLoading = ctxLoading;
  const hasContent = hasContext;

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
            Historical background & cultural context
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {"Loading study materials..."}
            </Text>
          </View>
        ) : !hasContent ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Ionicons name="library-outline" size={36} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_500Medium" }]}>
              Coming Soon
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Historical background and cultural context for this passage will be available soon.
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
  retryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 6,
  },
  retryBtnText: { fontSize: 14 },
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
  infoRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  infoLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 2 },
  infoValue: { fontSize: 13, lineHeight: 20 },
  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  themePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  themeText: { fontSize: 11 },
});
