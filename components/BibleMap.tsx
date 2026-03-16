import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

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
  routeLines?: RouteLineData[];
  kingdomMarkers?: KingdomMarkerData[];
  onKingdomPress?: (id: string) => void;
  tribeMarkers?: TribeMarkerData[];
  onTribePress?: (id: string) => void;
  fitCoordinates?: { latitude: number; longitude: number }[];
  isJourneySelected?: boolean;
  quietMarkers?: boolean;
}

function buildLeafletHtml(props: {
  lat: number;
  lon: number;
  zoom: number;
  bounds?: [[number, number], [number, number]];
  locations: { id: string; name: string; lat: number; lon: number; type: string | null; selected: boolean; quiet: boolean }[];
  routeLines: { id: string; coords: [number, number][]; color: string; highlight: boolean }[];
  kingdomMarkers: { id: string; label: string; lat: number; lon: number; color: string; selected: boolean }[];
  tribeMarkers: { id: string; label: string; lat: number; lon: number; color: string; selected: boolean }[];
}): string {
  const { lat, lon, zoom, bounds, locations, routeLines, kingdomMarkers, tribeMarkers } = props;

  const escJs = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/</g, "\\x3c").replace(/>/g, "\\x3e").replace(/"/g, "\\x22");

  const markersJs = locations.map((loc) => {
    const size = loc.selected ? 10 : 6;
    const color = loc.selected ? "#C9933A" : (loc.quiet ? "#8B8B8B" : "#C9933A");
    const opacity = loc.selected ? 1.0 : (loc.quiet ? 0.5 : 0.75);
    const border = loc.selected ? "#FFFFFF" : "rgba(0,0,0,0.3)";
    const borderW = loc.selected ? 2.5 : 1;
    const shadow = loc.selected ? "0 0 8px rgba(201,147,58,0.6)" : "none";
    const zIdx = loc.selected ? 1000 : 100;
    return `(function(){
      var icon=L.divIcon({className:'',html:'<div style="width:${size*2}px;height:${size*2}px;border-radius:50%;background:${color};border:${borderW}px solid ${border};opacity:${opacity};box-shadow:${shadow};"></div>',iconSize:[${size*2},${size*2}],iconAnchor:[${size},${size}]});
      var m=L.marker([${loc.lat},${loc.lon}],{icon:icon,zIndexOffset:${zIdx}}).addTo(map);
      ${loc.selected ? `L.tooltip({permanent:true,direction:'top',offset:[0,-${size+2}],className:'atlas-label selected-label'}).setContent('${escJs(loc.name)}').setLatLng([${loc.lat},${loc.lon}]).addTo(map);` : ""}
      m.on('click',function(){window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify({type:'marker',id:'${loc.id}'})):window.parent.postMessage(JSON.stringify({type:'marker',id:'${loc.id}'}),'*');});
    })();`;
  }).join("\n");

  const routesJs = routeLines.map((route) => {
    const coordsStr = route.coords.map(c => `[${c[0]},${c[1]}]`).join(",");
    const weight = route.highlight ? 3.5 : 1.5;
    const opacity = route.highlight ? 0.85 : 0.35;
    const dash = route.highlight ? "" : "6 4";
    return `L.polyline([${coordsStr}],{color:'${route.color}',weight:${weight},opacity:${opacity},dashArray:'${dash}',lineCap:'round',lineJoin:'round'}).addTo(map);`;
  }).join("\n");

  const kingdomsJs = kingdomMarkers.map((km) => {
    const radius = km.selected ? 180000 : 120000;
    const fillOpacity = km.selected ? 0.12 : 0.04;
    const strokeOpacity = km.selected ? 0.5 : 0.15;
    const weight = km.selected ? 2 : 0.5;
    const fontSize = km.selected ? 11 : 9;
    return `(function(){
      L.circle([${km.lat},${km.lon}],{radius:${radius},color:'${km.color}',fillColor:'${km.color}',fillOpacity:${fillOpacity},opacity:${strokeOpacity},weight:${weight}}).addTo(map);
      var icon=L.divIcon({className:'',html:'<div style="background:rgba(0,0,0,0.6);color:${km.color};font-size:${fontSize}px;font-weight:700;letter-spacing:1.5px;padding:3px 8px;border-radius:4px;white-space:nowrap;font-family:serif;">${escJs(km.label)}</div>',iconAnchor:[40,10]});
      L.marker([${km.lat},${km.lon}],{icon:icon,interactive:true}).addTo(map).on('click',function(){
        var msg=JSON.stringify({type:'kingdom',id:'${km.id}'});
        window.ReactNativeWebView?window.ReactNativeWebView.postMessage(msg):window.parent.postMessage(msg,'*');
      });
    })();`;
  }).join("\n");

  const tribesJs = tribeMarkers.map((tm) => {
    const radius = tm.selected ? 28000 : 20000;
    const fillOpacity = tm.selected ? 0.15 : 0.05;
    const strokeOpacity = tm.selected ? 0.5 : 0.15;
    const weight = tm.selected ? 2 : 0.5;
    const fontSize = tm.selected ? 9 : 7;
    return `(function(){
      L.circle([${tm.lat},${tm.lon}],{radius:${radius},color:'${tm.color}',fillColor:'${tm.color}',fillOpacity:${fillOpacity},opacity:${strokeOpacity},weight:${weight}}).addTo(map);
      var icon=L.divIcon({className:'',html:'<div style="background:rgba(0,0,0,0.6);color:${tm.color};font-size:${fontSize}px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:3px;white-space:nowrap;font-family:serif;">${escJs(tm.label)}</div>',iconAnchor:[30,8]});
      L.marker([${tm.lat},${tm.lon}],{icon:icon,interactive:true}).addTo(map).on('click',function(){
        var msg=JSON.stringify({type:'tribe',id:'${tm.id}'});
        window.ReactNativeWebView?window.ReactNativeWebView.postMessage(msg):window.parent.postMessage(msg,'*');
      });
    })();`;
  }).join("\n");

  const fitBoundsJs = bounds
    ? `map.fitBounds([[${bounds[0][0]},${bounds[0][1]}],[${bounds[1][0]},${bounds[1][1]}]],{padding:[28,20],animate:false});`
    : `map.setView([${lat},${lon}],${zoom});`;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#2a2520}
#map{width:100%;height:100%}
.leaflet-container{background:#2a2520 !important}
.leaflet-tile-pane{filter:brightness(0.35) contrast(1.15) sepia(0.35) saturate(0.7)}
.atlas-label{
  background:rgba(20,18,14,0.75) !important;
  border:1px solid rgba(201,147,58,0.3) !important;
  color:#C9933A !important;
  font-family:Georgia,serif !important;
  font-size:11px !important;
  font-weight:600 !important;
  letter-spacing:0.5px !important;
  padding:2px 7px !important;
  border-radius:4px !important;
  box-shadow:0 2px 6px rgba(0,0,0,0.4) !important;
}
.atlas-label.selected-label{
  font-size:12px !important;
  border-color:rgba(201,147,58,0.5) !important;
}
.leaflet-control-attribution{font-size:8px !important;background:rgba(20,18,14,0.6) !important;color:rgba(180,170,150,0.5) !important;padding:1px 4px !important}
.leaflet-control-attribution a{color:rgba(180,170,150,0.5) !important;text-decoration:none !important}
.leaflet-control-zoom{display:none !important}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{
  zoomControl:false,
  attributionControl:false,
  fadeAnimation:false,
  zoomAnimation:true,
  maxZoom:10,
  minZoom:3
});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',{
  maxZoom:13,
  attribution:'Esri'
}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',{
  subdomains:'abcd',
  maxZoom:16,
  attribution:'CARTO',
  opacity:0.5,
  pane:'overlayPane'
}).addTo(map);
${fitBoundsJs}
${kingdomsJs}
${tribesJs}
${routesJs}
${markersJs}
</script>
</body>
</html>`;
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
  fitCoordinates,
  isJourneySelected,
  quietMarkers,
}: BibleMapProps) {
  const webViewRef = useRef<WebView>(null);

  const mapLocations = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      lat: parseFloat(loc.latitude),
      lon: parseFloat(loc.longitude),
      type: loc.locationType,
      selected: !!(selectedLocation && loc.id === selectedLocation.id),
      quiet: !!quietMarkers,
    }));
  }, [locations, selectedLocation, quietMarkers]);

  const mapRouteLines = useMemo(() => {
    if (!routeLines) return [];
    return routeLines.map((r) => ({
      id: r.id,
      coords: r.coordinates.map((c): [number, number] => [c.latitude, c.longitude]),
      color: r.color,
      highlight: !!r.highlight,
    }));
  }, [routeLines]);

  const mapKingdoms = useMemo(() => {
    if (!kingdomMarkers) return [];
    return kingdomMarkers.map((k) => ({
      id: k.id,
      label: k.label,
      lat: k.latitude,
      lon: k.longitude,
      color: k.color,
      selected: !!k.selected,
    }));
  }, [kingdomMarkers]);

  const mapTribes = useMemo(() => {
    if (!tribeMarkers) return [];
    return tribeMarkers.map((t) => ({
      id: t.id,
      label: t.label,
      lat: t.latitude,
      lon: t.longitude,
      color: t.color,
      selected: !!t.selected,
    }));
  }, [tribeMarkers]);

  const boundsAndZoom = useMemo((): { bounds?: [[number, number], [number, number]]; lat: number; lon: number; zoom: number } => {
    if (fitCoordinates && fitCoordinates.length >= 2) {
      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      for (const c of fitCoordinates) {
        if (c.latitude < minLat) minLat = c.latitude;
        if (c.latitude > maxLat) maxLat = c.latitude;
        if (c.longitude < minLon) minLon = c.longitude;
        if (c.longitude > maxLon) maxLon = c.longitude;
      }
      const padLat = (maxLat - minLat) * 0.12;
      const padLon = (maxLon - minLon) * 0.12;
      return {
        bounds: [[minLat - padLat, minLon - padLon], [maxLat + padLat, maxLon + padLon]],
        lat: (minLat + maxLat) / 2,
        lon: (minLon + maxLon) / 2,
        zoom: 6,
      };
    }
    if (fitCoordinates && fitCoordinates.length === 1) {
      return { lat: fitCoordinates[0].latitude, lon: fitCoordinates[0].longitude, zoom: 7 };
    }
    return { lat: defaultLat, lon: defaultLon, zoom: 6 };
  }, [fitCoordinates, defaultLat, defaultLon]);

  const htmlContent = useMemo(() => {
    return buildLeafletHtml({
      lat: boundsAndZoom.lat,
      lon: boundsAndZoom.lon,
      zoom: boundsAndZoom.zoom,
      bounds: boundsAndZoom.bounds,
      locations: mapLocations,
      routeLines: mapRouteLines,
      kingdomMarkers: mapKingdoms,
      tribeMarkers: mapTribes,
    });
  }, [boundsAndZoom, mapLocations, mapRouteLines, mapKingdoms, mapTribes]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "marker" && onMarkerPress) {
        const loc = locations.find((l) => l.id === data.id);
        if (loc) onMarkerPress(loc);
      } else if (data.type === "kingdom" && onKingdomPress) {
        onKingdomPress(data.id);
      } else if (data.type === "tribe" && onTribePress) {
        onTribePress(data.id);
      }
    } catch {}
  }, [locations, onMarkerPress, onKingdomPress, onTribePress]);

  return (
    <View style={mapStyles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={mapStyles.map}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        nestedScrollEnabled={true}
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
  map: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2a2520",
  },
});
