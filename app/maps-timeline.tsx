import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import BibleMap from "@/components/BibleMap";
import Colors from "@/constants/colors";

type Tab = "maps" | "timeline";

interface Location {
  id: string;
  name: string;
  modernName: string | null;
  latitude: string | null;
  longitude: string | null;
  description: string | null;
  imageUrl: string | null;
  locationType: string | null;
  era: string | null;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  yearApprox: number | null;
  yearLabel: string | null;
  period: string | null;
  category: string | null;
  locationId: string | null;
}

interface LinkedVerse {
  verseId: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
  note?: string | null;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  city: "business-outline",
  region: "globe-outline",
  body_of_water: "water-outline",
  mountain: "triangle-outline",
};

const TYPE_LABELS: Record<string, string> = {
  city: "Cities",
  region: "Regions",
  body_of_water: "Bodies of Water",
  mountain: "Mountains",
};

const MARKER_COLORS: Record<string, string> = {
  city: "#C9933A",
  region: "#7C3AED",
  body_of_water: "#3B82F6",
  mountain: "#22C55E",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HOLY_LAND_REGION = {
  latitude: 31.5,
  longitude: 35.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function MapsTimelineScreen() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<Tab>((tabParam as Tab) || "maps");

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {activeTab === "maps" ? "Bible Maps" : "Timeline"}
          </Text>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundSecondary }]}>
            {(["maps", "timeline"] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setActiveTab(t)}
                style={[styles.toggleBtn, activeTab === t && { backgroundColor: theme.accent }]}
              >
                <Ionicons
                  name={t === "maps" ? "map" : "time"}
                  size={14}
                  color={activeTab === t ? "#fff" : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: activeTab === t ? "#fff" : theme.textSecondary,
                      fontFamily: activeTab === t ? "Inter_600SemiBold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {t === "maps" ? "Maps" : "Timeline"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {activeTab === "maps" ? (
          <MapsContent theme={theme} isDark={isDark} bottomPad={bottomPad} />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <TimelineContent theme={theme} />
          </ScrollView>
        )}
      </View>
    </>
  );
}

function MapsContent({
  theme,
  isDark,
  bottomPad,
}: {
  theme: typeof Colors.light;
  isDark: boolean;
  bottomPad: number;
}) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/location"],
  });

  const { data: linkedVerses } = useQuery<LinkedVerse[]>({
    queryKey: [`/api/location/${selectedLocation?.id}/verses`],
    enabled: !!selectedLocation,
  });

  const mappableLocations = useMemo(() => {
    if (!locations) return [];
    return locations.filter((l): l is Location & { latitude: string; longitude: string } => !!l.latitude && !!l.longitude);
  }, [locations]);

  const handleMarkerPress = useCallback(
    (loc: any) => {
      setSelectedLocation(loc as Location);
    },
    []
  );

  const handleListPress = useCallback(
    (loc: Location) => {
      setSelectedLocation(loc);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const grouped = useMemo(() => {
    if (!locations) return {};
    const g: Record<string, Location[]> = {};
    for (const loc of locations) {
      const type = loc.locationType || "other";
      if (!g[type]) g[type] = [];
      g[type].push(loc);
    }
    return g;
  }, [locations]);

  const typeOrder = ["city", "region", "mountain", "body_of_water", "other"];

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.mapContainer}>
        <BibleMap
          locations={mappableLocations}
          selectedLocation={selectedLocation && selectedLocation.latitude && selectedLocation.longitude ? {
            id: selectedLocation.id,
            name: selectedLocation.name,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            locationType: selectedLocation.locationType,
          } : null}
          defaultLat={HOLY_LAND_REGION.latitude}
          defaultLon={HOLY_LAND_REGION.longitude}
          onMarkerPress={handleMarkerPress}
        />

        {selectedLocation && (
          <View style={[styles.mapOverlayCard, { backgroundColor: isDark ? "#1A1A2E" : "#fff" }]}>
            <Pressable onPress={clearSelection} style={styles.overlayClose}>
              <Ionicons name="close-circle" size={24} color={theme.textMuted} />
            </Pressable>
            <View style={styles.overlayHeader}>
              <View style={[styles.overlayIcon, { backgroundColor: (MARKER_COLORS[selectedLocation.locationType || "city"] || "#C9933A") + "25" }]}>
                <Ionicons
                  name={TYPE_ICONS[selectedLocation.locationType || "city"] || "location-outline"}
                  size={20}
                  color={MARKER_COLORS[selectedLocation.locationType || "city"] || "#C9933A"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.overlayTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
                  {selectedLocation.name}
                </Text>
                {selectedLocation.modernName && (
                  <Text style={[styles.overlaySubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    Modern: {selectedLocation.modernName}
                  </Text>
                )}
              </View>
            </View>
            {selectedLocation.description && (
              <Text
                style={[styles.overlayDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                numberOfLines={3}
              >
                {selectedLocation.description}
              </Text>
            )}
            {selectedLocation.era && (
              <View style={[styles.eraBadge, { backgroundColor: theme.accent + "18" }]}>
                <Ionicons name="time-outline" size={12} color={theme.accent} />
                <Text style={[styles.eraText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                  {selectedLocation.era}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.locationList}
        contentContainerStyle={[styles.locationListContent, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {selectedLocation ? (
          <View style={styles.detailSection}>
            <Pressable onPress={clearSelection} style={styles.backRow}>
              <Ionicons name="chevron-back" size={16} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                All Locations
              </Text>
            </Pressable>

            {selectedLocation.description && (
              <View style={[styles.detailCard, { backgroundColor: theme.backgroundCard }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
                  <Text style={[styles.cardHeaderLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                    Description
                  </Text>
                </View>
                <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {selectedLocation.description}
                </Text>
              </View>
            )}

            {selectedLocation.latitude && selectedLocation.longitude && (
              <View style={[styles.coordBadge, { backgroundColor: theme.backgroundCard }]}>
                <Ionicons name="navigate-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.coordText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {parseFloat(selectedLocation.latitude).toFixed(4)}, {parseFloat(selectedLocation.longitude).toFixed(4)}
                </Text>
              </View>
            )}

            {linkedVerses && linkedVerses.length > 0 && (
              <View style={[styles.detailCard, { backgroundColor: theme.backgroundCard }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="book-outline" size={16} color={theme.bookmarkBlue} />
                  <Text style={[styles.cardHeaderLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                    Referenced Verses ({linkedVerses.length})
                  </Text>
                </View>
                {linkedVerses.map((v) => (
                  <View key={v.verseId} style={[styles.verseRow, { borderColor: theme.border }]}>
                    <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                      {v.bookName} {v.chapter}:{v.verse}
                    </Text>
                    <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>
                      {v.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {locations ? `${locations.length} Biblical Locations` : "Loading..."}
            </Text>
            {typeOrder.map((type) => {
              const locs = grouped[type];
              if (!locs || locs.length === 0) return null;
              return (
                <React.Fragment key={type}>
                  <Text
                    style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}
                  >
                    {TYPE_LABELS[type] || type}
                  </Text>
                  {locs.map((loc) => (
                    <Pressable
                      key={loc.id}
                      onPress={() => handleListPress(loc)}
                      style={({ pressed }) => [
                        styles.regionCard,
                        {
                          backgroundColor: theme.backgroundCard,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.regionIcon,
                          { backgroundColor: (MARKER_COLORS[type] || "#C9933A") + "18" },
                        ]}
                      >
                        <Ionicons
                          name={TYPE_ICONS[type] || "location-outline"}
                          size={22}
                          color={MARKER_COLORS[type] || "#C9933A"}
                        />
                      </View>
                      <View style={styles.regionInfo}>
                        <Text
                          style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                        >
                          {loc.name}
                        </Text>
                        <Text
                          style={[styles.regionPlaces, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
                          numberOfLines={1}
                        >
                          {[loc.modernName, loc.era].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </Pressable>
                  ))}
                </React.Fragment>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TimelineContent({ theme }: { theme: typeof Colors.light }) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const { data: events, isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/timeline"],
  });

  const { data: linkedVerses } = useQuery<LinkedVerse[]>({
    queryKey: [`/api/timeline/${selectedEvent?.id}/verses`],
    enabled: !!selectedEvent,
  });

  const grouped = React.useMemo(() => {
    if (!events) return [];
    const g: Record<string, TimelineEvent[]> = {};
    const order: string[] = [];
    for (const ev of events) {
      const p = ev.period || "Unknown";
      if (!g[p]) {
        g[p] = [];
        order.push(p);
      }
      g[p].push(ev);
    }
    return order.map((p) => ({ period: p, events: g[p] }));
  }, [events]);

  if (selectedEvent) {
    return (
      <View style={styles.tabContent}>
        <Pressable onPress={() => setSelectedEvent(null)} style={styles.backRow}>
          <Ionicons name="chevron-back" size={16} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>Timeline</Text>
        </Pressable>

        <View style={[styles.detailHeader, { backgroundColor: theme.primary }]}>
          <Ionicons name="time-outline" size={28} color={Colors.light.accent} />
          <Text style={[styles.detailTitle, { fontFamily: "Lora_700Bold" }]}>{selectedEvent.title}</Text>
          {selectedEvent.yearLabel && (
            <Text style={[styles.detailModern, { fontFamily: "Inter_400Regular" }]}>{selectedEvent.yearLabel}</Text>
          )}
        </View>

        {selectedEvent.description && (
          <View style={[styles.detailCard, { backgroundColor: theme.backgroundCard }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.cardHeaderLabel, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                Description
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {selectedEvent.description}
            </Text>
          </View>
        )}

        {linkedVerses && linkedVerses.length > 0 && (
          <View style={[styles.detailCard, { backgroundColor: theme.backgroundCard }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="book-outline" size={16} color={theme.bookmarkBlue} />
              <Text style={[styles.cardHeaderLabel, { color: theme.bookmarkBlue, fontFamily: "Inter_600SemiBold" }]}>
                Key Verses ({linkedVerses.length})
              </Text>
            </View>
            {linkedVerses.map((v) => (
              <View key={v.verseId} style={[styles.verseRow, { borderColor: theme.border }]}>
                <Text style={[styles.verseRef, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {v.bookName} {v.chapter}:{v.verse}
                </Text>
                <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]}>{v.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Biblical History
      </Text>
      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.accent} />
        </View>
      )}
      {grouped.map((group, gi) => (
        <View key={group.period} style={styles.timelineRow}>
          <View style={styles.spineLine}>
            <View style={[styles.spineDot, { backgroundColor: theme.accent }]} />
            {gi < grouped.length - 1 && (
              <View style={[styles.spineTrail, { backgroundColor: theme.border }]} />
            )}
          </View>
          <View style={[styles.timelineCard, { backgroundColor: theme.backgroundCard }]}>
            <Text style={[styles.periodYear, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {group.events[0]?.yearLabel || ""}
              {group.events.length > 1 && group.events[group.events.length - 1]?.yearLabel
                ? ` \u2013 ${group.events[group.events.length - 1]?.yearLabel}`
                : ""}
            </Text>
            <Text style={[styles.periodName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {group.period}
            </Text>
            <View style={styles.eventsList}>
              {group.events.map((ev) => (
                <Pressable
                  key={ev.id}
                  onPress={() => setSelectedEvent(ev)}
                  style={({ pressed }) => [styles.eventRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[styles.eventDot, { backgroundColor: theme.accent + "88" }]} />
                  <Text
                    style={[styles.eventText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                  >
                    {ev.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={theme.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24 },
  toggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  toggleText: { fontSize: 13 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  tabContent: { gap: 12 },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlayCard: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  overlayClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 28,
  },
  overlayIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayTitle: { fontSize: 16 },
  overlaySubtitle: { fontSize: 12, marginTop: 2 },
  overlayDesc: { fontSize: 13, lineHeight: 20 },
  eraBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  eraText: { fontSize: 11 },
  locationList: {
    flex: 1,
  },
  locationListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  detailSection: { gap: 12 },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 4,
  },
  regionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  regionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 15, marginBottom: 3 },
  regionPlaces: { fontSize: 12 },
  coordBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  coordText: { fontSize: 12 },
  timelineRow: { flexDirection: "row", gap: 14 },
  spineLine: { alignItems: "center", width: 16, paddingTop: 14 },
  spineDot: { width: 12, height: 12, borderRadius: 6 },
  spineTrail: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -4,
    borderRadius: 1,
  },
  timelineCard: { flex: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  periodYear: { fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  periodName: { fontSize: 16, marginBottom: 10 },
  eventsList: { gap: 6 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  eventText: { fontSize: 13, lineHeight: 18, flex: 1 },
  loadingBox: { alignItems: "center", paddingVertical: 30, gap: 10 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  backText: { fontSize: 14 },
  detailHeader: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  detailTitle: { color: "#EDE5D5", fontSize: 20, textAlign: "center" as const },
  detailModern: { color: "rgba(237,229,213,0.65)", fontSize: 13 },
  detailCard: { borderRadius: 14, padding: 16, gap: 10 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  cardHeaderLabel: { fontSize: 12, letterSpacing: 0.3 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  verseRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 4,
  },
  verseRef: { fontSize: 12, letterSpacing: 0.3 },
  verseText: { fontSize: 14, lineHeight: 22 },
});
