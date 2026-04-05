import React, { useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { getApiUrl } from "@/lib/query-client";

interface ChurchMarker {
  id: string;
  name: string;
  lat: string;
  lng: string;
}

interface ChurchMapProps {
  churches: ChurchMarker[];
  userLat?: number;
  userLng?: number;
  selectedChurchId?: string | null;
  onMarkerPress?: (church: ChurchMarker) => void;
}

export default function ChurchMap({ churches, userLat, userLng, selectedChurchId, onMarkerPress }: ChurchMapProps) {
  const centerLat = userLat || (churches.length > 0 ? parseFloat(churches[0].lat) : 39.8283);
  const centerLng = userLng || (churches.length > 0 ? parseFloat(churches[0].lng) : -98.5795);
  const zoom = churches.length > 1 ? 4 : 14;

  const markersData = useMemo(() => churches.map(c => ({
    id: c.id,
    name: c.name,
    lat: parseFloat(c.lat),
    lng: parseFloat(c.lng),
    selected: c.id === selectedChurchId,
  })), [churches, selectedChurchId]);

  const mapUrl = useMemo(() => {
    const base = getApiUrl();
    const params = new URLSearchParams();
    params.set("markers", JSON.stringify(markersData));
    params.set("centerLat", centerLat.toString());
    params.set("centerLng", centerLng.toString());
    params.set("zoom", zoom.toString());
    if (userLat != null) params.set("userLat", userLat.toString());
    if (userLng != null) params.set("userLng", userLng.toString());
    return `${base}/api/map-embed?${params.toString()}`;
  }, [markersData, centerLat, centerLng, zoom, userLat, userLng]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "markerPress" && onMarkerPress) {
          const church = churches.find(c => c.id === data.id);
          if (church) onMarkerPress(church);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [churches, onMarkerPress]);

  const handleNativeMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || "");
      if (data.type === "markerPress" && onMarkerPress) {
        const church = churches.find(c => c.id === data.id);
        if (church) onMarkerPress(church);
      }
    } catch {}
  }, [churches, onMarkerPress]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <iframe
          src={mapUrl}
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 }}
          allow="geolocation"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: mapUrl }}
        style={styles.map}
        onMessage={handleNativeMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: "hidden" },
  map: { flex: 1 },
});
