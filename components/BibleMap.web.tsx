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
  fitCoordinates?: { latitude: number; longitude: number }[];
  isJourneySelected?: boolean;
  quietMarkers?: boolean;
}

export default function BibleMap({
  locations,
  selectedLocation,
  defaultLat,
  defaultLon,
  fitCoordinates,
}: BibleMapProps) {
  let lat = defaultLat;
  let lon = defaultLon;
  let spread = 15;

  if (fitCoordinates && fitCoordinates.length > 0) {
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const c of fitCoordinates) {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLon) minLon = c.longitude;
      if (c.longitude > maxLon) maxLon = c.longitude;
    }
    lat = (minLat + maxLat) / 2;
    lon = (minLon + maxLon) / 2;
    const latSpan = maxLat - minLat;
    const lonSpan = maxLon - minLon;
    spread = Math.max(latSpan, lonSpan * 0.6, 2) * 0.65 + 1.5;
  } else if (selectedLocation) {
    lat = parseFloat(selectedLocation.latitude);
    lon = parseFloat(selectedLocation.longitude);
    spread = 1;
  }

  const bbox = `${lon - spread},${lat - (spread * 0.6)},${lon + spread},${lat + (spread * 0.6)}`;

  const zoom = Math.max(2, Math.min(10, Math.round(8 - Math.log2(spread))));
  const tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`;

  const markerJs = selectedLocation
    ? `var icon=L.divIcon({className:'',html:'<div style="width:12px;height:12px;border-radius:50%;background:#C9933A;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>',iconSize:[12,12],iconAnchor:[6,6]});L.marker([${parseFloat(selectedLocation.latitude)},${parseFloat(selectedLocation.longitude)}],{icon:icon}).addTo(m);`
    : "";
  const leafletHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body{margin:0;padding:0}#map{width:100%;height:100vh}</style></head><body><div id="map"></div><script>var m=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lon}],${zoom});L.tileLayer('${tileUrl}',{subdomains:'abcd',maxZoom:19}).addTo(m);m.fitBounds([[${lat-(spread*0.6)},${lon-spread}],[${lat+(spread*0.6)},${lon+spread}]]);${markerJs}</script></body></html>`;

  const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(leafletHtml)}`;

  return (
    <View style={mapStyles.container}>
      <iframe
        key={`${lat.toFixed(3)}-${lon.toFixed(3)}-${spread.toFixed(2)}`}
        src={encodedHtml}
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
