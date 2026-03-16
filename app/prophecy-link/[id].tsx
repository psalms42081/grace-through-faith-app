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
  getProphecyLinkById,
  getLocationById,
  type EraFilter,
  type OverlayType,
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

const PROPHECY_COLOR = "#F59E0B";

export default function ProphecyLinkDetailScreen() {
  const { id, mode, era, overlay } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const prophecy = getProphecyLinkById(id || "");

  if (!prophecy) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Prophecy",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="flash-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Prophecy link not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const relatedLocations = prophecy.relatedLocationIds
    .map((lid) => getLocationById(lid))
    .filter(Boolean);

  const firstPassageRef = prophecy.keyPassages.length > 0 ? parsePassageRef(prophecy.keyPassages[0]) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: prophecy.title,
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
        <View style={st.heroSection}>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {prophecy.title}
          </Text>
          <Text style={[st.heroSubtitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {prophecy.theme}
          </Text>
          <View style={st.badgeRow}>
            <View style={[st.badge, { backgroundColor: PROPHECY_COLOR + "18" }]}>
              <Ionicons name="flash-outline" size={13} color={PROPHECY_COLOR} />
              <Text style={[st.badgeText, { color: PROPHECY_COLOR, fontFamily: "Inter_600SemiBold" }]}>
                Prophecy
              </Text>
            </View>
          </View>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="prism-outline" size={16} color={PROPHECY_COLOR} />
            <Text style={[st.cardLabel, { color: PROPHECY_COLOR, fontFamily: "Inter_600SemiBold" }]}>
              Theme
            </Text>
          </View>
          <Text style={[st.cardValue, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
            {prophecy.theme}
          </Text>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
            <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Description
            </Text>
          </View>
          <Text style={[st.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {prophecy.description}
          </Text>
        </View>

        {prophecy.eras.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="time-outline" size={16} color="#7C3AED" />
              <Text style={[st.cardLabel, { color: "#7C3AED", fontFamily: "Inter_600SemiBold" }]}>
                Eras
              </Text>
            </View>
            <View style={st.chipsRow}>
              {prophecy.eras.map((e, i) => (
                <View key={i} style={[st.chip, { backgroundColor: "#7C3AED" + "14" }]}>
                  <Text style={[st.chipText, { color: "#7C3AED", fontFamily: "Inter_500Medium" }]}>
                    {e}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {prophecy.keyPassages.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="book-outline" size={16} color="#3B82F6" />
              <Text style={[st.cardLabel, { color: "#3B82F6", fontFamily: "Inter_600SemiBold" }]}>
                Key Passages
              </Text>
            </View>
            {prophecy.keyPassages.map((passage, i) => (
              <View key={i} style={[st.passageRow, { borderColor: theme.border }]}>
                <Ionicons name="bookmark-outline" size={14} color={theme.accent} />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {passage}
                </Text>
              </View>
            ))}
          </View>
        )}

        {relatedLocations.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="location-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Related Locations
              </Text>
            </View>
            {relatedLocations.map((loc) => (
              <Pressable
                key={loc!.id}
                onPress={() =>
                  router.push({
                    pathname: `/location/${loc!.id}`,
                    params: { mode: mode || "modern", era: era || "All", overlay: overlay || "none" },
                  } as any)
                }
                style={({ pressed }) => [st.locationRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[st.locationName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {loc!.name}
                </Text>
                <Text style={[st.locationRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {loc!.ancientRegion}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: "auto" }} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={st.actionsSection}>
          <Text style={[st.actionsTitle, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
            EXPLORE THIS PROPHECY
          </Text>

          <Pressable
            onPress={() => {
              if (firstPassageRef) {
                router.push(`/read/${firstPassageRef.bookId}/${firstPassageRef.chapter}` as any);
              }
            }}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 }]}
            disabled={!firstPassageRef}
          >
            <View style={[st.actionIcon, { backgroundColor: "#3B82F6" + "18" }]}>
              <Ionicons name="book-outline" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.actionBtnTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Read Passages
              </Text>
              <Text style={[st.actionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {firstPassageRef ? `Start with ${prophecy.keyPassages[0]}` : "No passages available"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              router.push("/prophecy-hub" as any);
            }}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[st.actionIcon, { backgroundColor: PROPHECY_COLOR + "18" }]}>
              <Ionicons name="flash-outline" size={18} color={PROPHECY_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.actionBtnTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Open Prophecy Explorer
              </Text>
              <Text style={[st.actionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                Deep dive into prophetic themes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              router.push({
                pathname: "/maps-timeline",
                params: {
                  tab: "maps",
                  mode: mode || "modern",
                  era: era || "All",
                  overlay: overlay || "none",
                },
              } as any);
            }}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[st.actionIcon, { backgroundColor: "#22C55E" + "18" }]}>
              <Ionicons name="map-outline" size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.actionBtnTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                View Related Locations
              </Text>
              <Text style={[st.actionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {relatedLocations.length > 0
                  ? `${relatedLocations.length} location${relatedLocations.length !== 1 ? "s" : ""} on the map`
                  : "Return to Bible Maps"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: { fontSize: 16 },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
  },
  passageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  passageText: {
    fontSize: 14,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationName: {
    fontSize: 14,
  },
  locationRegion: {
    fontSize: 12,
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 10,
  },
  actionsTitle: {
    fontSize: 10.5,
    letterSpacing: 1.6,
    marginBottom: 6,
    paddingLeft: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
  },
});
