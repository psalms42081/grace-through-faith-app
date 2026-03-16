import React from "react";
import { View, StyleSheet } from "react-native";

interface MapLocation {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  locationType: string | null;
}

export interface RouteLineData {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  highlight?: boolean;
}

interface BibleMapProps {
  locations: MapLocation[];
  selectedLocation: MapLocation | null;
  defaultLat: number;
  defaultLon: number;
  onMarkerPress?: (loc: MapLocation) => void;
  routeLines?: RouteLineData[];
}

export default function BibleMap({
  locations,
  selectedLocation,
  defaultLat,
  defaultLon,
}: BibleMapProps) {
  const lat = selectedLocation ? parseFloat(selectedLocation.latitude) : defaultLat;
  const lon = selectedLocation ? parseFloat(selectedLocation.longitude) : defaultLon;
  const spread = selectedLocation ? 1 : 15;

  const bbox = `${lon - spread},${lat - (spread * 0.6)},${lon + spread},${lat + (spread * 0.6)}`;
  const markerParam = selectedLocation ? `&marker=${lat},${lon}` : "";

  return (
    <View style={mapStyles.container}>
      <iframe
        key={`${lat}-${lon}-${spread}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParam}`}
        style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 } as any}
        title="Bible Map"
      />
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
});
