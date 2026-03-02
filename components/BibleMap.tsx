import React, { useRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

const MARKER_COLORS: Record<string, string> = {
  city: "#C9933A",
  region: "#7C3AED",
  body_of_water: "#3B82F6",
  mountain: "#22C55E",
};

interface MapLocation {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  locationType: string | null;
}

interface BibleMapProps {
  locations: MapLocation[];
  selectedLocation: MapLocation | null;
  defaultLat: number;
  defaultLon: number;
  onMarkerPress?: (loc: MapLocation) => void;
}

export default function BibleMap({
  locations,
  selectedLocation,
  defaultLat,
  defaultLon,
  onMarkerPress,
}: BibleMapProps) {
  const mapRef = useRef<MapView>(null);

  const handleMarkerPress = useCallback(
    (loc: MapLocation) => {
      onMarkerPress?.(loc);
      mapRef.current?.animateToRegion(
        {
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        600
      );
    },
    [onMarkerPress]
  );

  return (
    <View style={mapStyles.container}>
      <MapView
        ref={mapRef}
        style={mapStyles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: defaultLat,
          longitude: defaultLon,
          latitudeDelta: 8,
          longitudeDelta: 8,
        }}
        mapType="terrain"
        showsCompass={false}
        showsScale
        toolbarEnabled={false}
      >
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{
              latitude: parseFloat(loc.latitude),
              longitude: parseFloat(loc.longitude),
            }}
            title={loc.name}
            pinColor={MARKER_COLORS[loc.locationType || "city"] || "#C9933A"}
            onPress={() => handleMarkerPress(loc)}
          />
        ))}
      </MapView>
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
  map: {
    width: "100%",
    height: "100%",
  },
});
