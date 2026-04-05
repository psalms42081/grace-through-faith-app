import React, { useRef } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface ChurchMarker {
  lat: number;
  lng: number;
  name: string;
  member_count?: string | number;
}

export interface GeographicHeatmapProps {
  heatmap_points: HeatmapPoint[];
  church_markers: ChurchMarker[];
  selected_topic?: string;
  on_topic_change?: (topic: string | undefined) => void;
}

function generateHTML(
  points: HeatmapPoint[],
  markers: ChurchMarker[],
  selectedTopic?: string,
): string {
  const pointsJSON = JSON.stringify(points);
  const markersJSON = JSON.stringify(markers);
  const titleText = selectedTopic
    ? `Topic heat map: ${selectedTopic}`
    : "Global Engagement Density";

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050507; font-family: 'Inter', -apple-system, sans-serif; }
    #title {
      position: absolute;
      top: 10px; left: 10px; right: 10px;
      z-index: 1000;
      background: rgba(20, 21, 24, 0.92);
      border: 1px solid #1E1F24;
      border-radius: 8px;
      padding: 8px 12px;
      color: #C9933A;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      pointer-events: none;
    }
    #map {
      width: 100%;
      height: 100vh;
    }
    .leaflet-container { background: #0A0B0D; }
    .leaflet-popup-content-wrapper {
      background: #141518;
      color: #E8E9ED;
      border: 1px solid #1E1F24;
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
    }
    .leaflet-popup-tip { background: #141518; }
    .leaflet-popup-content { margin: 8px 12px; }
    .church-name { color: #C9933A; font-weight: 600; margin-bottom: 2px; }
    .church-members { color: #6B7280; font-size: 11px; }
  </style>
</head>
<body>
  <div id="title">${titleText}</div>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(map);

    var points = ${pointsJSON};
    var markers = ${markersJSON};

    if (points.length > 0) {
      var heatData = points.map(function(p) {
        return [p.lat, p.lng, p.intensity];
      });

      L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {
          0.0: '#0000FF',
          0.5: '#00FF00',
          1.0: '#FF0000'
        }
      }).addTo(map);
    }

    markers.forEach(function(m) {
      var circle = L.circleMarker([m.lat, m.lng], {
        radius: 4,
        fillColor: '#C9933A',
        color: '#C9933A',
        weight: 1,
        fillOpacity: 0.8
      }).addTo(map);

      var membersText = m.member_count ? '<div class="church-members">' + m.member_count + ' members</div>' : '';
      circle.bindPopup('<div class="church-name">' + m.name + '</div>' + membersText);
    });
  <\/script>
</body>
</html>`;
}

export default function GeographicHeatmap({
  heatmap_points,
  church_markers,
  selected_topic,
  on_topic_change,
}: GeographicHeatmapProps) {
  const webViewRef = useRef<WebView>(null);
  const html = generateHTML(heatmap_points, church_markers, selected_topic);

  const topicFilterPill = on_topic_change ? (
    <View style={styles.filterRow}>
      <TouchableOpacity
        style={styles.filterPill}
        onPress={() => {
          if (selected_topic) {
            on_topic_change(undefined);
          }
        }}
        activeOpacity={selected_topic ? 0.7 : 1}
      >
        <Text style={styles.filterPillText}>
          {selected_topic ?? "All Topics"}
        </Text>
        {selected_topic ? (
          <Ionicons name="close-circle" size={14} color="#C9933A" />
        ) : (
          <Ionicons name="chevron-down" size={14} color="#6B7280" />
        )}
      </TouchableOpacity>
    </View>
  ) : null;

  const legendStrip = (
    <View style={styles.legendRow}>
      <Text style={styles.legendLabel}>Low</Text>
      <View style={styles.legendGradient}>
        <View style={[styles.legendSegment, { backgroundColor: "#0000FF" }]} />
        <View style={[styles.legendSegment, { backgroundColor: "#0080FF" }]} />
        <View style={[styles.legendSegment, { backgroundColor: "#00FF00" }]} />
        <View style={[styles.legendSegment, { backgroundColor: "#80FF00" }]} />
        <View style={[styles.legendSegment, { backgroundColor: "#FFFF00" }]} />
        <View style={[styles.legendSegment, { backgroundColor: "#FF8000" }]} />
        <View style={[styles.legendSegment, { backgroundColor: "#FF0000" }]} />
      </View>
      <Text style={styles.legendLabel}>High</Text>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.outerContainer}>
        {topicFilterPill}
        <View style={styles.container}>
          <iframe
            srcDoc={html}
            style={{ width: "100%", height: 300, border: "none", borderRadius: 12 }}
            title="Geographic Heatmap"
          />
        </View>
        {legendStrip}
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {topicFilterPill}
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      {legendStrip}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 12,
  },
  container: {
    backgroundColor: "#141518",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E1F24",
    overflow: "hidden",
    height: 300,
  },
  webview: {
    flex: 1,
    backgroundColor: "#050507",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141518",
    borderWidth: 1,
    borderColor: "#1E1F24",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#C9933A",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#6B7280",
  },
  legendGradient: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    flex: 1,
    maxWidth: 180,
  },
  legendSegment: {
    flex: 1,
  },
});
