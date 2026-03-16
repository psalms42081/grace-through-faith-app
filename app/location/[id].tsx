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
  getLocationById,
  getLocationByName,
  BIBLICAL_LOCATIONS,
  getPeopleGroupsForLocation,
  getProphecyLinksForLocation,
  getJourneyRoutesForLocation,
  getKingdomsForLocation,
  JOURNEY_ROUTE_COLORS,
  type EraFilter,
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

interface ParsedPassage {
  bookName: string;
  chapter: number;
  verse: number;
  bookId: number | null;
  reference: string;
}

function parseFirstPassage(passage: string): ParsedPassage | null {
  const match = passage.match(/^(\d?\s?[A-Za-z]+)\s+(\d+):?(\d+)?/);
  if (!match) return null;
  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : 1;
  const bookId = BOOK_NAME_TO_ID[bookName] ?? null;
  return { bookName, chapter, verse, bookId, reference: passage };
}

export default function LocationDetailScreen() {
  const { id, mode, era, overlay, journey, kingdom } = useLocalSearchParams<{ id: string; mode?: string; era?: string; overlay?: string; journey?: string; kingdom?: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isBiblical = mode === "biblical";
  const currentEra = (era || "All") as EraFilter;

  const location = getLocationById(id || "") || getLocationByName(id || "");

  if (!location) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Location",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="location-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Location not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const firstPassage = location.passages.length > 0 ? parseFirstPassage(location.passages[0]) : null;

  const nearbyLocs = location.nearbyLocations
    .map((nid) => BIBLICAL_LOCATIONS.find((l) => l.id === nid))
    .filter(Boolean);

  const relatedPeopleGroups = getPeopleGroupsForLocation(location.id);
  const relatedProphecies = getProphecyLinksForLocation(location.id);
  const relatedJourneys = getJourneyRoutesForLocation(location.id);
  const relatedKingdoms = getKingdomsForLocation(location.id);

  return (
    <>
      <Stack.Screen
        options={{
          title: location.name,
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
          <Text style={[st.locationName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {location.name}
          </Text>
          <Text style={[st.heroSubtitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {isBiblical
              ? location.ancientRegion
              : `${location.modernLocation}, ${location.modernCountry}`}
          </Text>
          <View style={st.regionRow}>
            <View style={[st.regionBadge, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name={isBiblical ? "compass-outline" : "globe-outline"} size={13} color={theme.accent} />
              <Text style={[st.regionText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                {isBiblical ? "Ancient Region" : "Modern"}
              </Text>
            </View>
            {location.eras.length > 0 && (
              <View style={[st.regionBadge, { backgroundColor: "#7C3AED" + "18" }]}>
                <Ionicons name="time-outline" size={13} color="#7C3AED" />
                <Text style={[st.regionText, { color: "#7C3AED", fontFamily: "Inter_600SemiBold" }]}>
                  View in Timeline Context
                </Text>
              </View>
            )}
          </View>
        </View>

        {isBiblical ? (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="compass-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Ancient Region
              </Text>
            </View>
            <Text style={[st.cardValue, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {location.ancientRegion}
            </Text>
            <Text style={[st.cardValueSecondary, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Modern: {location.modernLocation}, {location.modernCountry}
            </Text>
          </View>
        ) : (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="location-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Modern Location
              </Text>
            </View>
            <Text style={[st.cardValue, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {location.modernLocation}, {location.modernCountry}
            </Text>
            <Text style={[st.cardValueSecondary, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              Ancient Region: {location.ancientRegion}
            </Text>
          </View>
        )}

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
            <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              About This Place
            </Text>
          </View>
          <Text style={[st.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {location.description}
          </Text>
        </View>

        {location.timelineEvents.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="time-outline" size={16} color="#7C3AED" />
              <Text style={[st.cardLabel, { color: "#7C3AED", fontFamily: "Inter_600SemiBold" }]}>
                Timeline
              </Text>
            </View>
            {location.eras.length > 0 && (
              <View style={st.eraChipsRow}>
                {location.eras.map((e, i) => (
                  <View key={i} style={[st.eraChipDetail, { backgroundColor: "#7C3AED" + "14" }]}>
                    <Text style={[st.eraChipDetailText, { color: "#7C3AED", fontFamily: "Inter_500Medium" }]}>
                      {e}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {location.timelineEvents.map((te, i) => (
              <View key={i} style={[st.timelineEventCard, { backgroundColor: theme.background }]}>
                <Text style={[st.timelineEventDate, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {te.dateLabel}
                </Text>
                <Text style={[st.timelineEventTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {te.title}
                </Text>
                <Text style={[st.timelineEventDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {te.shortDescription}
                </Text>
              </View>
            ))}
          </View>
        )}

        {location.keyEvents.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="flash-outline" size={16} color="#C9933A" />
              <Text style={[st.cardLabel, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
                Key Events
              </Text>
            </View>
            {location.keyEvents.map((event, i) => (
              <View key={i} style={st.eventRow}>
                <View style={[st.eventDot, { backgroundColor: theme.accent }]} />
                <Text style={[st.eventText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {event}
                </Text>
              </View>
            ))}
          </View>
        )}

        {location.keyPeople.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="people-outline" size={16} color="#7C3AED" />
              <Text style={[st.cardLabel, { color: "#7C3AED", fontFamily: "Inter_600SemiBold" }]}>
                Key People
              </Text>
            </View>
            <View style={st.peopleWrap}>
              {location.keyPeople.map((person, i) => (
                <View key={i} style={[st.personChip, { backgroundColor: "#7C3AED" + "14" }]}>
                  <Text style={[st.personText, { color: "#7C3AED", fontFamily: "Inter_500Medium" }]}>
                    {person}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {location.passages.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="book-outline" size={16} color="#3B82F6" />
              <Text style={[st.cardLabel, { color: "#3B82F6", fontFamily: "Inter_600SemiBold" }]}>
                Related Passages
              </Text>
            </View>
            {location.passages.map((passage, i) => (
              <View key={i} style={[st.passageRow, { borderColor: theme.border }]}>
                <Ionicons name="bookmark-outline" size={14} color={theme.accent} />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {passage}
                </Text>
              </View>
            ))}
          </View>
        )}

        {relatedPeopleGroups.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="people-outline" size={16} color="#22C55E" />
              <Text style={[st.cardLabel, { color: "#22C55E", fontFamily: "Inter_600SemiBold" }]}>
                People Groups
              </Text>
            </View>
            {relatedPeopleGroups.map((pg) => (
              <Pressable
                key={pg.id}
                onPress={() => router.push({ pathname: `/people-group/${pg.id}`, params: { mode: mode || "modern", era: currentEra, overlay: overlay || "none" } } as any)}
                style={({ pressed }) => [st.pgRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[st.pgIcon, { backgroundColor: "#22C55E" + "14" }]}>
                  <Ionicons name="people-outline" size={16} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.nearbyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {pg.name}
                  </Text>
                  <Text style={[st.nearbyRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {pg.regionLabel}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {relatedProphecies.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="flash-outline" size={16} color="#F59E0B" />
              <Text style={[st.cardLabel, { color: "#F59E0B", fontFamily: "Inter_600SemiBold" }]}>
                Prophecy Connections
              </Text>
            </View>
            {relatedProphecies.map((pl) => (
              <Pressable
                key={pl.id}
                onPress={() => router.push({ pathname: `/prophecy-link/${pl.id}`, params: { mode: mode || "modern", era: currentEra, overlay: overlay || "none" } } as any)}
                style={({ pressed }) => [st.pgRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[st.pgIcon, { backgroundColor: "#F59E0B" + "14" }]}>
                  <Ionicons name="flash-outline" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.nearbyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {pl.title}
                  </Text>
                  <Text style={[st.nearbyRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {pl.theme}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {relatedJourneys.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="trail-sign-outline" size={16} color="#14B8A6" />
              <Text style={[st.cardLabel, { color: "#14B8A6", fontFamily: "Inter_600SemiBold" }]}>
                Journey Routes
              </Text>
            </View>
            {relatedJourneys.map((jr) => {
              const jrColor = JOURNEY_ROUTE_COLORS[jr.id] || "#C9933A";
              return (
                <Pressable
                  key={jr.id}
                  onPress={() => router.push({ pathname: `/journey-route/${jr.id}`, params: { mode: mode || "modern", era: currentEra, overlay: overlay || "journey-routes", journey: journey || jr.id } } as any)}
                  style={({ pressed }) => [st.pgRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[st.pgIcon, { backgroundColor: jrColor + "14" }]}>
                    <Ionicons name="trail-sign-outline" size={16} color={jrColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.nearbyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {jr.title}
                    </Text>
                    <Text style={[st.nearbyRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                      {jr.category} -- {jr.stopLocationIds.length} stops
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}

        {relatedKingdoms.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="shield-outline" size={16} color="#BE185D" />
              <Text style={[st.cardLabel, { color: "#BE185D", fontFamily: "Inter_600SemiBold" }]}>
                Kingdoms & Empires
              </Text>
            </View>
            {relatedKingdoms.map((k) => (
              <Pressable
                key={k.id}
                onPress={() => router.push({ pathname: `/kingdom-overlay/${k.id}`, params: { mode: mode || "modern", era: currentEra, overlay: overlay || "kingdoms", kingdom: kingdom || k.id } } as any)}
                style={({ pressed }) => [st.pgRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[st.pgIcon, { backgroundColor: k.color + "14" }]}>
                  <Ionicons name="shield-outline" size={16} color={k.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.nearbyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {k.name}
                  </Text>
                  <Text style={[st.nearbyRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {k.eraLabel}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {nearbyLocs.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="navigate-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Nearby Locations
              </Text>
            </View>
            {nearbyLocs.map((nl) => (
              <Pressable
                key={nl!.id}
                onPress={() => router.push({ pathname: `/location/${nl!.id}`, params: { mode: mode || "modern", era: currentEra, overlay: overlay || "none", journey: journey || "", kingdom: kingdom || "" } } as any)}
                style={({ pressed }) => [st.nearbyRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[st.nearbyName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {nl!.name}
                </Text>
                <Text style={[st.nearbyRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {isBiblical ? nl!.ancientRegion : `${nl!.modernLocation}, ${nl!.modernCountry}`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: "auto" }} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={st.actionsSection}>
          <Text style={[st.actionsTitle, { color: theme.textMuted, fontFamily: "Inter_600SemiBold" }]}>
            STUDY THIS LOCATION
          </Text>

          <Pressable
            onPress={() => {
              if (firstPassage?.bookId) {
                router.push(`/read/${firstPassage.bookId}/${firstPassage.chapter}` as any);
              }
            }}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 }]}
            disabled={!firstPassage?.bookId}
          >
            <View style={[st.actionIcon, { backgroundColor: "#3B82F6" + "18" }]}>
              <Ionicons name="book-outline" size={18} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.actionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Read Passages
              </Text>
              <Text style={[st.actionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                {firstPassage ? `Start with ${location.passages[0]}` : "No passages available"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              if (firstPassage?.bookId) {
                router.push({
                  pathname: "/study-guide",
                  params: {
                    verseReference: firstPassage.reference,
                    verseText: `${location.name} - ${firstPassage.reference}`,
                    bookName: firstPassage.bookName,
                    chapter: String(firstPassage.chapter),
                    verse: String(firstPassage.verse),
                  },
                } as any);
              }
            }}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 }]}
            disabled={!firstPassage?.bookId}
          >
            <View style={[st.actionIcon, { backgroundColor: "#8B5CF6" + "18" }]}>
              <Ionicons name="chatbubbles-outline" size={18} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.actionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Start Guided Study
              </Text>
              <Text style={[st.actionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                AI tutor on {location.passages[0] || "related passage"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              if (firstPassage?.bookId) {
                router.push({
                  pathname: "/deep-study-picker",
                  params: {
                    bookId: String(firstPassage.bookId),
                    chapter: String(firstPassage.chapter),
                  },
                } as any);
              }
            }}
            style={({ pressed }) => [st.actionBtn, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.8 : 1 }]}
            disabled={!firstPassage}
          >
            <View style={[st.actionIcon, { backgroundColor: "#C9933A" + "18" }]}>
              <Ionicons name="layers-outline" size={18} color="#C9933A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.actionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Start Deep Study
              </Text>
              <Text style={[st.actionSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                4-Layer study on {location.passages[0] || "related passage"}
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
  locationName: {
    fontSize: 28,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  regionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  regionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  regionText: {
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
  cardValueSecondary: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },

  eventRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    paddingRight: 4,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  eventText: {
    fontSize: 13.5,
    lineHeight: 20,
    flex: 1,
  },

  peopleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  personChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  personText: {
    fontSize: 13,
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

  nearbyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nearbyName: {
    fontSize: 14,
  },
  nearbyRegion: {
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
  actionTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
  },
  pgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pgIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  eraChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  eraChipDetail: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eraChipDetailText: {
    fontSize: 11,
  },
  timelineEventCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  timelineEventDate: {
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  timelineEventTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  timelineEventDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
});
