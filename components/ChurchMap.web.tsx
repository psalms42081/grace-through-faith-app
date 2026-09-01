import React, { useMemo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
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
        zoom: churches.length > 5 ? 3 : 8,
      }),
    [churches, userLat, userLng, selectedChurchId],
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(typeof e.data === "string" ? e.data : "");
        if (data.type === "markerPress" && onMarkerPress) {
          const church = churches.find((c) => c.id === data.id);
          if (church) onMarkerPress(church);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [churches, onMarkerPress]);

  return (
    <View style={styles.container}>
      <iframe
        src={mapUrl}
        style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 }}
        title="Church Map"
        allowFullScreen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: "hidden", minHeight: 280 },
});
