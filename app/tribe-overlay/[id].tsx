import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import {
  getTribeById,
  getLocationById,
} from "@/constants/biblical-locations";

const BOOK_NAME_TO_ID: Record<string, number> = {
  "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
  "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalm": 19, "Psalms": 19,
  "Proverbs": 20, "Ecclesiastes": 21, "Song of Solomon": 22,
  "Isaiah": 23, "Jeremiah": 24, "Lamentations": 25, "Ezekiel": 26, "Daniel": 27,
  "Hosea": 28, "Joel": 29, "Amos": 30, "Obadiah": 31, "Jonah": 32,
  "Micah": 33, "Nahum": 34, "Habakkuk": 35, "Zephaniah": 36,
  "Haggai": 37, "Zechariah": 38, "Malachi": 39,
  "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
  "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47,
  "Galatians": 48, "Ephesians": 49, "Philippians": 50, "Colossians": 51,
  "1 Thessalonians": 52, "2 Thessalonians": 53, "1 Timothy": 54, "2 Timothy": 55,
  "Titus": 56, "Philemon": 57, "Hebrews": 58, "James": 59,
  "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63, "3 John": 64,
  "Jude": 65, "Revelation": 66,
};

function parsePassageRef(passage: string): { bookId: number; chapter: number } | null {
  const match = passage.match(/^(\d?\s?[A-Za-z]+)\s+(\d+)/);
  if (!match) return null;
  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const bookId = BOOK_NAME_TO_ID[bookName];
  if (!bookId) return null;
  return { bookId, chapter };
}

export default function TribeOverlayDetailScreen() {
  const { id, mode, era, overlay, tribe } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
    tribe?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const tribeData = getTribeById(id || "");

  if (!tribeData) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Tribe",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Tribe not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const relatedLocations = tribeData.relatedLocationIds
    .map((lid) => getLocationById(lid))
    .filter(Boolean);

  const firstPassageRef = tribeData.keyPassages.length > 0 ? parsePassageRef(tribeData.keyPassages[0]) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: tribeData.name,
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: "Lora_700Bold", fontSize: 18 },
        }}
      />
      <ScrollView
        style={[st.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.hero}>
          <View style={[st.heroIcon, { backgroundColor: tribeData.color + "18" }]}>
            <Ionicons name="people-outline" size={36} color={tribeData.color} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {tribeData.name}
          </Text>
          <View style={[st.eraBadge, { backgroundColor: tribeData.color + "20", borderColor: tribeData.color + "40" }]}>
            <Text style={[st.eraBadgeText, { color: tribeData.color, fontFamily: "Inter_600SemiBold" }]}>
              {tribeData.regionLabel}
            </Text>
          </View>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="map-outline" size={16} color={tribeData.color} />
            <Text style={[st.cardLabel, { color: tribeData.color, fontFamily: "Inter_600SemiBold" }]}>
              Region
            </Text>
          </View>
          <Text style={[st.descText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {tribeData.regionLabel}
          </Text>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="document-text-outline" size={16} color={theme.textMuted} />
            <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Description
            </Text>
          </View>
          <Text style={[st.descText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {tribeData.shortDescription}
          </Text>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="book-outline" size={16} color="#C9933A" />
            <Text style={[st.cardLabel, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
              Key Passages
            </Text>
          </View>
          {tribeData.keyPassages.map((passage) => {
            const ref = parsePassageRef(passage);
            return (
              <Pressable
                key={passage}
                onPress={() => {
                  if (ref) router.push(`/read/${ref.bookId}/${ref.chapter}` as any);
                }}
                style={({ pressed }) => [st.passageRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="bookmark-outline" size={14} color="#C9933A" />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {passage}
                </Text>
                {ref && <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />}
              </Pressable>
            );
          })}
        </View>

        {relatedLocations.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="location-outline" size={16} color="#14B8A6" />
              <Text style={[st.cardLabel, { color: "#14B8A6", fontFamily: "Inter_600SemiBold" }]}>
                Related Locations
              </Text>
            </View>
            {relatedLocations.map((loc) => (
              <Pressable
                key={loc!.id}
                onPress={() => router.push({ pathname: `/location/${loc!.id}`, params: { mode: mode || "modern", era: era || "All", overlay: overlay || "tribes", tribe: tribe || tribeData.id } } as any)}
                style={({ pressed }) => [st.passageRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="navigate-outline" size={14} color="#14B8A6" />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {loc!.name}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {tribeData.periods.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Historical Significance
              </Text>
            </View>
            <View style={st.periodsWrap}>
              {tribeData.periods.map((p) => (
                <View key={p} style={[st.periodBadge, { backgroundColor: tribeData.color + "14", borderColor: tribeData.color + "30" }]}>
                  <Text style={[st.periodText, { color: tribeData.color, fontFamily: "Inter_500Medium" }]}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={st.actions}>
          {firstPassageRef && (
            <Pressable
              onPress={() => router.push(`/read/${firstPassageRef.bookId}/${firstPassageRef.chapter}` as any)}
              style={({ pressed }) => [st.actionBtn, { backgroundColor: tribeData.color, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="book-outline" size={18} color="#fff" />
              <Text style={[st.actionText, { fontFamily: "Inter_600SemiBold" }]}>
                Read {tribeData.keyPassages[0]}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push({ pathname: "/maps-timeline", params: { tab: "maps", mode: mode || "biblical", era: era || "All", overlay: "tribes", tribe: tribeData.id } } as any)}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="map-outline" size={18} color={tribeData.color} />
            <Text style={[st.actionText, { color: tribeData.color, fontFamily: "Inter_600SemiBold" }]}>
              View on Map
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: "center" as const, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 12 },
  heroTitle: { fontSize: 26, marginBottom: 8 },
  eraBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  eraBadgeText: { fontSize: 12 },
  card: { marginHorizontal: 20, marginBottom: 14, borderRadius: 14, padding: 16 },
  cardRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 10 },
  cardLabel: { fontSize: 13, letterSpacing: 0.3 },
  descText: { fontSize: 14, lineHeight: 22 },
  passageRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  passageText: { flex: 1, fontSize: 14 },
  periodsWrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  periodBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  periodText: { fontSize: 12 },
  actions: { paddingHorizontal: 20, gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionText: { fontSize: 15, color: "#fff" },
  emptyState: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 12 },
  emptyText: { fontSize: 16 },
});
