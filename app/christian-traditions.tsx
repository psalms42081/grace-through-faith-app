import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { COLLECTIONS, getContentLabel } from "@/constants/traditions";

export default function ChristianTraditionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.backBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text }]}>Christian Traditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.heroSection}>
          <View style={[st.heroIcon, { backgroundColor: "rgba(59,108,181,0.12)" }]}>
            <Ionicons name="globe" size={28} color="#5B86E5" />
          </View>
          <Text style={[st.heroTitle, { color: theme.text }]}>
            Christian Traditions
          </Text>
          <Text style={[st.heroBody, { color: theme.textSecondary }]}>
            Explore teachings and perspectives from different Christian traditions. Each collection is labeled so you can study Scripture thoughtfully and compare perspectives with clarity and respect.
          </Text>
        </View>

        <View style={st.comingSoonBanner}>
          <Ionicons name="hourglass-outline" size={14} color={theme.textMuted} />
          <Text style={[st.comingSoonBannerText, { color: theme.textMuted }]}>
            More traditions coming soon
          </Text>
        </View>

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        {COLLECTIONS.map((collection, i) => {
          const isLast = i === COLLECTIONS.length - 1;
          const label = getContentLabel(collection.traditionKey);

          if (collection.isEnabled) {
            return (
              <Pressable
                key={collection.id}
                onPress={() => router.push(`/tradition/${collection.id}` as any)}
                style={({ pressed }) => [
                  st.collectionCard,
                  { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
                  !isLast && st.collectionSpacing,
                ]}
                testID={`tradition-${collection.id}`}
              >
                <View style={[st.collectionIcon, { backgroundColor: collection.color + "15" }]}>
                  <Ionicons name={collection.icon as any} size={22} color={collection.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={st.titleRow}>
                    <Text style={[st.collectionTitle, { color: theme.text }]}>{collection.title}</Text>
                    <View style={[st.labelBadge, { backgroundColor: collection.color + "15" }]}>
                      <Text style={[st.labelBadgeText, { color: collection.color }]}>{label}</Text>
                    </View>
                  </View>
                  <Text style={[st.collectionSub, { color: theme.textMuted }]}>{collection.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            );
          }
          return (
            <View
              key={collection.id}
              style={[
                st.collectionCard,
                { backgroundColor: theme.backgroundCard, opacity: 0.5 },
                !isLast && st.collectionSpacing,
              ]}
            >
              <View style={[st.collectionIcon, { backgroundColor: collection.color + "10" }]}>
                <Ionicons name={collection.icon as any} size={22} color={collection.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.collectionTitle, { color: theme.text }]}>{collection.title}</Text>
                <Text style={[st.collectionSub, { color: theme.textMuted }]}>{collection.subtitle}</Text>
              </View>
              <View style={[st.comingSoonBadge, { backgroundColor: theme.textMuted + "18" }]}>
                <Text style={[st.comingSoonBadgeText, { color: theme.textMuted }]}>Coming soon</Text>
              </View>
            </View>
          );
        })}

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <View style={[st.labelingCard, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.labelingHeader}>
            <Ionicons name="pricetag" size={18} color="#C9933A" />
            <Text style={[st.labelingTitle, { color: theme.text }]}>Content Labeling</Text>
          </View>
          <Text style={[st.labelingBody, { color: theme.textSecondary }]}>
            When content reflects a specific tradition, it will be labeled as such.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
  },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 4,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  heroBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    textAlign: "center",
  },
  comingSoonBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  comingSoonBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 24,
    opacity: 0.6,
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  collectionSpacing: {
    marginBottom: 10,
  },
  collectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  collectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  labelBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  labelBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  collectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  comingSoonBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  labelingCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
  },
  labelingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  labelingTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  labelingBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
});
