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
import RelatedStudiesSection, { parsePassageReference } from "@/components/RelatedStudiesSection";
import {
  getKingdomById,
  getLocationById,
  getProphecyLinkById,
} from "@/constants/biblical-locations";

export default function KingdomOverlayDetailScreen() {
  const { id, mode, era, overlay, kingdom } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
    kingdom?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const kingdomData = getKingdomById(id || "");

  if (!kingdomData) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Kingdom",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="shield-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Kingdom not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const relatedLocations = kingdomData.relatedLocationIds
    .map((lid) => getLocationById(lid))
    .filter(Boolean);

  const relatedProphecies = kingdomData.relatedProphecyLinkIds
    .map((plid) => getProphecyLinkById(plid))
    .filter(Boolean);


  return (
    <>
      <Stack.Screen
        options={{
          title: kingdomData.name,
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
          <View style={[st.heroIcon, { backgroundColor: kingdomData.color + "18" }]}>
            <Ionicons name="shield-outline" size={36} color={kingdomData.color} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {kingdomData.name}
          </Text>
          <View style={[st.eraBadge, { backgroundColor: kingdomData.color + "22" }]}>
            <Text style={[st.eraText, { color: kingdomData.color, fontFamily: "Inter_600SemiBold" }]}>
              {kingdomData.eraLabel}
            </Text>
          </View>
        </View>

        <View style={st.section}>
          <Text style={[st.description, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {kingdomData.shortDescription}
          </Text>
        </View>

        {kingdomData.periods.length > 0 && (
          <View style={st.section}>
            <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Periods
            </Text>
            <View style={st.chipRow}>
              {kingdomData.periods.map((p) => (
                <View key={p} style={[st.chip, { backgroundColor: theme.backgroundCard }]}>
                  <Text style={[st.chipText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Key Passages
          </Text>
          <View style={st.chipRow}>
            {kingdomData.keyPassages.map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  const ref = parsePassageReference(p);
                  if (ref) router.push(`/read/${ref.bookId}/${ref.chapter}` as any);
                }}
                style={({ pressed }) => [st.passageBadge, { backgroundColor: kingdomData.color + "18", opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="book-outline" size={13} color={kingdomData.color} />
                <Text style={[st.passageText, { color: kingdomData.color, fontFamily: "Inter_500Medium" }]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {relatedLocations.length > 0 && (
          <View style={st.section}>
            <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Related Locations
            </Text>
            {relatedLocations.map((loc) => (
              <Pressable
                key={loc!.id}
                onPress={() => router.push({ pathname: `/location/${loc!.id}`, params: { mode: mode || "biblical", era: era || "All", overlay: overlay || "kingdoms", kingdom: kingdom || kingdomData.id } } as any)}
                style={({ pressed }) => [st.locRow, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="location" size={16} color={kingdomData.color} />
                <Text style={[st.locName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {loc!.name}
                </Text>
                <Text style={[st.locRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
                  {loc!.ancientRegion}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {relatedProphecies.length > 0 && (
          <View style={st.section}>
            <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Prophetic Significance
            </Text>
            {relatedProphecies.map((pl) => (
              <Pressable
                key={pl!.id}
                onPress={() => router.push({ pathname: `/prophecy-link/${pl!.id}`, params: { mode: mode || "biblical", era: era || "All", overlay: "prophecy" } } as any)}
                style={({ pressed }) => [st.locRow, { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="flash-outline" size={16} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={[st.locName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {pl!.title}
                  </Text>
                  <Text style={[st.locRegion, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {pl!.theme}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        <RelatedStudiesSection
          keyPassages={kingdomData.keyPassages}
          entityName={kingdomData.name}
          showProphecyExplorer={relatedProphecies.length > 0}
          showHistoricVoices={true}
          showViewOnMap={true}
          mapParams={{ mode: "biblical", era: era || "All", overlay: "kingdoms", kingdom: kingdomData.id }}
          showViewOnTimeline={true}
          timelineParams={{ mode: "biblical", era: era || "All", overlay: "kingdoms", kingdom: kingdomData.id }}
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
  eraBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  eraText: { fontSize: 13 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 23 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  chipText: { fontSize: 13 },
  passageBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  passageText: { fontSize: 13 },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  locName: { fontSize: 14 },
  locRegion: { fontSize: 12, flex: 1 },
});
