import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import RelatedStudiesSection from "@/components/RelatedStudiesSection";
import {
  getJourneyRouteById,
  getLocationById,
  JOURNEY_ROUTE_COLORS,
} from "@/constants/biblical-locations";

export default function JourneyRouteDetailScreen() {
  const { id, mode, era, overlay, journey } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
    journey?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const route = getJourneyRouteById(id || "");
  const routeColor = route ? (JOURNEY_ROUTE_COLORS[route.id] || "#C9933A") : "#C9933A";

  if (!route) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Journey Route",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="trail-sign-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Journey route not found
            </Text>
          </View>
        </View>
      </>
    );
  }



  return (
    <>
      <Stack.Screen
        options={{
          title: route.title,
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: "Lora_700Bold", fontSize: 18 },
        }}
      />
      <ScrollView
        style={[st.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.heroSection}>
          <View style={[st.heroIcon, { backgroundColor: routeColor + "18" }]}>
            <Ionicons name="trail-sign-outline" size={36} color={routeColor} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {route.title}
          </Text>
          <View style={[st.categoryBadge, { backgroundColor: routeColor + "22" }]}>
            <Text style={[st.categoryText, { color: routeColor, fontFamily: "Inter_600SemiBold" }]}>
              {route.category}
            </Text>
          </View>
        </View>

        <View style={st.section}>
          <Text style={[st.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {route.shortDescription}
          </Text>
        </View>

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Route Stops
          </Text>
          {route.routeSegments.map((seg, idx) => {
            const fromLoc = getLocationById(seg.fromLocationId);
            const toLoc = getLocationById(seg.toLocationId);
            return (
              <View key={`${seg.fromLocationId}-${seg.toLocationId}-${idx}`} style={st.segmentRow}>
                <View style={st.segmentLine}>
                  <View style={[st.segmentDot, { backgroundColor: routeColor }]} />
                  {idx < route.routeSegments.length - 1 && (
                    <View style={[st.segmentConnector, { backgroundColor: routeColor + "40" }]} />
                  )}
                </View>
                <View style={st.segmentContent}>
                  <Pressable
                    onPress={() => {
                      if (fromLoc) {
                        router.push({
                          pathname: `/location/${fromLoc.id}`,
                          params: { mode: mode || "biblical", era: era || "All", overlay: overlay || "journey-routes", journey: journey || "all" },
                        } as any);
                      }
                    }}
                    style={({ pressed }) => [
                      st.stopCard,
                      { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Ionicons name="location" size={16} color={routeColor} />
                    <Text style={[st.stopName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                      {fromLoc?.name || seg.fromLocationId}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                  </Pressable>
                  <Text style={[st.segLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                    {seg.label}
                  </Text>
                  {idx === route.routeSegments.length - 1 && toLoc && (
                    <View style={st.segmentFinalRow}>
                      <View style={st.segmentLine}>
                        <View style={[st.segmentDot, { backgroundColor: routeColor }]} />
                      </View>
                      <Pressable
                        onPress={() => {
                          router.push({
                            pathname: `/location/${toLoc.id}`,
                            params: { mode: mode || "biblical", era: era || "All", overlay: overlay || "journey-routes", journey: journey || "all" },
                          } as any);
                        }}
                        style={({ pressed }) => [
                          st.stopCard,
                          { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.75 : 1, flex: 1 },
                        ]}
                      >
                        <Ionicons name="location" size={16} color={routeColor} />
                        <Text style={[st.stopName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                          {toLoc.name}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Key Passages
          </Text>
          <View style={st.passageRow}>
            {route.keyPassages.map((p) => (
              <View key={p} style={[st.passageBadge, { backgroundColor: routeColor + "18" }]}>
                <Ionicons name="book-outline" size={13} color={routeColor} />
                <Text style={[st.passageText, { color: routeColor, fontFamily: "Inter_500Medium" }]}>
                  {p}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Eras
          </Text>
          <View style={st.eraRow}>
            {route.eras.map((e) => (
              <View key={e} style={[st.eraBadge, { backgroundColor: theme.backgroundCard }]}>
                <Text style={[st.eraText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  {e}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <RelatedStudiesSection
          keyPassages={route.keyPassages}
          entityName={route.title}
          showHistoricVoices={true}
          showViewOnMap={true}
          mapParams={{ mode: "biblical", era: era || "All", overlay: "journey-routes", journey: route.id }}
          showViewOnTimeline={true}
          timelineParams={{ mode: "biblical", era: era || "All", overlay: "journey-routes", journey: route.id }}
        />
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, textAlign: "center" },
  heroSection: { alignItems: "center", paddingTop: 24, paddingHorizontal: 24, gap: 12 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  heroTitle: { fontSize: 24, textAlign: "center" },
  categoryBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  categoryText: { fontSize: 13 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 23 },
  segmentRow: { flexDirection: "row", marginBottom: 4 },
  segmentLine: { width: 24, alignItems: "center" },
  segmentDot: { width: 10, height: 10, borderRadius: 5, marginTop: 12 },
  segmentConnector: { width: 2, flex: 1, marginTop: 4 },
  segmentContent: { flex: 1, paddingLeft: 8 },
  stopCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stopName: { fontSize: 14, flex: 1 },
  segLabel: { fontSize: 12, paddingLeft: 12, paddingVertical: 6 },
  segmentFinalRow: { flexDirection: "row", marginTop: 4 },
  passageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  passageBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  passageText: { fontSize: 13 },
  eraRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  eraBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  eraText: { fontSize: 13 },
});
