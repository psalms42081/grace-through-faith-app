import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import ChurchMap from "@/components/ChurchMap";
import EmptyState from "@/components/ui/EmptyState";
import { apiRequest } from "@/lib/query-client";
import {
  churchCoverageLine,
  churchRadiusOptions,
  churchRadiusToKm,
  defaultChurchDistanceUnit,
  formatChurchDistance,
  matchingChurchRadius,
  type ChurchDistanceUnit,
} from "@/lib/church-finder";
import { useToast } from "@/contexts/ToastContext";
import { confirmWebSafe } from "@/components/WebSafeConfirm";

const C = {
  surface: PathB.surface,
  card: PathB.surfaceCard,
  ink: PathB.ink,
  inkMuted: HV2.inkMutedText,
  coral: PathB.coral,
  pill: "#F1EBDD",
  border: "#E7E0D2",
};

interface Church {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  lat: string;
  lng: string;
  serviceTimes: string | null;
  contactPhone: string | null;
  website: string | null;
  pastorName: string | null;
  membershipSize: string | null;
  distance?: number;
}

type ViewMode = "list" | "map";

type ChurchSearchPayload = {
  churches: Church[];
  resolvedPlace: string | null;
  resolvedCountry: string | null;
  outsideCoverage: boolean;
  origin: { lat: number; lng: number } | null;
};

const DISTANCE_UNIT_KEY = "@grace-through-faith/church-distance-unit";

function unpackChurchSearch(data: Church[] | ChurchSearchPayload | undefined): ChurchSearchPayload {
  if (!data) {
    return { churches: [], resolvedPlace: null, resolvedCountry: null, outsideCoverage: false, origin: null };
  }
  if (Array.isArray(data)) {
    return { churches: data, resolvedPlace: null, resolvedCountry: null, outsideCoverage: false, origin: null };
  }
  return {
    churches: data.churches ?? [],
    resolvedPlace: data.resolvedPlace ?? null,
    resolvedCountry: data.resolvedCountry ?? null,
    outsideCoverage: data.outsideCoverage === true,
    origin: data.origin ?? null,
  };
}

let locationModule: any = null;
if (Platform.OS !== "web") {
  try {
    locationModule = require("expo-location");
  } catch {}
}

export default function ChurchConnectScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchCity, setSearchCity] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [unitOverride, setUnitOverride] = useState<ChurchDistanceUnit | null>(null);
  const [unitReady, setUnitReady] = useState(false);
  const [showTellUs, setShowTellUs] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [tellName, setTellName] = useState("");
  const [tellCity, setTellCity] = useState("");
  const [tellCountry, setTellCountry] = useState("");
  const [tellAddress, setTellAddress] = useState("");
  const [tellSubmitting, setTellSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const radiusAligned = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(DISTANCE_UNIT_KEY)
      .then((value) => {
        if (cancelled) return;
        if (value === "mi" || value === "km") setUnitOverride(value);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUnitReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseUnit = (next: ChurchDistanceUnit) => {
    setRadiusKm((current) => churchRadiusToKm(matchingChurchRadius(current, next), next));
    setUnitOverride(next);
    AsyncStorage.setItem(DISTANCE_UNIT_KEY, next).catch(() => {});
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchCity.trim());
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchCity]);

  const buildQueryKey = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) {
      params.set("place", debouncedSearch);
      params.set("radius", radiusKm.toString());
    } else if (userLat != null && userLng != null) {
      params.set("lat", userLat.toString());
      params.set("lng", userLng.toString());
      params.set("radius", radiusKm.toString());
    }
    const qs = params.toString();
    return `/api/churches${qs ? `?${qs}` : ""}`;
  }, [userLat, userLng, debouncedSearch, radiusKm]);

  const canQuery = (userLat != null && userLng != null) || !!debouncedSearch;

  const { data: churchPayloadRaw, isLoading } = useQuery<Church[] | ChurchSearchPayload>({
    queryKey: [buildQueryKey()],
    enabled: canQuery,
  });
  const churchPayload = unpackChurchSearch(churchPayloadRaw);
  const { data: coverage } = useQuery<{
    verifiedCount: number;
    countryCount: number;
    countries: string[];
  }>({
    queryKey: ["/api/churches/coverage?v=counts"],
  });
  const coverageLine =
    typeof coverage?.verifiedCount === "number" && typeof coverage?.countryCount === "number"
      ? churchCoverageLine(coverage.verifiedCount, coverage.countryCount)
      : null;
  const localeTag = (() => {
    try {
      return getLocales()[0]?.languageTag ?? null;
    } catch {
      return null;
    }
  })();
  const distanceUnit = defaultChurchDistanceUnit({
    locale: localeTag,
    resolvedCountry: churchPayload.resolvedCountry,
    override: unitOverride,
  });

  useEffect(() => {
    if (!unitReady || radiusAligned.current) return;
    radiusAligned.current = true;
    setRadiusKm(churchRadiusToKm(50, distanceUnit));
  }, [unitReady, distanceUnit]);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    if (Platform.OS === "web") {
      setLocationStatus("loading");
      try {
        if (!navigator.geolocation) {
          showToast("Your browser does not support location services. Try searching by city name instead.", "info");
          setLocationStatus("denied");
          return;
        }
        const timeoutId = setTimeout(() => {
          setLocationStatus("denied");
          showToast("Could not get your location. Search by city name, or enable location and try again.", "info");
        }, 8000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            setUserLat(pos.coords.latitude);
            setUserLng(pos.coords.longitude);
            setLocationStatus("granted");
          },
          (err) => {
            clearTimeout(timeoutId);
            setLocationStatus("denied");
            if (err.code === 1) {
              void confirmWebSafe({
                title: "Location Denied",
                message:
                  "You've blocked location access for this site. To enable it:\n\n• iPhone Safari: Settings → Safari → Location → Allow\n• Chrome: Tap the lock icon next to the URL → Location → Allow\n\nOr search by city name instead.",
                confirmLabel: "OK",
                cancelLabel: null,
              });
            } else {
              showToast("Could not determine your location. Try searching by city name instead.", "error");
            }
          },
          { timeout: 7000, enableHighAccuracy: false, maximumAge: 300000 }
        );
      } catch {
        setLocationStatus("denied");
      }
      return;
    }

    if (!locationModule) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus("loading");
    try {
      const { status } = await locationModule.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const loc = await locationModule.getCurrentPositionAsync({ accuracy: locationModule.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      setLocationStatus("granted");
    } catch {
      setLocationStatus("denied");
    }
  };

  const formatDistance = (km?: number) => {
    if (km == null) return null;
    const label = formatChurchDistance(km, distanceUnit);
    return label || null;
  };

  const getSizeIcon = (size?: string | null) => {
    switch (size) {
      case "large": return "people" as const;
      case "medium": return "people-outline" as const;
      default: return "person-outline" as const;
    }
  };

  const churchList = churchPayload.churches;
  const resolvedPlace = churchPayload.resolvedPlace;
  const outsideCoverage = churchPayload.outsideCoverage;
  const origin = churchPayload.origin;
  const needsCitySearch = !canQuery && locationStatus === "denied";
  const waitingForLocation = !canQuery && locationStatus !== "denied";

  const focusCitySearch = () => {
    searchInputRef.current?.focus();
  };

  const openTellUs = () => {
    setTellCity(searchCity.trim());
    setShowTellUs(true);
  };

  const submitTellUs = async () => {
    if (!tellName.trim() || !tellCity.trim() || !tellCountry.trim()) {
      showToast("Please enter the church name, city, and country.", "error");
      return;
    }
    setTellSubmitting(true);
    try {
      await apiRequest("POST", "/api/churches/submissions", {
        name: tellName.trim(),
        city: tellCity.trim(),
        country: tellCountry.trim(),
        address: tellAddress.trim() || undefined,
      });
      setShowTellUs(false);
      setTellName("");
      setTellCountry("");
      setTellAddress("");
      showToast("We'll review this and add it if we can verify it.", "success");
    } catch {
      showToast("Could not send. Please try again in a moment.", "error");
    } finally {
      setTellSubmitting(false);
    }
  };

  const directoryLink = (
    <Pressable
      onPress={() => Linking.openURL("https://www.adventistdirectory.org")}
      style={[s.directoryFooter, { borderColor: C.border }]}
    >
      <Ionicons name="globe-outline" size={16} color={C.inkMuted} />
      <Text style={[s.directoryFooterText, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
        Search full Adventist Directory
      </Text>
      <Ionicons name="open-outline" size={14} color={C.inkMuted} />
    </Pressable>
  );

  const tellUsEndState = (
    <View style={s.tellUsWrap}>
      <Pressable
        onPress={openTellUs}
        style={[s.tellUsBtn, { borderColor: C.border }]}
        testID="church-connect-tell-us"
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.inkMuted} />
        <Text style={[s.tellUsBtnText, { color: C.ink, fontFamily: "Inter_500Medium" }]}>
          Can't find your church? Tell us
        </Text>
      </Pressable>
      {directoryLink}
    </View>
  );

  const noResultsEmpty = (
    <View style={s.cityPromptWrap} testID="church-connect-no-results">
      <EmptyState
        appearance="light"
        icon="business-outline"
        title={
          outsideCoverage && resolvedPlace
            ? `No listed churches near ${resolvedPlace} yet`
            : debouncedSearch
              ? "No churches found"
              : "No churches found nearby"
        }
        description={
          outsideCoverage
            ? "Try a different city, or tell us about a church there."
            : debouncedSearch
              ? "Try a different city, suburb, or church name"
              : "Try a different search or expand your radius"
        }
        actionLabel="Can't find your church? Tell us"
        onAction={openTellUs}
        testID="church-connect-tell-us-empty"
      />
      {directoryLink}
    </View>
  );

  const citySearchPrompt = (
    <View style={s.cityPromptWrap} testID="church-connect-city-prompt">
      <EmptyState
        appearance="light"
        icon="search-outline"
        title="Search by city or suburb"
        description="Location isn't available, so we can't list nearby churches. Type a city or suburb above — we don't invent results."
        actionLabel="Type a city or suburb"
        onAction={focusCitySearch}
      />
    </View>
  );

  const renderChurchCard = ({ item }: { item: Church }) => (
    <Pressable
      onPress={() => router.push(`/church/${item.id}` as any)}
      style={[s.card, { backgroundColor: C.card, borderColor: selectedChurchId === item.id ? C.coral : C.border }]}
    >
      <View style={s.cardHeader}>
        <View style={[s.cardIcon, { backgroundColor: C.pill }]}>
          <Ionicons name="business" size={20} color={C.ink} />
        </View>
        <View style={s.cardInfo}>
          <Text style={[s.cardName, { color: C.ink, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s.cardLocation, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.city}{item.state ? `, ${item.state}` : ""}, {item.country}
          </Text>
        </View>
        {item.distance != null ? (
          <View style={[s.distBadge, { backgroundColor: C.pill }]}>
            <Text style={[s.distText, { color: C.inkMuted, fontFamily: "Inter_600SemiBold" }]}>
              {formatDistance(item.distance)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={s.cardDetails}>
        {item.serviceTimes ? (
          <View style={s.detailRow}>
            <Ionicons name="time-outline" size={14} color={C.inkMuted} />
            <Text style={[s.detailText, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {item.serviceTimes}
            </Text>
          </View>
        ) : null}
        <View style={s.detailRow}>
          <Ionicons name="location-outline" size={14} color={C.inkMuted} />
          <Text style={[s.detailText, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[s.container, { backgroundColor: C.surface }]}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={[s.title, { color: C.ink, fontFamily: "Lora_700Bold" }]} numberOfLines={1}>
          Church Connect
        </Text>
        <View style={s.viewToggle}>
          <Pressable
            onPress={() => setViewMode("list")}
            style={[s.toggleBtn, viewMode === "list" && { backgroundColor: C.coral }]}
            testID="church-connect-list-toggle"
          >
            <Ionicons name="list" size={18} color={viewMode === "list" ? "#fff" : C.inkMuted} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode("map")}
            style={[s.toggleBtn, viewMode === "map" && { backgroundColor: C.coral }]}
            testID="church-connect-map-toggle"
          >
            <Ionicons name="map" size={18} color={viewMode === "map" ? "#fff" : C.inkMuted} />
          </Pressable>
        </View>
      </View>

      <View style={[s.searchRow, { backgroundColor: C.pill, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.inkMuted} />
        <TextInput
          ref={searchInputRef}
          style={[s.searchInput, { color: C.ink, fontFamily: "Inter_400Regular" }]}
          placeholder="Search by city, suburb, ZIP, or church name..."
          placeholderTextColor={C.inkMuted}
          value={searchCity}
          onChangeText={setSearchCity}
          testID="church-connect-city-search"
        />
        {searchCity ? (
          <Pressable onPress={() => setSearchCity("")}>
            <Ionicons name="close-circle" size={18} color={C.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      {coverageLine ? (
        <View style={s.coverageRow}>
          <Text
            style={[s.coverage, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}
            testID="church-connect-coverage"
          >
            {coverageLine}
          </Text>
          <Pressable onPress={() => setShowCountries(true)} hitSlop={8} testID="church-connect-see-countries">
            <Text style={[s.seeCountries, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
              See countries
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={s.unitRow}>
        <Text style={[s.radiusLabel, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>Distance</Text>
        <View style={[s.unitToggle, { borderColor: C.border }]} testID="church-connect-unit-toggle">
          <Pressable
            onPress={() => chooseUnit("km")}
            style={[s.unitBtn, distanceUnit === "km" && { backgroundColor: C.coral }]}
            testID="church-connect-unit-km"
            accessibilityRole="button"
            accessibilityLabel="Kilometres"
            accessibilityState={{ selected: distanceUnit === "km" }}
          >
            <Text style={[s.unitText, { color: distanceUnit === "km" ? "#fff" : C.ink, fontFamily: "Inter_600SemiBold" }]}>
              km
            </Text>
          </Pressable>
          <Pressable
            onPress={() => chooseUnit("mi")}
            style={[s.unitBtn, distanceUnit === "mi" && { backgroundColor: C.coral }]}
            testID="church-connect-unit-mi"
            accessibilityRole="button"
            accessibilityLabel="Miles"
            accessibilityState={{ selected: distanceUnit === "mi" }}
          >
            <Text style={[s.unitText, { color: distanceUnit === "mi" ? "#fff" : C.ink, fontFamily: "Inter_600SemiBold" }]}>
              Miles
            </Text>
          </Pressable>
        </View>
      </View>

      {(locationStatus === "granted" && !debouncedSearch) || (debouncedSearch && resolvedPlace && !outsideCoverage) ? (
        <View style={s.radiusRow}>
          <Text style={[s.radiusLabel, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
            Radius:
          </Text>
          {churchRadiusOptions(distanceUnit).map((option) => {
            const selected = matchingChurchRadius(radiusKm, distanceUnit) === option;
            return (
              <Pressable
                key={`${distanceUnit}-${option}`}
                onPress={() => setRadiusKm(churchRadiusToKm(option, distanceUnit))}
                style={[
                  s.radiusChip,
                  {
                    backgroundColor: selected ? C.coral : C.pill,
                    borderColor: selected ? C.coral : C.border,
                  },
                ]}
                testID={`church-connect-radius-${option}`}
              >
                <Text
                  style={[
                    s.radiusChipText,
                    {
                      color: selected ? "#fff" : C.inkMuted,
                      fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {distanceUnit === "mi" ? `${option} mi` : `${option} km`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {locationStatus === "denied" ? (
        <Pressable onPress={requestLocation} style={[s.locBanner, { backgroundColor: C.pill }]}>
          <Ionicons name="navigate" size={16} color={C.inkMuted} />
          <Text style={[s.locBannerText, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
            Location isn't available. Search by city or suburb, or tap to retry location.
          </Text>
        </Pressable>
      ) : locationStatus === "loading" ? (
        <View style={[s.locBanner, { backgroundColor: C.pill }]}>
          <ActivityIndicator size="small" color={C.inkMuted} />
          <Text style={[s.locBannerText, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
            Getting your location...
          </Text>
        </View>
      ) : null}

      {viewMode === "map" ? (
        waitingForLocation ? (
          <ActivityIndicator size="large" color={C.inkMuted} style={{ marginTop: 40 }} />
        ) : needsCitySearch ? (
          citySearchPrompt
        ) : isLoading ? (
          <ActivityIndicator size="large" color={C.inkMuted} style={{ marginTop: 40 }} />
        ) : churchList.length === 0 ? (
          noResultsEmpty
        ) : (
        <View style={s.mapContainer}>
          <ChurchMap
            churches={churchList}
            userLat={(debouncedSearch ? origin?.lat : userLat) ?? undefined}
            userLng={(debouncedSearch ? origin?.lng : userLng) ?? undefined}
            selectedChurchId={selectedChurchId}
            onMarkerPress={(c) => setSelectedChurchId(c.id)}
          />
          {selectedChurchId ? (
            <View style={s.mapCardOverlay}>
              {(() => {
                const sel = churchList.find(c => c.id === selectedChurchId);
                if (!sel) return null;
                return (
                  <Pressable
                    onPress={() => router.push(`/church/${sel.id}` as any)}
                    style={[s.mapCard, { backgroundColor: C.card }]}
                  >
                    <Text style={[s.mapCardName, { color: C.ink, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {sel.name}
                    </Text>
                    <Text style={[s.mapCardAddr, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      {sel.address}, {sel.city}
                    </Text>
                    {sel.distance != null ? (
                      <Text style={[s.mapCardDist, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
                        {formatDistance(sel.distance)} away
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`);
                      }}
                      style={[s.directionsBtn, { backgroundColor: C.coral }]}
                    >
                      <Ionicons name="navigate-outline" size={15} color="#fff" />
                      <Text style={[s.directionsBtnText, { fontFamily: "Inter_600SemiBold" }]}>Get Directions</Text>
                    </Pressable>
                  </Pressable>
                );
              })()}
            </View>
          ) : null}
        </View>
        )
      ) : (
        <>
          {waitingForLocation ? (
            <ActivityIndicator size="large" color={C.inkMuted} style={{ marginTop: 40 }} />
          ) : needsCitySearch ? (
            citySearchPrompt
          ) : isLoading ? (
            <ActivityIndicator size="large" color={C.inkMuted} style={{ marginTop: 40 }} />
          ) : churchList.length === 0 ? (
            noResultsEmpty
          ) : (
            <FlatList
              data={churchList}
              keyExtractor={(item) => item.id}
              renderItem={renderChurchCard}
              contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
              ListFooterComponent={tellUsEndState}
            />
          )}
        </>
      )}

      <Modal visible={showCountries} transparent animationType="fade" onRequestClose={() => setShowCountries(false)}>
        <View style={s.countrySheetRoot}>
        <Pressable style={s.modalBackdrop} onPress={() => setShowCountries(false)} />
        <View style={[s.countrySheet, { backgroundColor: C.card }]} testID="church-connect-countries-sheet">
          <View style={s.countrySheetHead}>
            <Text style={[s.modalTitle, { color: C.ink, fontFamily: "Lora_700Bold" }]}>Countries</Text>
            <Pressable onPress={() => setShowCountries(false)} hitSlop={8} accessibilityLabel="Close countries">
              <Ionicons name="close" size={20} color={C.inkMuted} />
            </Pressable>
          </View>
          <ScrollView style={s.countryList} keyboardShouldPersistTaps="handled">
            {(coverage?.countries ?? []).map((name) => (
              <Text
                key={name}
                style={[s.countryName, { color: C.ink, fontFamily: "Inter_400Regular", borderColor: C.border }]}
              >
                {name}
              </Text>
            ))}
          </ScrollView>
        </View>
        </View>
      </Modal>

      <Modal visible={showTellUs} transparent animationType="fade" onRequestClose={() => setShowTellUs(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}
        >
          <Pressable style={s.modalBackdrop} onPress={() => !tellSubmitting && setShowTellUs(false)} />
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={[s.modalCard, { backgroundColor: C.card }]}>
              <Text style={[s.modalTitle, { color: C.ink, fontFamily: "Lora_700Bold" }]}>
                Can't find your church? Tell us
              </Text>
              <Text style={[s.modalHint, { color: C.inkMuted, fontFamily: "Inter_400Regular" }]}>
                We'll review what you send. It will not appear in the directory until it is verified.
              </Text>
              <TextInput
                style={[s.modalInput, { backgroundColor: C.pill, color: C.ink, borderColor: C.border }]}
                placeholder="Church name"
                placeholderTextColor={C.inkMuted}
                value={tellName}
                onChangeText={setTellName}
                testID="church-connect-tell-name"
              />
              <TextInput
                style={[s.modalInput, { backgroundColor: C.pill, color: C.ink, borderColor: C.border }]}
                placeholder="City"
                placeholderTextColor={C.inkMuted}
                value={tellCity}
                onChangeText={setTellCity}
                testID="church-connect-tell-city"
              />
              <TextInput
                style={[s.modalInput, { backgroundColor: C.pill, color: C.ink, borderColor: C.border }]}
                placeholder="Country"
                placeholderTextColor={C.inkMuted}
                value={tellCountry}
                onChangeText={setTellCountry}
                testID="church-connect-tell-country"
              />
              <TextInput
                style={[s.modalInput, { backgroundColor: C.pill, color: C.ink, borderColor: C.border }]}
                placeholder="Address (optional)"
                placeholderTextColor={C.inkMuted}
                value={tellAddress}
                onChangeText={setTellAddress}
                testID="church-connect-tell-address"
              />
              <View style={s.modalActions}>
                <Pressable
                  onPress={() => setShowTellUs(false)}
                  disabled={tellSubmitting}
                  style={[s.modalActionBtn, { borderColor: C.border }]}
                >
                  <Text style={[s.modalActionText, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={submitTellUs}
                  disabled={tellSubmitting}
                  style={[s.modalActionBtn, { backgroundColor: C.coral, borderColor: C.coral }]}
                  testID="church-connect-tell-submit"
                >
                  {tellSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[s.modalActionText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                      Send
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, flex: 1 },
  viewToggle: { flexDirection: "row", borderRadius: 10, overflow: "hidden" },
  toggleBtn: { padding: 8, borderRadius: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  coverageRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  coverage: { fontSize: 12, lineHeight: 18 },
  seeCountries: { fontSize: 12, textDecorationLine: "underline" },
  countrySheetRoot: { flex: 1, justifyContent: "flex-end" },
  countrySheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    maxHeight: "55%",
    borderRadius: 16,
    padding: 16,
  },
  countrySheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  countryList: { maxHeight: 360 },
  countryName: { fontSize: 15, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  unitToggle: { flexDirection: "row", borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  unitText: { fontSize: 13 },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 10,
  },
  locBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  locBannerText: { fontSize: 13, flex: 1 },
  cityPromptWrap: { flex: 1, paddingHorizontal: 8, paddingTop: 24 },
  mapContainer: { flex: 1, marginTop: 10, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: "hidden" },
  mapCardOverlay: { position: "absolute", bottom: 12, left: 12, right: 12 },
  mapCard: { borderRadius: 14, padding: 14, gap: 2 },
  mapCardName: { fontSize: 15 },
  mapCardAddr: { fontSize: 12 },
  mapCardDist: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15 },
  cardLocation: { fontSize: 12, marginTop: 2 },
  distBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  distText: { fontSize: 11 },
  cardDetails: { marginTop: 10, gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 12, flex: 1 },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  radiusLabel: { fontSize: 13, marginRight: 2 },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  radiusChipText: { fontSize: 12 },
  directoryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 6,
    marginBottom: 8,
    borderTopWidth: 1,
  },
  directoryFooterText: { fontSize: 13 },
  tellUsWrap: { marginTop: 6 },
  tellUsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 4,
  },
  tellUsBtnText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "center" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalScroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 16, padding: 20, gap: 10 },
  modalTitle: { fontSize: 20 },
  modalHint: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  modalActionText: { fontSize: 14 },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 10,
  },
  directionsBtnText: { color: "#fff", fontSize: 13 },
});
