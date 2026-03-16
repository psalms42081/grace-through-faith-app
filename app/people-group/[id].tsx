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
  getPeopleGroupById,
  getLocationById,
  type EraFilter,
  type OverlayType,
} from "@/constants/biblical-locations";

export default function PeopleGroupDetailScreen() {
  const { id, mode, era, overlay } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const group = getPeopleGroupById(id || "");

  if (!group) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "People Group",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              People group not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const relatedLocations = group.relatedLocationIds
    .map((lid) => getLocationById(lid))
    .filter(Boolean);

  return (
    <>
      <Stack.Screen
        options={{
          title: group.name,
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
          <Text style={[st.groupName, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {group.name}
          </Text>
          <Text style={[st.heroSubtitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {group.regionLabel}
          </Text>
          <View style={st.badgeRow}>
            <View style={[st.badge, { backgroundColor: "#22C55E" + "18" }]}>
              <Ionicons name="people-outline" size={13} color="#22C55E" />
              <Text style={[st.badgeText, { color: "#22C55E", fontFamily: "Inter_600SemiBold" }]}>
                People Group
              </Text>
            </View>
          </View>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="globe-outline" size={16} color={theme.textMuted} />
            <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Region
            </Text>
          </View>
          <Text style={[st.cardValue, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
            {group.regionLabel}
          </Text>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
            <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Description
            </Text>
          </View>
          <Text style={[st.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {group.description}
          </Text>
        </View>

        {group.eras.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="time-outline" size={16} color="#7C3AED" />
              <Text style={[st.cardLabel, { color: "#7C3AED", fontFamily: "Inter_600SemiBold" }]}>
                Eras
              </Text>
            </View>
            <View style={st.chipsRow}>
              {group.eras.map((e, i) => (
                <View key={i} style={[st.chip, { backgroundColor: "#7C3AED" + "14" }]}>
                  <Text style={[st.chipText, { color: "#7C3AED", fontFamily: "Inter_500Medium" }]}>
                    {e}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {group.keyPassages.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="book-outline" size={16} color="#3B82F6" />
              <Text style={[st.cardLabel, { color: "#3B82F6", fontFamily: "Inter_600SemiBold" }]}>
                Key Passages
              </Text>
            </View>
            {group.keyPassages.map((passage, i) => (
              <View key={i} style={[st.passageRow, { borderColor: theme.border }]}>
                <Ionicons name="bookmark-outline" size={14} color={theme.accent} />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {passage}
                </Text>
              </View>
            ))}
          </View>
        )}

        {relatedLocations.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="location-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Related Locations
              </Text>
            </View>
            {relatedLocations.map((loc) => (
              <Pressable
                key={loc!.id}
                onPress={() =>
                  router.push({
                    pathname: `/location/${loc!.id}`,
                    params: { mode: mode || "modern", era: era || "All" },
                  } as any)
                }
                style={({ pressed }) => [st.locationRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[st.locationName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {loc!.name}
                </Text>
                <Text style={[st.locationRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {loc!.ancientRegion}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: "auto" }} />
              </Pressable>
            ))}
          </View>
        )}

        <RelatedStudiesSection
          keyPassages={group.keyPassages}
          entityName={group.name}
          showHistoricVoices={true}
          showViewOnMap={true}
          mapParams={{ mode: mode || "biblical", era: era || "All", overlay: overlay || "people-groups" }}
        />
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: { fontSize: 16 },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  groupName: {
    fontSize: 28,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
  },
  passageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  passageText: {
    fontSize: 14,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationName: {
    fontSize: 14,
  },
  locationRegion: {
    fontSize: 12,
  },
});
