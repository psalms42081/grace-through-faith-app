import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Tab = "maps" | "timeline";

const TIMELINE_PREVIEW = [
  { period: "Patriarchs", year: "2166–1805 BC", events: ["Birth of Abraham", "Joseph in Egypt", "The Exodus"] },
  { period: "Conquest & Judges", year: "1406–1050 BC", events: ["Joshua conquers Canaan", "Deborah leads Israel", "Samson's ministry"] },
  { period: "United Kingdom", year: "1050–931 BC", events: ["Saul anointed king", "David's reign", "Solomon's Temple built"] },
  { period: "Divided Kingdom", year: "931–586 BC", events: ["Kingdom splits", "Elijah & Elisha", "Fall of Jerusalem"] },
  { period: "Exile & Return", year: "586–400 BC", events: ["Babylonian captivity", "Return under Zerubbabel", "Nehemiah rebuilds walls"] },
  { period: "New Testament", year: "4 BC–100 AD", events: ["Birth of Jesus", "Pentecost", "Paul's missionary journeys"] },
];

const MAP_REGIONS = [
  { name: "Ancient Near East", places: ["Mesopotamia", "Babylon", "Ur of the Chaldees"], icon: "globe-outline" as const },
  { name: "The Holy Land", places: ["Jerusalem", "Bethlehem", "Nazareth", "Jericho"], icon: "location-outline" as const },
  { name: "Egypt & Sinai", places: ["Goshen", "Mt. Sinai", "Wilderness of Paran"], icon: "map-outline" as const },
  { name: "Paul's Journeys", places: ["Antioch", "Ephesus", "Corinth", "Rome"], icon: "navigate-outline" as const },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("maps");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Explore
        </Text>
        {/* Toggle */}
        <View style={[styles.toggle, { backgroundColor: theme.backgroundSecondary }]}>
          {(["maps", "timeline"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                styles.toggleBtn,
                activeTab === t && { backgroundColor: theme.accent },
              ]}
            >
              <Ionicons
                name={t === "maps" ? "map" : "time"}
                size={14}
                color={activeTab === t ? "#fff" : theme.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: activeTab === t ? "#fff" : theme.textSecondary,
                    fontFamily: activeTab === t ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {t === "maps" ? "Maps" : "Timeline"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {activeTab === "maps" ? (
          <MapsTab theme={theme} />
        ) : (
          <TimelineTab theme={theme} />
        )}
      </ScrollView>
    </View>
  );
}

function MapsTab({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.tabContent}>
      {/* Map placeholder */}
      <View style={[styles.mapPlaceholder, { backgroundColor: theme.primary }]}>
        <Ionicons name="map" size={48} color={Colors.light.accent} />
        <Text style={[styles.mapPlaceholderTitle, { fontFamily: "Lora_600SemiBold" }]}>
          Ancient Holy Land
        </Text>
        <Text style={[styles.mapPlaceholderSub, { fontFamily: "Inter_400Regular" }]}>
          Interactive map with biblical locations, eras, and verse links available in Milestone 7.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Geographic Regions
      </Text>
      {MAP_REGIONS.map((region) => (
        <Pressable
          key={region.name}
          style={({ pressed }) => [
            styles.regionCard,
            {
              backgroundColor: theme.backgroundCard,
              borderColor: theme.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={[styles.regionIcon, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name={region.icon} size={22} color={theme.accent} />
          </View>
          <View style={styles.regionInfo}>
            <Text style={[styles.regionName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {region.name}
            </Text>
            <Text style={[styles.regionPlaces, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {region.places.join(" · ")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

function TimelineTab({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Biblical History
      </Text>
      {TIMELINE_PREVIEW.map((period, index) => (
        <View key={period.period} style={styles.timelineRow}>
          {/* Spine */}
          <View style={styles.spineLine}>
            <View style={[styles.spineDot, { backgroundColor: theme.accent }]} />
            {index < TIMELINE_PREVIEW.length - 1 && (
              <View style={[styles.spineTrail, { backgroundColor: theme.border }]} />
            )}
          </View>
          {/* Card */}
          <View style={[styles.timelineCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Text style={[styles.periodYear, { color: theme.accent, fontFamily: "Inter_600SemiBold" }]}>
              {period.year}
            </Text>
            <Text style={[styles.periodName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {period.period}
            </Text>
            <View style={styles.eventsList}>
              {period.events.map((event) => (
                <View key={event} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: theme.accent + "88" }]} />
                  <Text style={[styles.eventText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {event}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
      <View style={[styles.timelineNote, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
        <Text style={[styles.noteText, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Events link directly to Bible verses in Milestone 7.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { fontSize: 24 },
  toggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  toggleText: { fontSize: 13 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  tabContent: { gap: 12 },
  mapPlaceholder: {
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  mapPlaceholderTitle: { color: "#EDE5D5", fontSize: 18 },
  mapPlaceholderSub: { color: "rgba(237,229,213,0.65)", fontSize: 13, textAlign: "center", lineHeight: 20 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 4,
  },
  regionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  regionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  regionInfo: { flex: 1 },
  regionName: { fontSize: 15, marginBottom: 3 },
  regionPlaces: { fontSize: 12 },
  timelineRow: {
    flexDirection: "row",
    gap: 14,
  },
  spineLine: {
    alignItems: "center",
    width: 16,
    paddingTop: 14,
  },
  spineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  spineTrail: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -4,
    borderRadius: 1,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  periodYear: { fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  periodName: { fontSize: 16, marginBottom: 10 },
  eventsList: { gap: 6 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  eventText: { fontSize: 13, lineHeight: 18 },
  timelineNote: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noteText: { flex: 1, fontSize: 13 },
});
