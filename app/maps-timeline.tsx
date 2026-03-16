import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import BibleMap from "@/components/BibleMap";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { getLocationByName, getLocationsByEra, getRouteCoordinates, ERA_OPTIONS, OVERLAY_OPTIONS, BIBLICAL_LOCATIONS, BIBLICAL_PEOPLE_GROUPS, BIBLICAL_PROPHECY_LINKS, BIBLICAL_JOURNEY_ROUTES, BIBLICAL_KINGDOM_OVERLAYS, BIBLICAL_TRIBE_OVERLAYS, JOURNEY_FILTER_OPTIONS, JOURNEY_ROUTE_COLORS, type EraFilter, type OverlayType, type JourneyFilter } from "@/constants/biblical-locations";
import type { RouteLineData, KingdomMarkerData, TribeMarkerData } from "@/components/BibleMap";

type Tab = "maps" | "timeline";
type MapMode = "modern" | "biblical";

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
  latitude?: number;
  longitude?: number;
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
      latitude: loc.latitude,
      longitude: loc.longitude,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HOLY_LAND_REGION = {
  latitude: 31.5,
  longitude: 35.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function MapsTimelineScreen() {
  const { tab: tabParam, mode: modeParam, era: eraParam, overlay: overlayParam, journey: journeyParam, kingdom: kingdomParam, tribe: tribeParam } = useLocalSearchParams<{ tab?: string; mode?: string; era?: string; overlay?: string; journey?: string; kingdom?: string; tribe?: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<Tab>((tabParam as Tab) || "maps");
  const [mapMode, setMapMode] = useState<MapMode>((modeParam as MapMode) || "modern");
  const [selectedEra, setSelectedEra] = useState<EraFilter>((eraParam as EraFilter) || "All");
  const [overlay, setOverlay] = useState<OverlayType>((overlayParam as OverlayType) || "none");
  const [selectedJourney, setSelectedJourney] = useState<JourneyFilter>((journeyParam as JourneyFilter) || "all");
  const [selectedKingdom, setSelectedKingdom] = useState<string>(kingdomParam || "");
  const [selectedTribe, setSelectedTribe] = useState<string>(tribeParam || "");

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
          <MapsContent theme={theme} isDark={isDark} bottomPad={bottomPad} mapMode={mapMode} setMapMode={setMapMode} selectedEra={selectedEra} setSelectedEra={setSelectedEra} overlay={overlay} setOverlay={setOverlay} selectedJourney={selectedJourney} setSelectedJourney={setSelectedJourney} selectedKingdom={selectedKingdom} setSelectedKingdom={setSelectedKingdom} selectedTribe={selectedTribe} setSelectedTribe={setSelectedTribe} />
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
  mapMode,
  setMapMode,
  selectedEra,
  setSelectedEra,
  overlay,
  setOverlay,
  selectedJourney,
  setSelectedJourney,
  selectedKingdom,
  setSelectedKingdom,
  selectedTribe,
  setSelectedTribe,
}: {
  theme: typeof Colors.light;
  isDark: boolean;
  bottomPad: number;
  mapMode: MapMode;
  setMapMode: (m: MapMode) => void;
  selectedEra: EraFilter;
  setSelectedEra: (e: EraFilter) => void;
  overlay: OverlayType;
  setOverlay: (o: OverlayType) => void;
  selectedJourney: JourneyFilter;
  setSelectedJourney: (j: JourneyFilter) => void;
  selectedKingdom: string;
  setSelectedKingdom: (k: string) => void;
  selectedTribe: string;
  setSelectedTribe: (t: string) => void;
}) {
  const isBiblical = mapMode === "biblical";
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

  const mappableLocations = useMemo(() => {
    if (!locations) return [];
    let filtered = locations.filter((l): l is Location & { latitude: string; longitude: string } => !!l.latitude && !!l.longitude);
    if (eraFilteredNames) {
      filtered = filtered.filter((l) => eraFilteredNames.has(l.name.toLowerCase()));
    }
    return filtered;
  }, [locations, eraFilteredNames]);

  const routeLines = useMemo((): RouteLineData[] => {
    if (overlay !== "journey-routes") return [];
    const routes = selectedJourney === "all"
      ? BIBLICAL_JOURNEY_ROUTES
      : BIBLICAL_JOURNEY_ROUTES.filter((r) => r.id === selectedJourney);
    return routes.map((route) => ({
      id: route.id,
      coordinates: getRouteCoordinates(route),
      color: JOURNEY_ROUTE_COLORS[route.id] || "#C9933A",
      highlight: selectedJourney !== "all",
    }));
  }, [overlay, selectedJourney]);

  const kingdomMarkers = useMemo((): KingdomMarkerData[] => {
    if (overlay !== "kingdoms") return [];
    return BIBLICAL_KINGDOM_OVERLAYS.map((k) => ({
      id: k.id,
      label: k.mapLabel,
      latitude: k.centerLatitude,
      longitude: k.centerLongitude,
      color: k.color,
      selected: selectedKingdom === k.id,
    }));
  }, [overlay, selectedKingdom]);

  const handleKingdomPress = useCallback((id: string) => {
    setSelectedKingdom(id);
  }, []);

  const tribeMarkers = useMemo((): TribeMarkerData[] => {
    if (overlay !== "tribes") return [];
    return BIBLICAL_TRIBE_OVERLAYS.map((t) => ({
      id: t.id,
      label: t.name.toUpperCase(),
      latitude: t.centerLatitude,
      longitude: t.centerLongitude,
      color: t.color,
      selected: selectedTribe === t.id,
    }));
  }, [overlay, selectedTribe]);

  const handleTribePress = useCallback((id: string) => {
    setSelectedTribe(id);
  }, []);

  const overlayTypeMap: Record<OverlayType, SearchResultType | null> = {
    "none": null,
    "people-groups": "people-group",
    "prophecy": "prophecy",
    "journey-routes": "journey",
    "kingdoms": "kingdom",
    "tribes": "tribe",
  };

  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const priorityType = overlayTypeMap[overlay];
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
    const combined = [...titleMatches, ...subtitleMatches];
    if (priorityType) {
      combined.sort((a, b) => {
        const aP = a.type === priorityType ? 0 : 1;
        const bP = b.type === priorityType ? 0 : 1;
        return aP - bP;
      });
    }
    return combined.slice(0, 15);
  }, [searchQuery, overlay]);

  const handleSearchResultPress = useCallback((result: SearchResult) => {
    setSearchFocused(false);
    switch (result.type) {
      case "location":
        router.push({ pathname: `/location/${result.id}`, params: { mode: mapMode, era: selectedEra, overlay, journey: selectedJourney, kingdom: selectedKingdom, tribe: selectedTribe } } as any);
        break;
      case "people-group":
        router.push({ pathname: `/people-group/${result.id}`, params: { mode: mapMode, era: selectedEra, overlay: overlay || "people-groups" } } as any);
        break;
      case "prophecy":
        router.push({ pathname: `/prophecy-link/${result.id}`, params: { mode: mapMode, era: selectedEra, overlay: overlay || "prophecy" } } as any);
        break;
      case "journey":
        router.push({ pathname: `/journey-route/${result.id}`, params: { mode: mapMode, era: selectedEra, overlay: "journey-routes", journey: result.id } } as any);
        break;
      case "kingdom":
        router.push({ pathname: `/kingdom-overlay/${result.id}`, params: { mode: mapMode, era: selectedEra, overlay: "kingdoms", kingdom: result.id } } as any);
        break;
      case "tribe":
        router.push({ pathname: `/tribe-overlay/${result.id}`, params: { mode: mapMode, era: selectedEra, overlay: "tribes", tribe: result.id } } as any);
        break;
    }
  }, [mapMode, selectedEra, overlay, selectedJourney, selectedKingdom, selectedTribe]);

  const navigateToLocationDetail = useCallback((loc: Location) => {
    const enriched = getLocationByName(loc.name);
    if (enriched) {
      router.push({ pathname: `/location/${enriched.id}`, params: { mode: mapMode, era: selectedEra, overlay, journey: selectedJourney, kingdom: selectedKingdom, tribe: selectedTribe } } as any);
    } else {
      setSelectedLocation(loc);
    }
  }, [mapMode, selectedEra, overlay, selectedJourney, selectedKingdom, selectedTribe]);

  const handleMarkerPress = useCallback(
    (loc: any) => {
      navigateToLocationDetail(loc as Location);
    },
    [navigateToLocationDetail]
  );

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
    if (isBiblical) {
      const enriched = getLocationByName(loc.name);
      if (enriched) return enriched.ancientRegion;
      return loc.era || loc.modernName || "";
    }
    return [loc.modernName, loc.era].filter(Boolean).join(" \u00B7 ");
  }, [isBiblical]);

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.modeToggleRow}>
        {(["modern", "biblical"] as MapMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMapMode(m)}
            style={[
              styles.modeBtn,
              { backgroundColor: mapMode === m ? theme.accent : theme.backgroundSecondary },
            ]}
          >
            <Ionicons
              name={m === "modern" ? "globe-outline" : "book-outline"}
              size={13}
              color={mapMode === m ? "#fff" : theme.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.modeBtnText,
                {
                  color: mapMode === m ? "#fff" : theme.textSecondary,
                  fontFamily: mapMode === m ? "Inter_600SemiBold" : "Inter_500Medium",
                },
              ]}
            >
              {m === "modern" ? "Modern" : "Biblical World"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.eraScrollRow}
        contentContainerStyle={styles.eraScrollContent}
      >
        {ERA_OPTIONS.map((era) => (
          <Pressable
            key={era}
            onPress={() => setSelectedEra(era)}
            style={[
              styles.eraChip,
              {
                backgroundColor: selectedEra === era ? theme.accent : theme.backgroundCard,
                borderColor: selectedEra === era ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.eraChipText,
                {
                  color: selectedEra === era ? "#fff" : theme.textSecondary,
                  fontFamily: selectedEra === era ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {era}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.overlayScrollRow}
        contentContainerStyle={styles.overlayScrollContent}
      >
        {OVERLAY_OPTIONS.map((opt) => {
          const shortLabels: Record<string, string> = {
            "none": "None",
            "people-groups": "Peoples",
            "prophecy": "Prophecy",
            "journey-routes": "Journeys",
            "kingdoms": "Kingdoms",
            "tribes": "Tribes",
          };
          const isActive = overlay === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setOverlay(opt.value)}
              style={[
                styles.overlayPill,
                {
                  backgroundColor: isActive ? theme.accent : theme.backgroundCard,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.overlayPillText,
                  {
                    color: isActive ? "#fff" : theme.textSecondary,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {shortLabels[opt.value] || opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {overlay === "journey-routes" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.journeyScrollRow}
          contentContainerStyle={styles.journeyScrollContent}
        >
          {JOURNEY_FILTER_OPTIONS.map((opt) => {
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
                      : theme.backgroundCard,
                    borderColor: isActive ? "transparent" : theme.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.journeyChipText,
                    {
                      color: isActive ? "#fff" : theme.textSecondary,
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
            placeholder="Search places, peoples, prophecy, journeys..."
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
          routeLines={routeLines}
          kingdomMarkers={kingdomMarkers}
          onKingdomPress={handleKingdomPress}
          tribeMarkers={tribeMarkers}
          onTribePress={handleTribePress}
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
                  {isBiblical
                    ? (() => { const e = getLocationByName(selectedLocation.name); return e ? `Region: ${e.ancientRegion}` : (selectedLocation.era || ""); })()
                    : selectedLocation.modernName ? `Modern: ${selectedLocation.modernName}` : ""
                  }
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
        ) : overlay === "people-groups" ? (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {`${BIBLICAL_PEOPLE_GROUPS.length} People Groups`}
            </Text>
            {BIBLICAL_PEOPLE_GROUPS.map((pg) => (
              <Pressable
                key={pg.id}
                onPress={() => router.push({ pathname: `/people-group/${pg.id}`, params: { mode: mapMode, era: selectedEra, overlay } } as any)}
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
                    { backgroundColor: "#22C55E" + "18" },
                  ]}
                >
                  <Ionicons name="people-outline" size={22} color="#22C55E" />
                </View>
                <View style={[styles.regionInfo, { flex: 1 }]}>
                  <Text
                    style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                  >
                    {pg.name}
                  </Text>
                  <Text
                    style={[styles.regionPlaces, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={1}
                  >
                    {pg.regionLabel}
                  </Text>
                  <Text
                    style={[styles.pgDescPreview, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={2}
                  >
                    {pg.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : overlay === "prophecy" ? (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {`${BIBLICAL_PROPHECY_LINKS.length} Prophecy Links`}
            </Text>
            {BIBLICAL_PROPHECY_LINKS.map((pl) => (
              <Pressable
                key={pl.id}
                onPress={() => router.push({ pathname: `/prophecy-link/${pl.id}`, params: { mode: mapMode, era: selectedEra, overlay, journey: selectedJourney } } as any)}
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
                    { backgroundColor: "#F59E0B" + "18" },
                  ]}
                >
                  <Ionicons name="flash-outline" size={22} color="#F59E0B" />
                </View>
                <View style={[styles.regionInfo, { flex: 1 }]}>
                  <Text
                    style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                  >
                    {pl.title}
                  </Text>
                  <Text
                    style={[styles.regionPlaces, { color: "#F59E0B", fontFamily: "Inter_500Medium" }]}
                    numberOfLines={1}
                  >
                    {pl.theme}
                  </Text>
                  <Text
                    style={[styles.pgDescPreview, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={2}
                  >
                    {pl.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : overlay === "journey-routes" ? (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {selectedJourney === "all"
                ? `${BIBLICAL_JOURNEY_ROUTES.length} Journey Routes`
                : BIBLICAL_JOURNEY_ROUTES.find((r) => r.id === selectedJourney)?.title || "Journey Route"}
            </Text>
            {(selectedJourney === "all"
              ? BIBLICAL_JOURNEY_ROUTES
              : BIBLICAL_JOURNEY_ROUTES.filter((r) => r.id === selectedJourney)
            ).map((jr) => (
              <Pressable
                key={jr.id}
                onPress={() => router.push({ pathname: `/journey-route/${jr.id}`, params: { mode: mapMode, era: selectedEra, overlay, journey: selectedJourney } } as any)}
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
          </View>
        ) : overlay === "kingdoms" ? (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {`${BIBLICAL_KINGDOM_OVERLAYS.length} Kingdoms & Empires`}
            </Text>
            {BIBLICAL_KINGDOM_OVERLAYS.map((k) => (
              <Pressable
                key={k.id}
                onPress={() => router.push({ pathname: `/kingdom-overlay/${k.id}`, params: { mode: mapMode, era: selectedEra, overlay, kingdom: k.id } } as any)}
                style={({ pressed }) => [
                  styles.regionCard,
                  {
                    backgroundColor: selectedKingdom === k.id ? k.color + "14" : theme.backgroundCard,
                    opacity: pressed ? 0.75 : 1,
                    borderWidth: selectedKingdom === k.id ? 1 : 0,
                    borderColor: selectedKingdom === k.id ? k.color + "40" : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.regionIcon,
                    { backgroundColor: k.color + "18" },
                  ]}
                >
                  <Ionicons name="shield-outline" size={22} color={k.color} />
                </View>
                <View style={[styles.regionInfo, { flex: 1 }]}>
                  <Text
                    style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                  >
                    {k.name}
                  </Text>
                  <Text
                    style={[styles.regionPlaces, { color: k.color, fontFamily: "Inter_500Medium" }]}
                    numberOfLines={1}
                  >
                    {k.eraLabel}
                  </Text>
                  <Text
                    style={[styles.pgDescPreview, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={2}
                  >
                    {k.shortDescription}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : overlay === "tribes" ? (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {`${BIBLICAL_TRIBE_OVERLAYS.length} Tribes of Israel`}
            </Text>
            {BIBLICAL_TRIBE_OVERLAYS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: `/tribe-overlay/${t.id}`, params: { mode: mapMode, era: selectedEra, overlay, tribe: t.id } } as any)}
                style={({ pressed }) => [
                  styles.regionCard,
                  {
                    backgroundColor: selectedTribe === t.id ? t.color + "14" : theme.backgroundCard,
                    opacity: pressed ? 0.75 : 1,
                    borderWidth: selectedTribe === t.id ? 1 : 0,
                    borderColor: selectedTribe === t.id ? t.color + "40" : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.regionIcon,
                    { backgroundColor: t.color + "18" },
                  ]}
                >
                  <Ionicons name="people-outline" size={22} color={t.color} />
                </View>
                <View style={[styles.regionInfo, { flex: 1 }]}>
                  <Text
                    style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}
                  >
                    {t.name}
                  </Text>
                  <Text
                    style={[styles.regionPlaces, { color: t.color, fontFamily: "Inter_500Medium" }]}
                    numberOfLines={1}
                  >
                    {t.regionLabel}
                  </Text>
                  <Text
                    style={[styles.pgDescPreview, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={2}
                  >
                    {t.shortDescription}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {filteredLocations.length > 0
                ? `${filteredLocations.length} Biblical Location${filteredLocations.length !== 1 ? "s" : ""}${selectedEra !== "All" ? ` \u00B7 ${selectedEra}` : ""}`
                : selectedEra !== "All" ? `No locations for ${selectedEra}` : "Loading..."}
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
  modeToggleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeBtnText: {
    fontSize: 13,
  },
  eraScrollRow: {
    maxHeight: 36,
    marginBottom: 6,
  },
  eraScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  eraChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  eraChipText: {
    fontSize: 12,
  },
  overlayScrollRow: {
    maxHeight: 36,
    marginBottom: 6,
  },
  overlayScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  overlayPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  overlayPillText: {
    fontSize: 12,
  },
  pgDescPreview: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  journeyScrollRow: {
    maxHeight: 36,
    marginBottom: 6,
  },
  journeyScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  journeyChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  journeyChipText: {
    fontSize: 12,
  },
  headerRow: {
    paddingHorizontal: 22,
    paddingBottom: 10,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
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
    fontSize: 14,
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
