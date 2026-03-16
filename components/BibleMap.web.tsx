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
  const locationsRef = useRef(locations);
  const onMarkerPressRef = useRef(onMarkerPress);
  const onKingdomPressRef = useRef(onKingdomPress);
  const onTribePressRef = useRef(onTribePress);

  locationsRef.current = locations;
  onMarkerPressRef.current = onMarkerPress;
  onKingdomPressRef.current = onKingdomPress;
  onTribePressRef.current = onTribePress;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "marker" && onMarkerPressRef.current) {
          const loc = locationsRef.current.find((l) => l.id === data.id);
          if (loc) onMarkerPressRef.current(loc);
        } else if (data.type === "kingdom" && onKingdomPressRef.current) {
          onKingdomPressRef.current(data.id);
        } else if (data.type === "tribe" && onTribePressRef.current) {
          onTribePressRef.current(data.id);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const boundsAndZoom = useMemo(() => {
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
        bounds: [[minLat - padLat, minLon - padLon], [maxLat + padLat, maxLon + padLon]] as [[number, number], [number, number]],
        lat: (minLat + maxLat) / 2,
        lon: (minLon + maxLon) / 2,
        zoom: 6,
      };
    }
    if (fitCoordinates && fitCoordinates.length === 1) {
      return { lat: fitCoordinates[0].latitude, lon: fitCoordinates[0].longitude, zoom: 7, bounds: undefined };
    }
    return { lat: defaultLat, lon: defaultLon, zoom: 6, bounds: undefined };
  }, [fitCoordinates, defaultLat, defaultLon]);

  const escJs = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/</g, "\\x3c").replace(/>/g, "\\x3e").replace(/"/g, "\\x22");

  const markersJs = useMemo(() => {
    return locations.map((loc) => {
      const isSelected = !!(selectedLocation && loc.id === selectedLocation.id);
      const size = isSelected ? 10 : 6;
      const color = isSelected ? "#C9933A" : (quietMarkers ? "#8B8B8B" : "#C9933A");
      const opacity = isSelected ? 1.0 : (quietMarkers ? 0.5 : 0.75);
      const border = isSelected ? "#FFFFFF" : "rgba(0,0,0,0.3)";
      const borderW = isSelected ? 2.5 : 1;
      const shadow = isSelected ? "0 0 8px rgba(201,147,58,0.6)" : "none";
      const zIdx = isSelected ? 1000 : 100;
      let js = `(function(){
        var icon=L.divIcon({className:'',html:'<div style="width:${size*2}px;height:${size*2}px;border-radius:50%;background:${color};border:${borderW}px solid ${border};opacity:${opacity};box-shadow:${shadow};"></div>',iconSize:[${size*2},${size*2}],iconAnchor:[${size},${size}]});
        var m=L.marker([${parseFloat(loc.latitude)},${parseFloat(loc.longitude)}],{icon:icon,zIndexOffset:${zIdx}}).addTo(map);`;
      if (isSelected) {
        js += `L.tooltip({permanent:true,direction:'top',offset:[0,-${size+2}],className:'atlas-label selected-label'}).setContent('${escJs(loc.name)}').setLatLng([${parseFloat(loc.latitude)},${parseFloat(loc.longitude)}]).addTo(map);`;
      }
      js += `m.on('click',function(){window.parent.postMessage(JSON.stringify({type:'marker',id:'${loc.id}'}),'*');});
      })();`;
      return js;
    }).join("\n");
  }, [locations, selectedLocation, quietMarkers]);

  const routesJs = useMemo(() => {
    if (!routeLines) return "";
    return routeLines.map((route) => {
      const coords = route.coordinates.map(c => `[${c.latitude},${c.longitude}]`).join(",");
      const weight = route.highlight ? 3.5 : 1.5;
      const opacity = route.highlight ? 0.85 : 0.35;
      const dash = route.highlight ? "" : "6 4";
      return `L.polyline([${coords}],{color:'${route.color}',weight:${weight},opacity:${opacity},dashArray:'${dash}',lineCap:'round',lineJoin:'round'}).addTo(map);`;
    }).join("\n");
  }, [routeLines]);

  const kingdomsJs = useMemo(() => {
    if (!kingdomMarkers || kingdomMarkers.length === 0) return "";
    return kingdomMarkers.map((km) => {
      const radius = km.selected ? 180000 : 120000;
      const fillOpacity = km.selected ? 0.12 : 0.04;
      const strokeOpacity = km.selected ? 0.5 : 0.15;
      const weight = km.selected ? 2 : 0.5;
      const fontSize = km.selected ? 11 : 9;
      return `(function(){
        L.circle([${km.latitude},${km.longitude}],{radius:${radius},color:'${km.color}',fillColor:'${km.color}',fillOpacity:${fillOpacity},opacity:${strokeOpacity},weight:${weight}}).addTo(map);
        var icon=L.divIcon({className:'',html:'<div style="background:rgba(0,0,0,0.6);color:${km.color};font-size:${fontSize}px;font-weight:700;letter-spacing:1.5px;padding:3px 8px;border-radius:4px;white-space:nowrap;font-family:serif;">${escJs(km.label)}</div>',iconAnchor:[40,10]});
        L.marker([${km.latitude},${km.longitude}],{icon:icon,interactive:true}).addTo(map).on('click',function(){window.parent.postMessage(JSON.stringify({type:'kingdom',id:'${km.id}'}),'*');});
      })();`;
    }).join("\n");
  }, [kingdomMarkers]);

  const tribesJs = useMemo(() => {
    if (!tribeMarkers || tribeMarkers.length === 0) return "";
    return tribeMarkers.map((tm) => {
      const radius = tm.selected ? 28000 : 20000;
      const fillOpacity = tm.selected ? 0.15 : 0.05;
      const strokeOpacity = tm.selected ? 0.5 : 0.15;
      const weight = tm.selected ? 2 : 0.5;
      const fontSize = tm.selected ? 9 : 7;
      return `(function(){
        L.circle([${tm.latitude},${tm.longitude}],{radius:${radius},color:'${tm.color}',fillColor:'${tm.color}',fillOpacity:${fillOpacity},opacity:${strokeOpacity},weight:${weight}}).addTo(map);
        var icon=L.divIcon({className:'',html:'<div style="background:rgba(0,0,0,0.6);color:${tm.color};font-size:${fontSize}px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:3px;white-space:nowrap;font-family:serif;">${escJs(tm.label)}</div>',iconAnchor:[30,8]});
        L.marker([${tm.latitude},${tm.longitude}],{icon:icon,interactive:true}).addTo(map).on('click',function(){window.parent.postMessage(JSON.stringify({type:'tribe',id:'${tm.id}'}),'*');});
      })();`;
    }).join("\n");
  }, [tribeMarkers]);

  const fitBoundsJs = boundsAndZoom.bounds
    ? `map.fitBounds([[${boundsAndZoom.bounds[0][0]},${boundsAndZoom.bounds[0][1]}],[${boundsAndZoom.bounds[1][0]},${boundsAndZoom.bounds[1][1]}]],{padding:[28,20],animate:false});`
    : `map.setView([${boundsAndZoom.lat},${boundsAndZoom.lon}],${boundsAndZoom.zoom});`;

  const htmlContent = `<!DOCTYPE html>
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

  const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

  const key = `${boundsAndZoom.lat.toFixed(3)}-${boundsAndZoom.lon.toFixed(3)}-${boundsAndZoom.zoom}-${locations.length}-${(selectedLocation?.id || "none")}-${routeLines?.length || 0}-${kingdomMarkers?.length || 0}-${tribeMarkers?.length || 0}-${quietMarkers ? 1 : 0}-${kingdomMarkers?.find(k=>k.selected)?.id || ""}-${tribeMarkers?.find(t=>t.selected)?.id || ""}`;

  return (
    <View style={mapStyles.container}>
      <iframe
        ref={iframeRef as any}
        key={key}
        src={encodedHtml}
        style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 } as any}
        title="Bible Atlas"
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
