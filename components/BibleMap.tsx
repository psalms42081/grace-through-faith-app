import React, { useRef, useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
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

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/</g, "\\x3c").replace(/>/g, "\\x3e").replace(/"/g, "\\x22");

function buildHtml(props: {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  locations: { id: string; name: string; lat: number; lon: number; selected: boolean; quiet: boolean }[];
  routeLines: { id: string; coords: [number, number][]; color: string; highlight: boolean }[];
  kingdoms: { id: string; label: string; lat: number; lon: number; color: string; selected: boolean }[];
  tribes: { id: string; label: string; lat: number; lon: number; color: string; selected: boolean }[];
}): string {
  const { center, zoom, bounds, locations, routeLines, kingdoms, tribes } = props;

  const fitJs = bounds
    ? `map.fitBounds([[${bounds[0][0]},${bounds[0][1]}],[${bounds[1][0]},${bounds[1][1]}]],{padding:[24,16],animate:false});`
    : `map.setView([${center[0]},${center[1]}],${zoom});`;

  const markersJs = locations.map((loc) => {
    const sz = loc.selected ? 5 : 2;
    const col = loc.selected ? "#5a3a1e" : "#4a3c2e";
    const op = loc.selected ? 1.0 : loc.quiet ? 0.3 : 0.55;
    const zi = loc.selected ? 1000 : 100;
    const dot = loc.selected
      ? `<div style="width:10px;height:10px;position:relative"><div style="width:10px;height:10px;border-radius:50%;background:${col};border:1.5px solid #2a1a0a;opacity:${op}"></div><div style="position:absolute;top:50%;left:50%;width:4px;height:0.5px;background:#2a1a0a;transform:translate(-50%,-50%);opacity:0.6"></div><div style="position:absolute;top:50%;left:50%;width:0.5px;height:4px;background:#2a1a0a;transform:translate(-50%,-50%);opacity:0.6"></div></div>`
      : `<div style="width:${sz*2}px;height:${sz*2}px;border-radius:50%;background:${col};opacity:${op}"></div>`;
    return `(function(){var i=L.divIcon({className:'',html:'${dot}',iconSize:[${loc.selected?10:sz*2},${loc.selected?10:sz*2}],iconAnchor:[${loc.selected?5:sz},${loc.selected?5:sz}]});var m=L.marker([${loc.lat},${loc.lon}],{icon:i,zIndexOffset:${zi}}).addTo(map);${loc.selected?`L.tooltip({permanent:true,direction:'top',offset:[0,-8],className:'loc-tip'}).setContent('${esc(loc.name)}').setLatLng([${loc.lat},${loc.lon}]).addTo(map);`:''}m.on('click',function(){p({t:'m',id:'${esc(loc.id)}'})});})();`;
  }).join("");

  const routeJs = routeLines.map((r) => {
    const cs = r.coords.map(c => `[${c[0]},${c[1]}]`).join(",");
    return `L.polyline([${cs}],{color:'${r.highlight?r.color:"#5a4a3a"}',weight:${r.highlight?2.5:0.8},opacity:${r.highlight?0.8:0.2},dashArray:'${r.highlight?"":"4 3"}',lineCap:'round',lineJoin:'round'}).addTo(map);`;
  }).join("");

  const kingdomJs = kingdoms.map((k) => {
    const rad = k.selected ? 280000 : 200000;
    const fo = k.selected ? 0.14 : 0.06;
    const so = k.selected ? 0.45 : 0.2;
    const w = k.selected ? 1.5 : 0.8;
    const fs = k.selected ? 12 : 10;
    return `(function(){L.circle([${k.lat},${k.lon}],{radius:${rad},color:'${k.color}',fillColor:'${k.color}',fillOpacity:${fo},opacity:${so},weight:${w},dashArray:'${k.selected?"":"6 3"}'}).addTo(map);var i=L.divIcon({className:'',html:'<div style="color:${k.color};font-size:${fs}px;font-weight:700;letter-spacing:2px;padding:2px 6px;white-space:nowrap;font-family:Georgia,serif;text-transform:uppercase;opacity:${k.selected?0.9:0.65};text-shadow:1px 1px 2px rgba(255,250,240,0.8),-1px -1px 2px rgba(255,250,240,0.8)">${esc(k.label)}</div>',iconAnchor:[40,10]});L.marker([${k.lat},${k.lon}],{icon:i,interactive:true}).addTo(map).on('click',function(){p({t:'k',id:'${esc(k.id)}'})});})();`;
  }).join("");

  const tribeJs = tribes.map((t) => {
    const rad = t.selected ? 38000 : 26000;
    const fo = t.selected ? 0.15 : 0.07;
    const so = t.selected ? 0.5 : 0.25;
    const w = t.selected ? 1.5 : 0.8;
    const fs = t.selected ? 10 : 8;
    return `(function(){L.circle([${t.lat},${t.lon}],{radius:${rad},color:'${t.color}',fillColor:'${t.color}',fillOpacity:${fo},opacity:${so},weight:${w},dashArray:'${t.selected?"":"4 2"}'}).addTo(map);var i=L.divIcon({className:'',html:'<div style="color:${t.color};font-size:${fs}px;font-weight:700;letter-spacing:1.5px;padding:2px 4px;white-space:nowrap;font-family:Georgia,serif;text-transform:uppercase;opacity:${t.selected?0.9:0.6};text-shadow:1px 1px 2px rgba(255,250,240,0.8),-1px -1px 2px rgba(255,250,240,0.8)">${esc(t.label)}</div>',iconAnchor:[30,8]});L.marker([${t.lat},${t.lon}],{icon:i,interactive:true}).addTo(map).on('click',function(){p({t:'tr',id:'${esc(t.id)}'})});})();`;
  }).join("");

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden}
body{background:#bfb49a}
.leaflet-container{background:#bfb49a!important}
.leaflet-tile-pane{filter:brightness(0.88) contrast(1.12) sepia(0.3) saturate(0.65) hue-rotate(-5deg)}
.leaflet-control-zoom{display:none!important}
.leaflet-control-attribution{font-size:6px!important;background:rgba(170,160,140,0.35)!important;color:rgba(90,80,60,0.3)!important;padding:1px 3px!important;pointer-events:auto}
.leaflet-control-attribution a{color:rgba(90,80,60,0.3)!important;text-decoration:none!important}
.loc-tip{background:rgba(50,42,30,0.92)!important;border:1px solid rgba(160,130,70,0.5)!important;color:#d4b86a!important;font-family:Georgia,serif!important;font-size:10px!important;font-weight:600!important;letter-spacing:0.8px!important;padding:3px 8px!important;border-radius:2px!important;box-shadow:0 2px 6px rgba(0,0,0,0.3)!important}
</style></head><body><div id="map"></div>
<script>
function p(d){window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify(d)):window.parent.postMessage(JSON.stringify(d),'*')}
var _ts=${Date.now()};var map=L.map('map',{zoomControl:false,attributionControl:true,maxZoom:10,minZoom:3});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:8,attribution:'Esri'}).addTo(map);
${fitJs}
${kingdomJs}${tribeJs}${routeJs}${markersJs}
<\/script></body></html>`;
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

  const mapLocs = useMemo(() =>
    locations.map((l) => ({
      id: l.id,
      name: l.name,
      lat: parseFloat(l.latitude),
      lon: parseFloat(l.longitude),
      selected: !!(selectedLocation && l.id === selectedLocation.id),
      quiet: !!quietMarkers,
    })), [locations, selectedLocation, quietMarkers]);

  const mapRoutes = useMemo(() =>
    (routeLines || []).map((r) => ({
      id: r.id,
      coords: r.coordinates.map((c): [number, number] => [c.latitude, c.longitude]),
      color: r.color,
      highlight: !!r.highlight,
    })), [routeLines]);

  const mapKingdoms = useMemo(() =>
    (kingdomMarkers || []).map((k) => ({
      id: k.id, label: k.label, lat: k.latitude, lon: k.longitude, color: k.color, selected: !!k.selected,
    })), [kingdomMarkers]);

  const mapTribes = useMemo(() =>
    (tribeMarkers || []).map((t) => ({
      id: t.id, label: t.label, lat: t.latitude, lon: t.longitude, color: t.color, selected: !!t.selected,
    })), [tribeMarkers]);

  const viewCalc = useMemo((): { center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] } => {
    if (fitCoordinates && fitCoordinates.length >= 2) {
      let mnLa = Infinity, mxLa = -Infinity, mnLo = Infinity, mxLo = -Infinity;
      for (const c of fitCoordinates) {
        if (c.latitude < mnLa) mnLa = c.latitude;
        if (c.latitude > mxLa) mxLa = c.latitude;
        if (c.longitude < mnLo) mnLo = c.longitude;
        if (c.longitude > mxLo) mxLo = c.longitude;
      }
      const pLa = (mxLa - mnLa) * 0.1;
      const pLo = (mxLo - mnLo) * 0.1;
      return {
        center: [(mnLa + mxLa) / 2, (mnLo + mxLo) / 2],
        zoom: 6,
        bounds: [[mnLa - pLa, mnLo - pLo], [mxLa + pLa, mxLo + pLo]],
      };
    }
    if (fitCoordinates && fitCoordinates.length === 1) {
      return { center: [fitCoordinates[0].latitude, fitCoordinates[0].longitude], zoom: 7 };
    }
    return { center: [defaultLat, defaultLon], zoom: 6 };
  }, [fitCoordinates, defaultLat, defaultLon]);

  const html = useMemo(() =>
    buildHtml({
      center: viewCalc.center,
      zoom: viewCalc.zoom,
      bounds: viewCalc.bounds,
      locations: mapLocs,
      routeLines: mapRoutes,
      kingdoms: mapKingdoms,
      tribes: mapTribes,
    }), [viewCalc, mapLocs, mapRoutes, mapKingdoms, mapTribes]);

  const handleMessage = useCallback((event: any) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.t === "m" && onMarkerPress) {
        const loc = locations.find((l) => l.id === d.id);
        if (loc) onMarkerPress(loc);
      } else if (d.t === "k" && onKingdomPress) {
        onKingdomPress(d.id);
      } else if (d.t === "tr" && onTribePress) {
        onTribePress(d.id);
      }
    } catch {}
  }, [locations, onMarkerPress, onKingdomPress, onTribePress]);

  return (
    <View style={s.container}>
      <WebView
        source={{ html }}
        style={s.map}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        originWhitelist={["*"]}
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        nestedScrollEnabled
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" },
  map: { width: "100%", height: "100%", backgroundColor: "#bfb49a" },
});
