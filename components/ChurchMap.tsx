import React, { useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { buildChurchMapEmbedUrl, type ChurchMapMarker } from "@/lib/church-map-url";

interface ChurchMapProps {
  churches: ChurchMapMarker[];
  userLat?: number;
  userLng?: number;
  selectedChurchId?: string | null;
  onMarkerPress?: (church: ChurchMapMarker) => void;
}

export default function ChurchMap({ churches, userLat, userLng, selectedChurchId, onMarkerPress }: ChurchMapProps) {
  const mapUrl = useMemo(
    () =>
      buildChurchMapEmbedUrl({
        churches,
        userLat,
        userLng,
        selectedChurchId,
      }),
    [churches, userLat, userLng, selectedChurchId],
  );

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
