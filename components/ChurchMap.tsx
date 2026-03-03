import React, { useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

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
  const mapRef = useRef<MapView>(null);

  const centerLat = userLat || (churches.length > 0 ? parseFloat(churches[0].lat) : 39.8283);
  const centerLng = userLng || (churches.length > 0 ? parseFloat(churches[0].lng) : -98.5795);

  const handlePress = useCallback((church: ChurchMarker) => {
    onMarkerPress?.(church);
    mapRef.current?.animateToRegion({
      latitude: parseFloat(church.lat),
      longitude: parseFloat(church.lng),
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    }, 500);
  }, [onMarkerPress]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: churches.length > 1 ? 20 : 2,
          longitudeDelta: churches.length > 1 ? 20 : 2,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {churches.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: parseFloat(c.lat), longitude: parseFloat(c.lng) }}
            title={c.name}
            pinColor={selectedChurchId === c.id ? "#C9933A" : "#E8456B"}
            onPress={() => handlePress(c)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: "hidden" },
  map: { flex: 1 },
});
