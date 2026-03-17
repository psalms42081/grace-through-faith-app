import React, { useMemo, useEffect, useRef, useCallback } from "react";
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

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/</g, "\\x3c").replace(/>/g, "\\x3e").replace(/"/g, "\\x22");

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const locRef = useRef(locations);
  const onMarkerRef = useRef(onMarkerPress);
  const onKingdomRef = useRef(onKingdomPress);
  const onTribeRef = useRef(onTribePress);
  locRef.current = locations;
  onMarkerRef.current = onMarkerPress;
  onKingdomRef.current = onKingdomPress;
  onTribeRef.current = onTribePress;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d.t === "m" && onMarkerRef.current) {
          const loc = locRef.current.find((l) => l.id === d.id);
          if (loc) onMarkerRef.current(loc);
        } else if (d.t === "k" && onKingdomRef.current) {
          onKingdomRef.current(d.id);
        } else if (d.t === "tr" && onTribeRef.current) {
          onTribeRef.current(d.id);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const view = useMemo(() => {
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
      return { center: [(mnLa+mxLa)/2,(mnLo+mxLo)/2] as [number,number], zoom: 6, bounds: [[mnLa-pLa,mnLo-pLo],[mxLa+pLa,mxLo+pLo]] as [[number,number],[number,number]] };
    }
    if (fitCoordinates && fitCoordinates.length === 1) {
      return { center: [fitCoordinates[0].latitude, fitCoordinates[0].longitude] as [number,number], zoom: 7 };
    }
    return { center: [defaultLat, defaultLon] as [number,number], zoom: 6 };
  }, [fitCoordinates, defaultLat, defaultLon]);

  const markersData = useMemo(() =>
    locations.map((l) => ({
      id: l.id, name: l.name, lat: parseFloat(l.latitude), lon: parseFloat(l.longitude),
      selected: !!(selectedLocation && l.id === selectedLocation.id), quiet: !!quietMarkers,
    })), [locations, selectedLocation, quietMarkers]);

  const routeData = useMemo(() =>
    (routeLines || []).map((r) => ({
      id: r.id, coords: r.coordinates.map((c): [number,number] => [c.latitude, c.longitude]),
      color: r.color, highlight: !!r.highlight,
    })), [routeLines]);

  const kdData = useMemo(() =>
    (kingdomMarkers || []).map((k) => ({ id:k.id, label:k.label, lat:k.latitude, lon:k.longitude, color:k.color, selected:!!k.selected })), [kingdomMarkers]);

  const trData = useMemo(() =>
    (tribeMarkers || []).map((t) => ({ id:t.id, label:t.label, lat:t.latitude, lon:t.longitude, color:t.color, selected:!!t.selected })), [tribeMarkers]);

  const fitJs = view.bounds
    ? `map.fitBounds([[${view.bounds[0][0]},${view.bounds[0][1]}],[${view.bounds[1][0]},${view.bounds[1][1]}]],{padding:[24,16],animate:false});`
    : `map.setView([${view.center[0]},${view.center[1]}],${view.zoom});`;

  const markersJs = markersData.map((loc) => {
    const sz = loc.selected ? 3 : 1.5;
    const op = loc.selected ? 0.85 : loc.quiet ? 0.2 : 0.4;
    const zi = loc.selected ? 1000 : 100;
    return `(function(){var i=L.divIcon({className:'',html:'<div style="width:${sz*2}px;height:${sz*2}px;border-radius:50%;background:#2a2218;opacity:${op}"></div>',iconSize:[${sz*2},${sz*2}],iconAnchor:[${sz},${sz}]});var m=L.marker([${loc.lat},${loc.lon}],{icon:i,zIndexOffset:${zi}}).addTo(map);${loc.selected?`L.tooltip({permanent:true,direction:'top',offset:[0,-5],className:'loc-tip'}).setContent('${esc(loc.name)}').setLatLng([${loc.lat},${loc.lon}]).addTo(map);`:''}m.on('click',function(){p({t:'m',id:'${esc(loc.id)}'})});})();`;
  }).join("");

  const routeJs = routeData.map((r) => {
    const cs = r.coords.map(c=>`[${c[0]},${c[1]}]`).join(",");
    return `L.polyline([${cs}],{color:'${r.highlight?r.color:"#6a5d4e"}',weight:${r.highlight?1.8:0.6},opacity:${r.highlight?0.75:0.15},dashArray:'${r.highlight?"":"3 2"}',lineCap:'round',lineJoin:'round'}).addTo(map);`;
  }).join("");

  const kingdomJs = kdData.map((k) => {
    const rad = k.selected?300000:220000; const fo = k.selected?0.08:0.03; const so = k.selected?0.3:0.12; const w = k.selected?1.2:0.6; const fs = k.selected?11:9;
    return `(function(){L.circle([${k.lat},${k.lon}],{radius:${rad},color:'${k.color}',fillColor:'${k.color}',fillOpacity:${fo},opacity:${so},weight:${w},dashArray:'${k.selected?"":"5 3"}'}).addTo(map);var i=L.divIcon({className:'',html:'<div style="color:${k.color};font-size:${fs}px;font-style:italic;font-weight:400;letter-spacing:2.5px;padding:0;white-space:nowrap;font-family:Georgia,serif;opacity:${k.selected?0.8:0.5};text-shadow:1px 1px 2px rgba(210,200,185,0.9),-1px -1px 2px rgba(210,200,185,0.9)">${esc(k.label)}</div>',iconAnchor:[40,10]});L.marker([${k.lat},${k.lon}],{icon:i,interactive:true}).addTo(map).on('click',function(){p({t:'k',id:'${esc(k.id)}'})});})();`;
  }).join("");

  const tribeJs = trData.map((t) => {
    const rad = t.selected?38000:26000; const fo = t.selected?0.08:0.03; const so = t.selected?0.35:0.15; const w = t.selected?1.0:0.5; const fs = t.selected?9:7;
    return `(function(){L.circle([${t.lat},${t.lon}],{radius:${rad},color:'${t.color}',fillColor:'${t.color}',fillOpacity:${fo},opacity:${so},weight:${w},dashArray:'${t.selected?"":"3 2"}'}).addTo(map);var i=L.divIcon({className:'',html:'<div style="color:${t.color};font-size:${fs}px;font-style:italic;font-weight:400;letter-spacing:2px;padding:0;white-space:nowrap;font-family:Georgia,serif;opacity:${t.selected?0.75:0.5};text-shadow:1px 1px 2px rgba(210,200,185,0.9),-1px -1px 2px rgba(210,200,185,0.9)">${esc(t.label)}</div>',iconAnchor:[30,8]});L.marker([${t.lat},${t.lon}],{icon:i,interactive:true}).addTo(map).on('click',function(){p({t:'tr',id:'${esc(t.id)}'})});})();`;
  }).join("");

  const leafletHtml = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100vh;overflow:hidden}
body{background:#d0c8b8}
.leaflet-container{background:#d0c8b8!important}
.leaflet-tile-pane{filter:brightness(0.97) contrast(1.0) sepia(0.45) saturate(0.3) hue-rotate(-10deg)}
.leaflet-control-zoom{display:none!important}
.leaflet-control-attribution{font-size:5px!important;background:transparent!important;color:rgba(120,110,90,0.25)!important;padding:1px 3px!important;pointer-events:auto}
.leaflet-control-attribution a{color:rgba(120,110,90,0.25)!important;text-decoration:none!important}
.leaflet-top,.leaflet-bottom{pointer-events:none}
.leaflet-control-attribution{pointer-events:auto}
.loc-tip{background:transparent!important;border:none!important;color:#3a3028!important;font-family:Georgia,serif!important;font-size:10px!important;font-style:italic!important;font-weight:400!important;letter-spacing:0.3px!important;padding:0!important;border-radius:0!important;box-shadow:none!important;text-shadow:1px 1px 2px rgba(210,200,185,0.9),-1px -1px 2px rgba(210,200,185,0.9),0 0 4px rgba(210,200,185,0.8)!important}
</style></head><body><div id="map"></div>
<script>
function p(d){window.parent.postMessage(JSON.stringify(d),'*')}
var map=L.map('map',{zoomControl:false,attributionControl:true,maxZoom:10,minZoom:3});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:8,attribution:'Esri'}).addTo(map);
${fitJs}
${kingdomJs}${tribeJs}${routeJs}${markersJs}
<\/script></body></html>`;

  const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(leafletHtml)}`;

  return (
    <View style={mapStyles.container}>
      <iframe
        ref={iframeRef}
        key={`${view.center[0].toFixed(2)}-${view.center[1].toFixed(2)}-${markersData.length}-${routeData.length}-${kdData.length}-${trData.length}-${markersData.filter(m=>m.selected).map(m=>m.id).join(",")}`}
        src={encodedHtml}
        style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 } as any}
        title="Bible Map"
      />
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: { width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" },
});
