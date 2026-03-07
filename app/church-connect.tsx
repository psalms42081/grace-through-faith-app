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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import ChurchMap from "@/components/ChurchMap";
import EmptyState from "@/components/ui/EmptyState";

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
  const { theme, isDark } = useTheme();
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const { data: churches, isLoading } = useQuery<Church[]>({
    queryKey: [buildQueryKey()],
  });

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    if (Platform.OS === "web") {
      setLocationStatus("loading");
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLat(pos.coords.latitude);
            setUserLng(pos.coords.longitude);
            setLocationStatus("granted");
          },
          () => {
            setLocationStatus("denied");
          },
          { timeout: 10000 }
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

  const renderChurchCard = ({ item }: { item: Church }) => (
    <Pressable
      onPress={() => router.push(`/church/${item.id}` as any)}
      style={[s.card, { backgroundColor: theme.backgroundCard, borderColor: selectedChurchId === item.id ? theme.accent : theme.border }]}
    >
      <View style={s.cardHeader}>
        <View style={[s.cardIcon, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="business" size={20} color={theme.accent} />
        </View>
        <View style={s.cardInfo}>
          <Text style={[s.cardName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s.cardLocation, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.city}{item.state ? `, ${item.state}` : ""}, {item.country}
          </Text>
        </View>
        {item.distance != null ? (
          <View style={[s.distBadge, { backgroundColor: theme.accent + "15" }]}>
            <Text style={[s.distText, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {formatDistance(item.distance)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={s.cardDetails}>
        {item.serviceTimes ? (
          <View style={s.detailRow}>
            <Ionicons name="time-outline" size={14} color={theme.textMuted} />
            <Text style={[s.detailText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {item.serviceTimes}
            </Text>
          </View>
        ) : null}
        <View style={s.detailRow}>
          <Ionicons name="location-outline" size={14} color={theme.textMuted} />
          <Text style={[s.detailText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[s.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Church Connect
        </Text>
        <View style={s.viewToggle}>
          <Pressable
            onPress={() => setViewMode("list")}
            style={[s.toggleBtn, viewMode === "list" && { backgroundColor: theme.accent }]}
          >
            <Ionicons name="list" size={18} color={viewMode === "list" ? "#fff" : theme.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode("map")}
            style={[s.toggleBtn, viewMode === "map" && { backgroundColor: theme.accent }]}
          >
            <Ionicons name="map" size={18} color={viewMode === "map" ? "#fff" : theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={[s.searchRow, { backgroundColor: isDark ? "#1A1A2E" : "#F5F3EE", borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[s.searchInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Search by name, city, or country..."
          placeholderTextColor={theme.textMuted}
          value={searchCity}
          onChangeText={setSearchCity}
        />
        {searchCity ? (
          <Pressable onPress={() => setSearchCity("")}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {locationStatus === "granted" && !debouncedSearch ? (
        <View style={s.radiusRow}>
          <Text style={[s.radiusLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Radius:
          </Text>
          {RADIUS_OPTIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRadiusKm(r)}
              style={[
                s.radiusChip,
                {
                  backgroundColor: radiusKm === r ? theme.accent : (isDark ? "#1A1A2E" : "#F5F3EE"),
                  borderColor: radiusKm === r ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  s.radiusChipText,
                  {
                    color: radiusKm === r ? "#fff" : theme.textSecondary,
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
        <Pressable onPress={requestLocation} style={[s.locBanner, { backgroundColor: theme.accent + "12" }]}>
          <Ionicons name="navigate" size={16} color={theme.accent} />
          <Text style={[s.locBannerText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            Enable location to find nearby churches
          </Text>
        </Pressable>
      ) : locationStatus === "loading" ? (
        <View style={[s.locBanner, { backgroundColor: theme.accent + "12" }]}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[s.locBannerText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
            Getting your location...
          </Text>
        </View>
      ) : null}

      {viewMode === "map" ? (
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
                    style={[s.mapCard, { backgroundColor: theme.backgroundCard }]}
                  >
                    <Text style={[s.mapCardName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {sel.name}
                    </Text>
                    <Text style={[s.mapCardAddr, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      {sel.address}, {sel.city}
                    </Text>
                    {sel.distance != null ? (
                      <Text style={[s.mapCardDist, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                        {formatDistance(sel.distance)} away
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })()}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
          ) : churchList.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title="No churches found nearby"
              description="Try a different search or expand your radius"
              actionLabel="Search Adventist Directory"
              onAction={() => Linking.openURL("https://www.adventistdirectory.org")}
            />
          ) : (
            <FlatList
              data={churchList}
              keyExtractor={(item) => item.id}
              renderItem={renderChurchCard}
              contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
              ListFooterComponent={
                <Pressable
                  onPress={() => Linking.openURL("https://www.adventistdirectory.org")}
                  style={[s.directoryFooter, { borderColor: theme.border }]}
                >
                  <Ionicons name="globe-outline" size={16} color={theme.accent} />
                  <Text style={[s.directoryFooterText, { color: theme.accent, fontFamily: "Inter_500Medium" }]}>
                    Search full Adventist Directory
                  </Text>
                  <Ionicons name="open-outline" size={14} color={theme.accent} />
                </Pressable>
              }
            />
          )}
        </>
      )}
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
  locBannerText: { fontSize: 13 },
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
});
