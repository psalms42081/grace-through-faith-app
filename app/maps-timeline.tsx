import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import AtlasPlate from "@/components/AtlasPlate";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { getLocationByName, getLocationsByEra, ERA_OPTIONS, BIBLICAL_LOCATIONS, BIBLICAL_PEOPLE_GROUPS, BIBLICAL_PROPHECY_LINKS, BIBLICAL_JOURNEY_ROUTES, BIBLICAL_KINGDOM_OVERLAYS, BIBLICAL_TRIBE_OVERLAYS, JOURNEY_FILTER_OPTIONS, JOURNEY_ROUTE_COLORS, type EraFilter, type JourneyFilter } from "@/constants/biblical-locations";
import { getPlateForEra, getPlateForJourney, type AtlasHotspot } from "@/constants/atlas-plates";

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

type SearchResultType = "location" | "people-group" | "prophecy" | "journey" | "kingdom" | "tribe";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  color: string;
}

const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  "location": "Location",
  "people-group": "People Group",
  "prophecy": "Prophecy",
  "journey": "Journey",
  "kingdom": "Kingdom",
  "tribe": "Tribe",
};

const SEARCH_TYPE_COLORS: Record<SearchResultType, string> = {
  "location": "#C9933A",
  "people-group": "#7C3AED",
  "prophecy": "#D97706",
  "journey": "#14B8A6",
  "kingdom": "#BE185D",
  "tribe": "#059669",
};

const SEARCH_TYPE_ICONS: Record<SearchResultType, keyof typeof Ionicons.glyphMap> = {
  "location": "location-outline",
  "people-group": "people-outline",
  "prophecy": "flame-outline",
  "journey": "trail-sign-outline",
  "kingdom": "shield-outline",
  "tribe": "people-outline",
};

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const loc of BIBLICAL_LOCATIONS) {
    results.push({
      id: loc.id,
      type: "location",
      title: loc.name,
      subtitle: `${loc.ancientRegion} \u00B7 ${loc.modernLocation}`,
      color: "#C9933A",
    });
  }
  for (const pg of BIBLICAL_PEOPLE_GROUPS) {
    results.push({
      id: pg.id,
      type: "people-group",
      title: pg.name,
      subtitle: pg.regionLabel,
      color: "#7C3AED",
    });
  }
  for (const pl of BIBLICAL_PROPHECY_LINKS) {
    results.push({
      id: pl.id,
      type: "prophecy",
      title: pl.title,
      subtitle: pl.theme,
      color: "#D97706",
    });
  }
  for (const jr of BIBLICAL_JOURNEY_ROUTES) {
    results.push({
      id: jr.id,
      type: "journey",
      title: jr.title,
      subtitle: `${jr.category} \u00B7 ${jr.stopLocationIds.length} stops`,
      color: JOURNEY_ROUTE_COLORS[jr.id] || "#14B8A6",
    });
  }
  for (const k of BIBLICAL_KINGDOM_OVERLAYS) {
    results.push({
      id: k.id,
      type: "kingdom",
      title: k.name,
      subtitle: k.eraLabel,
      color: k.color,
    });
  }
  for (const t of BIBLICAL_TRIBE_OVERLAYS) {
    results.push({
      id: t.id,
      type: "tribe",
      title: t.name,
      subtitle: t.regionLabel,
      color: t.color,
    });
  }
  return results;
}

const SEARCH_INDEX = buildSearchIndex();

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

const ATLAS_ERA_OPTIONS = ERA_OPTIONS.filter((e) => e !== "Life of Christ");

export default function MapsTimelineScreen() {
  const { tab: tabParam, era: eraParam, journey: journeyParam } = useLocalSearchParams<{ tab?: string; era?: string; journey?: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<Tab>((tabParam as Tab) || "maps");
  const [selectedEra, setSelectedEra] = useState<EraFilter>((eraParam as EraFilter) || "All");
  const [selectedJourney, setSelectedJourney] = useState<JourneyFilter>((journeyParam as JourneyFilter) || "all");

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
          <MapsContent theme={theme} isDark={isDark} bottomPad={bottomPad} selectedEra={selectedEra} setSelectedEra={setSelectedEra} selectedJourney={selectedJourney} setSelectedJourney={setSelectedJourney} />
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
  selectedEra,
  setSelectedEra,
  selectedJourney,
  setSelectedJourney,
}: {
  theme: typeof Colors.light;
  isDark: boolean;
  bottomPad: number;
  selectedEra: EraFilter;
  setSelectedEra: (e: EraFilter) => void;
  selectedJourney: JourneyFilter;
  setSelectedJourney: (j: JourneyFilter) => void;
}) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ["/api/location"],
  });

  const { data: linkedVerses } = useQuery<LinkedVerse[]>({
    queryKey: [`/api/location/${selectedLocation?.id}/verses`],
    enabled: !!selectedLocation,
  });

  const eraFilteredNames = useMemo(() => {
    if (selectedEra === "All") return null;
    const eraLocs = getLocationsByEra(selectedEra);
    return new Set(eraLocs.map((l) => l.name.toLowerCase()));
  }, [selectedEra]);

  const eraHasJourneys = selectedEra === "Early Church" || selectedEra === "Exodus";

  useEffect(() => {
    if (selectedEra === "Life of Christ") setSelectedEra("Kingdom");
    if (!eraHasJourneys && selectedJourney !== "all") setSelectedJourney("all");
    if (selectedEra === "Exodus" && selectedJourney !== "all" && selectedJourney !== "exodus-route") setSelectedJourney("all");
    if (selectedEra === "Early Church" && selectedJourney === "exodus-route") setSelectedJourney("all");
  }, [selectedEra, selectedJourney, eraHasJourneys]);

  const journeyActive = eraHasJourneys && selectedJourney !== "all";

  const currentPlate = useMemo(() => {
    if (journeyActive) {
      const journeyPlate = getPlateForJourney(selectedJourney);
      if (journeyPlate) return journeyPlate;
    }
    return getPlateForEra(selectedEra);
  }, [selectedEra, journeyActive, selectedJourney]);

  const handleHotspotPress = useCallback((hotspot: AtlasHotspot) => {
    switch (hotspot.targetType) {
      case "location":
        router.push({ pathname: `/location/${hotspot.targetId}`, params: { mode: "biblical", era: selectedEra, journey: selectedJourney } } as any);
        break;
      case "journey":
        router.push({ pathname: `/journey-route/${hotspot.targetId}`, params: { mode: "biblical", era: selectedEra, journey: hotspot.targetId } } as any);
        break;
      case "kingdom":
        router.push({ pathname: `/kingdom-overlay/${hotspot.targetId}`, params: { mode: "biblical", era: selectedEra } } as any);
        break;
    }
  }, [selectedEra, selectedJourney]);

  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const titleMatches: SearchResult[] = [];
    const subtitleMatches: SearchResult[] = [];
    for (const item of SEARCH_INDEX) {
      const titleLower = item.title.toLowerCase();
      const subtitleLower = item.subtitle.toLowerCase();
      if (titleLower.includes(q)) {
        titleMatches.push(item);
      } else if (subtitleLower.includes(q)) {
        subtitleMatches.push(item);
      }
    }
    return [...titleMatches, ...subtitleMatches].slice(0, 15);
  }, [searchQuery]);

  const handleSearchResultPress = useCallback((result: SearchResult) => {
    setSearchFocused(false);
    switch (result.type) {
      case "location":
        router.push({ pathname: `/location/${result.id}`, params: { mode: "biblical", era: selectedEra, journey: selectedJourney } } as any);
        break;
      case "people-group":
        router.push({ pathname: `/people-group/${result.id}`, params: { mode: "biblical", era: selectedEra } } as any);
        break;
      case "prophecy":
        router.push({ pathname: `/prophecy-link/${result.id}`, params: { mode: "biblical", era: selectedEra } } as any);
        break;
      case "journey":
        router.push({ pathname: `/journey-route/${result.id}`, params: { mode: "biblical", era: selectedEra, journey: result.id } } as any);
        break;
      case "kingdom":
        router.push({ pathname: `/kingdom-overlay/${result.id}`, params: { mode: "biblical", era: selectedEra } } as any);
        break;
      case "tribe":
        router.push({ pathname: `/tribe-overlay/${result.id}`, params: { mode: "biblical", era: selectedEra } } as any);
        break;
    }
  }, [selectedEra, selectedJourney]);

  const navigateToLocationDetail = useCallback((loc: Location) => {
    const enriched = getLocationByName(loc.name);
    if (enriched) {
      router.push({ pathname: `/location/${enriched.id}`, params: { mode: "biblical", era: selectedEra, journey: selectedJourney } } as any);
    } else {
      setSelectedLocation(loc);
    }
  }, [selectedEra, selectedJourney]);

  const handleListPress = useCallback(
    (loc: Location) => {
      navigateToLocationDetail(loc);
    },
    [navigateToLocationDetail]
  );

  const clearSelection = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    if (!eraFilteredNames) return locations;
    return locations.filter((l) => eraFilteredNames.has(l.name.toLowerCase()));
  }, [locations, eraFilteredNames]);

  const grouped = useMemo(() => {
    const g: Record<string, Location[]> = {};
    for (const loc of filteredLocations) {
      const type = loc.locationType || "other";
      if (!g[type]) g[type] = [];
      g[type].push(loc);
    }
    return g;
  }, [filteredLocations]);

  const typeOrder = ["city", "region", "mountain", "body_of_water", "other"];

  const getSubtitleForLocation = useCallback((loc: Location): string => {
    const enriched = getLocationByName(loc.name);
    if (enriched) {
      const parts = [enriched.ancientRegion];
      if (enriched.eras.length > 0) parts.push(enriched.eras.length <= 2 ? enriched.eras.join(" to ") : `${enriched.eras[0]} to ${enriched.eras[enriched.eras.length - 1]}`);
      return parts.join(" \u00B7 ");
    }
    return loc.era || "";
  }, []);

  const journeyRoutesForEra = useMemo(() => {
    if (!eraHasJourneys) return [];
    if (selectedEra === "Exodus") return BIBLICAL_JOURNEY_ROUTES.filter((r) => r.id === "exodus-route");
    return BIBLICAL_JOURNEY_ROUTES.filter((r) => r.category === "Early Church");
  }, [eraHasJourneys, selectedEra]);

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.eraScrollRow}
        contentContainerStyle={styles.eraScrollContent}
      >
        {ATLAS_ERA_OPTIONS.map((era) => (
          <Pressable
            key={era}
            onPress={() => {
              setSelectedEra(era);
              setSelectedJourney("all");
            }}
            style={[
              styles.eraChip,
              {
                backgroundColor: selectedEra === era ? theme.accent : theme.backgroundSecondary,
                borderColor: selectedEra === era ? theme.accent : "transparent",
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.eraChipText,
                {
                  color: selectedEra === era ? "#fff" : theme.textMuted,
                  fontFamily: selectedEra === era ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {era}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {eraHasJourneys && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.journeyScrollRow}
          contentContainerStyle={styles.journeyScrollContent}
        >
          {JOURNEY_FILTER_OPTIONS.filter((opt) => {
            if (opt.value === "all") return true;
            if (selectedEra === "Exodus" && opt.value === "exodus-route") return true;
            if (selectedEra === "Early Church" && opt.value !== "exodus-route") return true;
            return false;
          }).map((opt) => {
            const isActive = selectedJourney === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSelectedJourney(opt.value)}
                style={[
                  styles.journeyChip,
                  {
                    backgroundColor: isActive
                      ? (opt.value !== "all" ? JOURNEY_ROUTE_COLORS[opt.value] || theme.accent : theme.accent)
                      : theme.backgroundSecondary,
                    borderColor: "transparent",
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.journeyChipText,
                    {
                      color: isActive ? "#fff" : theme.textMuted,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputRow, { backgroundColor: theme.backgroundCard, borderColor: searchFocused ? theme.accent : theme.border }]}>
          <Ionicons name="search-outline" size={16} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            placeholder="Search locations, people groups, prophecy, or journeys"
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(""); setSearchFocused(false); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
        {searchQuery.trim().length >= 2 && searchFocused && (
          <View style={[styles.searchResultsPanel, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            {searchResults.length > 0 ? (
              <ScrollView style={styles.searchResultsScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {searchResults.map((r) => (
                  <Pressable
                    key={`${r.type}-${r.id}`}
                    onPress={() => handleSearchResultPress(r)}
                    style={({ pressed }) => [styles.searchResultRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.searchResultIcon, { backgroundColor: (SEARCH_TYPE_COLORS[r.type] || r.color) + "14" }]}>
                      <Ionicons name={SEARCH_TYPE_ICONS[r.type]} size={14} color={SEARCH_TYPE_COLORS[r.type] || r.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.searchResultTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                        {r.title}
                      </Text>
                      <Text style={[styles.searchResultSub, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                        {r.subtitle}
                      </Text>
                    </View>
                    <View style={[styles.searchTypeBadge, { backgroundColor: (SEARCH_TYPE_COLORS[r.type] || r.color) + "18" }]}>
                      <Text style={[styles.searchTypeBadgeText, { color: SEARCH_TYPE_COLORS[r.type] || r.color, fontFamily: "Inter_500Medium" }]}>
                        {SEARCH_TYPE_LABELS[r.type]}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.searchEmpty}>
                <Ionicons name="search-outline" size={24} color={theme.textMuted} />
                <Text style={[styles.searchEmptyText, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                  No matching map results
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={[styles.mapContainer, journeyActive && { height: 280 }]}>
        <AtlasPlate
          key={currentPlate.id}
          plate={currentPlate}
          onHotspotPress={handleHotspotPress}
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
                <Text style={[styles.overlaySubtitle, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {(() => { const e = getLocationByName(selectedLocation.name); return e ? `Region: ${e.ancientRegion}` : (selectedLocation.era || ""); })()}
                </Text>
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
        ) : eraHasJourneys ? (
          <View style={styles.tabContent}>
            {selectedJourney === "all" && (
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {`${journeyRoutesForEra.length} Journey Route${journeyRoutesForEra.length !== 1 ? "s" : ""}`}
              </Text>
            )}
            {(selectedJourney === "all"
              ? journeyRoutesForEra
              : BIBLICAL_JOURNEY_ROUTES.filter((r) => r.id === selectedJourney)
            ).map((jr) => (
              <Pressable
                key={jr.id}
                onPress={() => router.push({ pathname: `/journey-route/${jr.id}`, params: { mode: "biblical", era: selectedEra, journey: jr.id } } as any)}
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
                    { backgroundColor: (JOURNEY_ROUTE_COLORS[jr.id] || "#C9933A") + "18" },
                  ]}
                >
                  <Ionicons name="trail-sign-outline" size={22} color={JOURNEY_ROUTE_COLORS[jr.id] || "#C9933A"} />
                </View>
                <View style={[styles.regionInfo, { flex: 1 }]}>
                  <Text
                    style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                  >
                    {jr.title}
                  </Text>
                  <Text
                    style={[styles.regionPlaces, { color: JOURNEY_ROUTE_COLORS[jr.id] || "#C9933A", fontFamily: "Inter_500Medium" }]}
                    numberOfLines={1}
                  >
                    {jr.category} -- {jr.stopLocationIds.length} stops
                  </Text>
                  <Text
                    style={[styles.pgDescPreview, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={2}
                  >
                    {jr.shortDescription}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}

            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
              {`${filteredLocations.length} Biblical Location${filteredLocations.length !== 1 ? "s" : ""}`}
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
                          {getSubtitleForLocation(loc)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </Pressable>
                  ))}
                </React.Fragment>
              );
            })}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {filteredLocations.length === 0 && selectedEra !== "All" ? (
              <View style={[styles.emptyStateCard, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[styles.emptyStateTitle, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                  No matching places yet
                </Text>
                <Text style={[styles.emptyStateBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Try another era or use the search bar above.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {filteredLocations.length > 0
                    ? `${filteredLocations.length} Biblical Location${filteredLocations.length !== 1 ? "s" : ""}${selectedEra !== "All" ? ` \u00B7 ${selectedEra}` : ""}`
                    : "Loading..."}
                </Text>
                {filteredLocations.length > 0 && filteredLocations.length <= 2 && selectedEra !== "All" && (
                  <Text style={[styles.contextHelper, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {selectedEra === "Patriarchs" ? "Places connected to the earliest biblical world."
                      : selectedEra === "Exodus" ? "Tracing the Exodus world through key locations."
                      : selectedEra === "Exile" ? "Key places connected to exile and return."
                      : selectedEra === "Kingdom" ? "Places tied to the divided kingdom period."
                      : selectedEra === "Early Church" ? "Locations significant to the early Christian movement."
                      : `Key places from the ${selectedEra} period.`}
                  </Text>
                )}
              </>
            )}
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
                          {getSubtitleForLocation(loc)}
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
                <Pressable key={ev.id} onPress={() => setSelectedEvent(ev)} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.eventText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {ev.title}
                  </Text>
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
  container: { flex: 1, paddingTop: Platform.OS === "web" ? 67 : 0 },
  eraScrollRow: {
    maxHeight: 36,
    marginBottom: 2,
  },
  eraScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  eraChip: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  eraChipText: {
    fontSize: 12,
    lineHeight: 14,
  },
  pgDescPreview: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  journeyScrollRow: {
    maxHeight: 32,
    marginBottom: 2,
  },
  journeyScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: "center" as const,
  },
  journeyChip: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  journeyChipText: {
    fontSize: 12,
    lineHeight: 14,
  },
  headerRow: {
    paddingHorizontal: 22,
    paddingBottom: 4,
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
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleText: { fontSize: 13 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  tabContent: { gap: 12 },
  mapContainer: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 4,
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
    paddingTop: 2,
  },
  detailSection: { gap: 12 },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 2,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 1,
    paddingBottom: 4,
    zIndex: 10,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  searchResultsPanel: {
    position: "absolute",
    top: Platform.OS === "web" ? 48 : 44,
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 280,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  searchResultsScroll: {
    maxHeight: 280,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultTitle: {
    fontSize: 14,
  },
  searchResultSub: {
    fontSize: 11,
    marginTop: 1,
  },
  searchTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  searchTypeBadgeText: {
    fontSize: 10,
  },
  searchEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  searchEmptyText: {
    fontSize: 14,
  },
  emptyStateCard: {
    borderRadius: 14,
    padding: 20,
    alignItems: "center" as const,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
  },
  emptyStateBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center" as const,
  },
  contextHelper: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
});
