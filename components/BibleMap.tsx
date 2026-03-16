import React, { useRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, Circle, PROVIDER_DEFAULT } from "react-native-maps";
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

export interface RouteLineData {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  highlight?: boolean;
}

export interface KingdomMarkerData {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  color: string;
  selected?: boolean;
}

export interface TribeMarkerData {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  color: string;
  selected?: boolean;
}

interface BibleMapProps {
  locations: MapLocation[];
  selectedLocation: MapLocation | null;
  defaultLat: number;
  defaultLon: number;
  onMarkerPress?: (loc: MapLocation) => void;
  routeLines?: RouteLineData[];
  kingdomMarkers?: KingdomMarkerData[];
  onKingdomPress?: (id: string) => void;
  tribeMarkers?: TribeMarkerData[];
  onTribePress?: (id: string) => void;
}

export default function BibleMap({
  locations,
  selectedLocation,
  defaultLat,
  defaultLon,
  onMarkerPress,
  routeLines,
  kingdomMarkers,
  onKingdomPress,
  tribeMarkers,
  onTribePress,
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
        {routeLines && routeLines.map((route) => (
          <Polyline
            key={route.id}
            coordinates={route.coordinates}
            strokeColor={route.color}
            strokeWidth={route.highlight ? 4 : 2.5}
            lineDashPattern={route.highlight ? undefined : [8, 4]}
            geodesic
          />
        ))}
        {kingdomMarkers && kingdomMarkers.map((km) => (
          <React.Fragment key={`kingdom-${km.id}`}>
            <Circle
              center={{ latitude: km.latitude, longitude: km.longitude }}
              radius={km.selected ? 180000 : 120000}
              strokeColor={km.color + "60"}
              fillColor={km.color + (km.selected ? "20" : "10")}
              strokeWidth={km.selected ? 2 : 1}
            />
            <Marker
              coordinate={{ latitude: km.latitude, longitude: km.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              opacity={km.selected ? 1 : 0.7}
              onPress={() => onKingdomPress?.(km.id)}
            >
              <View style={mapStyles.kingdomLabel}>
                <Text style={[mapStyles.kingdomLabelText, { color: km.color }]}>
                  {km.label}
                </Text>
              </View>
            </Marker>
          </React.Fragment>
        ))}
        {tribeMarkers && tribeMarkers.map((tm) => (
          <React.Fragment key={`tribe-${tm.id}`}>
            <Circle
              center={{ latitude: tm.latitude, longitude: tm.longitude }}
              radius={tm.selected ? 28000 : 20000}
              strokeColor={tm.color + "50"}
              fillColor={tm.color + (tm.selected ? "25" : "0D")}
              strokeWidth={tm.selected ? 2 : 1}
            />
            <Marker
              coordinate={{ latitude: tm.latitude, longitude: tm.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              opacity={tm.selected ? 1 : 0.7}
              onPress={() => onTribePress?.(tm.id)}
            >
              <View style={mapStyles.kingdomLabel}>
                <Text style={[mapStyles.kingdomLabelText, { color: tm.color, fontSize: 9, letterSpacing: 1 }]}>
                  {tm.label}
                </Text>
              </View>
            </Marker>
          </React.Fragment>
        ))}
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
  kingdomLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
  },
  kingdomLabelText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
});
