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
  getJourneyRouteById,
  getLocationById,
  JOURNEY_ROUTE_COLORS,
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

export default function JourneyRouteDetailScreen() {
  const { id, mode, era, overlay, journey } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
    journey?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const route = getJourneyRouteById(id || "");
  const routeColor = route ? (JOURNEY_ROUTE_COLORS[route.id] || "#C9933A") : "#C9933A";

  if (!route) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Journey Route",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="trail-sign-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Journey route not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const firstPassageRef = route.keyPassages.length > 0 ? parsePassageRef(route.keyPassages[0]) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: route.title,
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
          <View style={[st.heroIcon, { backgroundColor: routeColor + "18" }]}>
            <Ionicons name="trail-sign-outline" size={36} color={routeColor} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {route.title}
          </Text>
          <View style={[st.categoryBadge, { backgroundColor: routeColor + "22" }]}>
            <Text style={[st.categoryText, { color: routeColor, fontFamily: "Inter_600SemiBold" }]}>
              {route.category}
            </Text>
          </View>
        </View>

        <View style={st.section}>
          <Text style={[st.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {route.shortDescription}
          </Text>
        </View>

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Route Stops
          </Text>
          {route.routeSegments.map((seg, idx) => {
            const fromLoc = getLocationById(seg.fromLocationId);
            const toLoc = getLocationById(seg.toLocationId);
            return (
              <View key={`${seg.fromLocationId}-${seg.toLocationId}-${idx}`} style={st.segmentRow}>
                <View style={st.segmentLine}>
                  <View style={[st.segmentDot, { backgroundColor: routeColor }]} />
                  {idx < route.routeSegments.length - 1 && (
                    <View style={[st.segmentConnector, { backgroundColor: routeColor + "40" }]} />
                  )}
                </View>
                <View style={st.segmentContent}>
                  <Pressable
                    onPress={() => {
                      if (fromLoc) {
                        router.push({
                          pathname: `/location/${fromLoc.id}`,
                          params: { mode: mode || "biblical", era: era || "All", overlay: overlay || "journey-routes", journey: journey || "all" },
                        } as any);
                      }
                    }}
                    style={({ pressed }) => [
                      st.stopCard,
                      { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Ionicons name="location" size={16} color={routeColor} />
                    <Text style={[st.stopName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {fromLoc?.name || seg.fromLocationId}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                  </Pressable>
                  <Text style={[st.segLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {seg.label}
                  </Text>
                  {idx === route.routeSegments.length - 1 && toLoc && (
                    <View style={st.segmentFinalRow}>
                      <View style={st.segmentLine}>
                        <View style={[st.segmentDot, { backgroundColor: routeColor }]} />
                      </View>
                      <Pressable
                        onPress={() => {
                          router.push({
                            pathname: `/location/${toLoc.id}`,
                            params: { mode: mode || "biblical", era: era || "All", overlay: overlay || "journey-routes", journey: journey || "all" },
                          } as any);
                        }}
                        style={({ pressed }) => [
                          st.stopCard,
                          { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.75 : 1, flex: 1 },
                        ]}
                      >
                        <Ionicons name="location" size={16} color={routeColor} />
                        <Text style={[st.stopName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                          {toLoc.name}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Key Passages
          </Text>
          <View style={st.passageRow}>
            {route.keyPassages.map((p) => (
              <View key={p} style={[st.passageBadge, { backgroundColor: routeColor + "18" }]}>
                <Ionicons name="book-outline" size={13} color={routeColor} />
                <Text style={[st.passageText, { color: routeColor, fontFamily: "Inter_500Medium" }]}>
                  {p}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Eras
          </Text>
          <View style={st.eraRow}>
            {route.eras.map((e) => (
              <View key={e} style={[st.eraBadge, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[st.eraText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {e}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[st.section, st.actionsSection]}>
          <Pressable
            onPress={() => {
              router.push({
                pathname: "/maps-timeline",
                params: { tab: "maps", mode: "biblical", era: era || "All", overlay: "journey-routes", journey: route.id },
              } as any);
            }}
            style={({ pressed }) => [
              st.actionBtn,
              { backgroundColor: routeColor, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={[st.actionText, { fontFamily: "Inter_600SemiBold" }]}>View on Map</Text>
          </Pressable>

          {firstPassageRef && (
            <Pressable
              onPress={() => {
                router.push(`/read/${firstPassageRef.bookId}/${firstPassageRef.chapter}` as any);
              }}
              style={({ pressed }) => [
                st.actionBtn,
                { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="book-outline" size={18} color={routeColor} />
              <Text style={[st.actionTextAlt, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Read {route.keyPassages[0]}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              st.actionBtn,
              { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
            <Text style={[st.actionTextAlt, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Back to Maps
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, textAlign: "center" },
  heroSection: { alignItems: "center", paddingTop: 24, paddingHorizontal: 24, gap: 12 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  heroTitle: { fontSize: 24, textAlign: "center" },
  categoryBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  categoryText: { fontSize: 13 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 23 },
  segmentRow: { flexDirection: "row", marginBottom: 4 },
  segmentLine: { width: 24, alignItems: "center" },
  segmentDot: { width: 10, height: 10, borderRadius: 5, marginTop: 12 },
  segmentConnector: { width: 2, flex: 1, marginTop: 4 },
  segmentContent: { flex: 1, paddingLeft: 8 },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stopName: { fontSize: 14, flex: 1 },
  segLabel: { fontSize: 12, paddingLeft: 12, paddingVertical: 6 },
  segmentFinalRow: { flexDirection: "row", marginTop: 4 },
  passageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  passageBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  passageText: { fontSize: 13 },
  eraRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  eraBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  eraText: { fontSize: 13 },
  actionsSection: { gap: 10, paddingBottom: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionText: { color: "#fff", fontSize: 15 },
  actionTextAlt: { fontSize: 15 },
});
