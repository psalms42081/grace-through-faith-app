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
  Alert,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { HV2 } from "@/components/home-v2/theme";
import ChurchMap from "@/components/ChurchMap";
import EmptyState from "@/components/ui/EmptyState";
import { apiRequest } from "@/lib/query-client";

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

let locationModule: any = null;
if (Platform.OS !== "web") {
  try {
    locationModule = require("expo-location");
  } catch {}
}

export default function ChurchConnectScreen() {
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const RADIUS_OPTIONS = [25, 50, 100, 500] as const;

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchCity, setSearchCity] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [showTellUs, setShowTellUs] = useState(false);
  const [tellName, setTellName] = useState("");
  const [tellCity, setTellCity] = useState("");
  const [tellCountry, setTellCountry] = useState("");
  const [tellAddress, setTellAddress] = useState("");
  const [tellSubmitting, setTellSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchCity.trim());
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchCity]);

  const buildQueryKey = useCallback(() => {
    const params = new URLSearchParams();
    if (userLat != null && userLng != null) {
      params.set("lat", userLat.toString());
      params.set("lng", userLng.toString());
      params.set("radius", radiusKm.toString());
    }
    if (debouncedSearch) {
      params.set("city", debouncedSearch);
    }
    const qs = params.toString();
    return `/api/churches${qs ? `?${qs}` : ""}`;
  }, [userLat, userLng, debouncedSearch, radiusKm]);

  const canQuery = (userLat != null && userLng != null) || !!debouncedSearch;

  const { data: churches, isLoading } = useQuery<Church[]>({
    queryKey: [buildQueryKey()],
    enabled: canQuery,
  });

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    if (Platform.OS === "web") {
      setLocationStatus("loading");
      try {
        if (!navigator.geolocation) {
          Alert.alert("Location Unavailable", "Your browser does not support location services. Try searching by city name instead.");
          setLocationStatus("denied");
          return;
        }
        const timeoutId = setTimeout(() => {
          setLocationStatus("denied");
          Alert.alert("Location Timed Out", "Could not get your location. Make sure location is enabled in your browser settings, then try again. You can also search by city name.");
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
              Alert.alert("Location Denied", "You've blocked location access for this site. To enable it:\n\n• iPhone Safari: Settings → Safari → Location → Allow\n• Chrome: Tap the lock icon next to the URL → Location → Allow\n\nOr search by city name instead.");
            } else {
              Alert.alert("Location Error", "Could not determine your location. Try searching by city name instead.");
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
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${Math.round(km)} km`;
  };

  const getSizeIcon = (size?: string | null) => {
    switch (size) {
      case "large": return "people" as const;
      case "medium": return "people-outline" as const;
      default: return "person-outline" as const;
    }
  };

  const churchList = churches || [];
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
      Alert.alert("Missing details", "Please enter the church name, city, and country.");
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
      Alert.alert("Thank you", "We'll review this and add it if we can verify it. It will not appear in the directory until then.");
    } catch {
      Alert.alert("Could not send", "Please try again in a moment.");
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
        title={debouncedSearch ? "No churches found" : "No churches found nearby"}
        description={debouncedSearch ? "Try a different city, suburb, or church name" : "Try a different search or expand your radius"}
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
        <Text style={[s.title, { color: C.ink, fontFamily: "Lora_700Bold" }]}>
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
          placeholder="Search by city, suburb, or church name..."
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

      {locationStatus === "granted" && !debouncedSearch ? (
        <View style={s.radiusRow}>
          <Text style={[s.radiusLabel, { color: C.inkMuted, fontFamily: "Inter_500Medium" }]}>
            Radius:
          </Text>
          {RADIUS_OPTIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRadiusKm(r)}
              style={[
                s.radiusChip,
                {
                  backgroundColor: radiusKm === r ? C.coral : C.pill,
                  borderColor: radiusKm === r ? C.coral : C.border,
                },
              ]}
            >
              <Text
                style={[
                  s.radiusChipText,
                  {
                    color: radiusKm === r ? "#fff" : C.inkMuted,
                    fontFamily: radiusKm === r ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {r} km
              </Text>
            </Pressable>
          ))}
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
            userLat={userLat ?? undefined}
            userLng={userLng ?? undefined}
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
