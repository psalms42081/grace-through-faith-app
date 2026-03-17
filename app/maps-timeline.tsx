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
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import AtlasPlate from "@/components/AtlasPlate";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { getLocationsByEra, ERA_OPTIONS, BIBLICAL_LOCATIONS, BIBLICAL_PEOPLE_GROUPS, BIBLICAL_PROPHECY_LINKS, BIBLICAL_JOURNEY_ROUTES, BIBLICAL_KINGDOM_OVERLAYS, BIBLICAL_TRIBE_OVERLAYS, JOURNEY_FILTER_OPTIONS, JOURNEY_ROUTE_COLORS, type EraFilter, type JourneyFilter, type BiblicalLocation } from "@/constants/biblical-locations";
import { getPlateForEra, getPlateForJourney, type AtlasHotspot } from "@/constants/atlas-plates";

type Tab = "maps" | "timeline";

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
          <MapsContent theme={theme} bottomPad={bottomPad} selectedEra={selectedEra} setSelectedEra={setSelectedEra} selectedJourney={selectedJourney} setSelectedJourney={setSelectedJourney} />
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

const MAX_PLATE_HEIGHT = 520;

const ERA_DESCRIPTIONS: Record<string, string> = {
  All: "Explore key biblical locations across every era of Scripture.",
  Patriarchs: "The world of Abraham, Isaac, and Jacob \u2014 from Ur to the Promised Land.",
  Exodus: "Israel's deliverance from Egypt and the journey to Canaan.",
  Kingdom: "The united monarchy and the era of David and Solomon.",
  Exile: "The fall of Israel and Judah, and the Babylonian captivity.",
  "Early Church": "The apostolic age and the spread of the gospel across the Roman Empire.",
};

function MapsContent({
  theme,
  bottomPad,
  selectedEra,
  setSelectedEra,
  selectedJourney,
  setSelectedJourney,
}: {
  theme: typeof Colors.light;
  bottomPad: number;
  selectedEra: EraFilter;
  setSelectedEra: (e: EraFilter) => void;
  selectedJourney: JourneyFilter;
  setSelectedJourney: (j: JourneyFilter) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState(false);

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

  const plateContainerWidth = screenWidth - 32;
  const plateHeight = useMemo(() => {
    const naturalHeight = plateContainerWidth / currentPlate.aspectRatio;
    return Math.min(naturalHeight, MAX_PLATE_HEIGHT);
  }, [currentPlate.aspectRatio, plateContainerWidth]);

  const curatedLocations = useMemo(() => {
    return getLocationsByEra(selectedEra);
  }, [selectedEra]);

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

  const navigateToLocation = useCallback((loc: BiblicalLocation) => {
    router.push({ pathname: `/location/${loc.id}`, params: { mode: "biblical", era: selectedEra, journey: selectedJourney } } as any);
  }, [selectedEra, selectedJourney]);

  const journeyRoutesForEra = useMemo(() => {
    if (!eraHasJourneys) return [];
    if (selectedEra === "Exodus") return BIBLICAL_JOURNEY_ROUTES.filter((r) => r.id === "exodus-route");
    return BIBLICAL_JOURNEY_ROUTES.filter((r) => r.category === "Early Church");
  }, [eraHasJourneys, selectedEra]);

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

      <View style={[styles.mapContainer, { height: plateHeight }]}>
        <AtlasPlate
          key={currentPlate.id}
          plate={currentPlate}
          onHotspotPress={handleHotspotPress}
        />
      </View>

      <View style={styles.plateMetaRow}>
        <Text style={[styles.plateSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {currentPlate.subtitle}
        </Text>
        <Text style={[styles.plateAttribution, { color: theme.textMuted }]}>
          Bible Mapper
        </Text>
      </View>

      <ScrollView
        style={styles.locationList}
        contentContainerStyle={[styles.locationListContent, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabContent}>
          <Text style={[styles.eraDescription, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            {ERA_DESCRIPTIONS[selectedEra] || ""}
          </Text>

          {eraHasJourneys && (
            <>
              {selectedJourney === "all" && journeyRoutesForEra.length > 1 && (
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                  Journey Routes
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
                      {jr.stopLocationIds.length} stops
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
            </>
          )}

          {curatedLocations.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold", marginTop: eraHasJourneys ? 6 : 0 }]}>
                {selectedEra === "All" ? "Key Locations" : `${selectedEra} Locations`}
              </Text>
              {curatedLocations.map((loc) => (
                <Pressable
                  key={loc.id}
                  onPress={() => navigateToLocation(loc)}
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
                      { backgroundColor: "#C9933A18" },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color="#C9933A"
                    />
                  </View>
                  <View style={styles.regionInfo}>
                    <Text
                      style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                    >
                      {loc.name}
                    </Text>
                    <Text
                      style={[styles.regionPlaces, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}
                      numberOfLines={1}
                    >
                      {loc.ancientRegion}
                    </Text>
                    <Text
                      style={[styles.locDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                      numberOfLines={2}
                    >
                      {loc.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ alignSelf: "flex-start", marginTop: 4 }} />
                </Pressable>
              ))}
            </>
          )}
        </View>
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
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  eraChipText: {
    fontSize: 11.5,
    lineHeight: 14,
  },
  pgDescPreview: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  journeyScrollRow: {
    maxHeight: 30,
    marginTop: 2,
    marginBottom: 4,
  },
  journeyScrollContent: {
    paddingHorizontal: 16,
    gap: 7,
    alignItems: "center" as const,
  },
  journeyChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  journeyChipText: {
    fontSize: 11,
    lineHeight: 13,
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
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  plateMetaRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 2,
  },
  plateSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  plateAttribution: {
    fontSize: 8.5,
    opacity: 0.22,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  locationList: {
    flex: 1,
  },
  locationListContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  eraDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 6,
  },
  locDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  regionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  regionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 15, marginBottom: 3 },
  regionPlaces: { fontSize: 12 },
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
});
