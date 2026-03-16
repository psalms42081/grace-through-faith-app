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
  getTribeById,
  getLocationById,
} from "@/constants/biblical-locations";

export default function TribeOverlayDetailScreen() {
  const { id, mode, era, overlay, tribe } = useLocalSearchParams<{
    id: string;
    mode?: string;
    era?: string;
    overlay?: string;
    tribe?: string;
  }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const tribeData = getTribeById(id || "");

  if (!tribeData) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Tribe",
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
            headerTintColor: theme.text,
          }}
        />
        <View style={[st.container, { backgroundColor: theme.background }]}>
          <View style={st.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={[st.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Tribe not found
            </Text>
          </View>
        </View>
      </>
    );
  }

  const relatedLocations = tribeData.relatedLocationIds
    .map((lid) => getLocationById(lid))
    .filter(Boolean);



  return (
    <>
      <Stack.Screen
        options={{
          title: tribeData.name,
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
        <View style={st.hero}>
          <View style={[st.heroIcon, { backgroundColor: tribeData.color + "18" }]}>
            <Ionicons name="people-outline" size={36} color={tribeData.color} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            {tribeData.name}
          </Text>
          <View style={[st.eraBadge, { backgroundColor: tribeData.color + "20", borderColor: tribeData.color + "40" }]}>
            <Text style={[st.eraBadgeText, { color: tribeData.color, fontFamily: "Inter_600SemiBold" }]}>
              {tribeData.regionLabel}
            </Text>
          </View>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="map-outline" size={16} color={tribeData.color} />
            <Text style={[st.cardLabel, { color: tribeData.color, fontFamily: "Inter_600SemiBold" }]}>
              Region
            </Text>
          </View>
          <Text style={[st.descText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {tribeData.regionLabel}
          </Text>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="document-text-outline" size={16} color={theme.textMuted} />
            <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              Description
            </Text>
          </View>
          <Text style={[st.descText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {tribeData.shortDescription}
          </Text>
        </View>

        <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.cardRow}>
            <Ionicons name="book-outline" size={16} color="#C9933A" />
            <Text style={[st.cardLabel, { color: "#C9933A", fontFamily: "Inter_600SemiBold" }]}>
              Key Passages
            </Text>
          </View>
          {tribeData.keyPassages.map((passage) => {
            const ref = parsePassageReference(passage);
            return (
              <Pressable
                key={passage}
                onPress={() => {
                  if (ref) router.push(`/read/${ref.bookId}/${ref.chapter}` as any);
                }}
                style={({ pressed }) => [st.passageRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="bookmark-outline" size={14} color="#C9933A" />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {passage}
                </Text>
                {ref && <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />}
              </Pressable>
            );
          })}
        </View>

        {relatedLocations.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="location-outline" size={16} color="#14B8A6" />
              <Text style={[st.cardLabel, { color: "#14B8A6", fontFamily: "Inter_600SemiBold" }]}>
                Related Locations
              </Text>
            </View>
            {relatedLocations.map((loc) => (
              <Pressable
                key={loc!.id}
                onPress={() => router.push({ pathname: `/location/${loc!.id}`, params: { mode: mode || "modern", era: era || "All", overlay: overlay || "tribes", tribe: tribe || tribeData.id } } as any)}
                style={({ pressed }) => [st.passageRow, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="navigate-outline" size={14} color="#14B8A6" />
                <Text style={[st.passageText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {loc!.name}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {tribeData.periods.length > 0 && (
          <View style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={st.cardRow}>
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />
              <Text style={[st.cardLabel, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
                Historical Significance
              </Text>
            </View>
            <View style={st.periodsWrap}>
              {tribeData.periods.map((p) => (
                <View key={p} style={[st.periodBadge, { backgroundColor: tribeData.color + "14", borderColor: tribeData.color + "30" }]}>
                  <Text style={[st.periodText, { color: tribeData.color, fontFamily: "Inter_500Medium" }]}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <RelatedStudiesSection
          keyPassages={tribeData.keyPassages}
          entityName={tribeData.name}
          showHistoricVoices={true}
          showViewOnMap={true}
          mapParams={{ mode: mode || "biblical", era: era || "All", overlay: "tribes", tribe: tribeData.id }}
        />
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: "center" as const, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 12 },
  heroTitle: { fontSize: 26, marginBottom: 8 },
  eraBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  eraBadgeText: { fontSize: 12 },
  card: { marginHorizontal: 20, marginBottom: 14, borderRadius: 14, padding: 16 },
  cardRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 10 },
  cardLabel: { fontSize: 13, letterSpacing: 0.3 },
  descText: { fontSize: 14, lineHeight: 22 },
  passageRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  passageText: { flex: 1, fontSize: 14 },
  periodsWrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  periodBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  periodText: { fontSize: 12 },
  emptyState: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 12 },
  emptyText: { fontSize: 16 },
});
