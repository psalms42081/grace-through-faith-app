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

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <View style={[st.traditionsCard, { backgroundColor: theme.backgroundCard }]}>
          <View style={st.traditionsHeader}>
            <Ionicons name="library" size={18} color={theme.accent} />
            <Text style={[st.traditionsTitle, { color: theme.text }]}>Available Collections</Text>
          </View>

          <Pressable
            onPress={() => router.push("/sda-studies" as any)}
            style={({ pressed }) => [
              st.traditionRow,
              { borderBottomColor: theme.divider, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[st.traditionIcon, { backgroundColor: "rgba(124,58,237,0.12)" }]}>
              <Ionicons name="school" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.traditionName, { color: theme.text }]}>28 Fundamental Beliefs</Text>
              <Text style={[st.traditionLabel, { color: theme.textMuted }]}>
                Seventh-day Adventist tradition
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/study?tab=voices" as any)}
            style={({ pressed }) => [
              st.traditionRow,
              { borderBottomWidth: 0, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[st.traditionIcon, { backgroundColor: "rgba(59,108,181,0.12)" }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#3B6CB5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.traditionName, { color: theme.text }]}>Historic Voices</Text>
              <Text style={[st.traditionLabel, { color: theme.textMuted }]}>
                Commentary from Matthew Henry, Adam Clarke, John Gill & more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={st.comingSoon}>
          <Ionicons name="hourglass-outline" size={16} color={theme.textMuted} />
          <Text style={[st.comingSoonText, { color: theme.textMuted }]}>
            More traditions coming soon
          </Text>
        </View>

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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 24,
    opacity: 0.6,
  },
  traditionsCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
  },
  traditionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  traditionsTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  traditionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  traditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  traditionName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  traditionLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  comingSoon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
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
