import React from "react";
import { View, StyleSheet } from "react-native";

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

export default function ChurchMap({ churches, userLat, userLng, selectedChurchId }: ChurchMapProps) {
  const centerLat = userLat || (churches.length > 0 ? parseFloat(churches[0].lat) : 39.8283);
  const centerLng = userLng || (churches.length > 0 ? parseFloat(churches[0].lng) : -98.5795);
  const zoom = churches.length > 5 ? 3 : 8;
  const spread = churches.length > 5 ? 40 : 5;

  const bbox = `${centerLng - spread},${centerLat - spread * 0.6},${centerLng + spread},${centerLat + spread * 0.6}`;

  const markerStr = churches
    .map((c) => `${c.lat},${c.lng},${encodeURIComponent(c.name)}`)
    .join("|");

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <View style={styles.container}>
      <iframe
        src={src}
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
