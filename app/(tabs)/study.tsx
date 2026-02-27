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

type Tab = "word" | "context" | "voices" | "application";

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "word", label: "Word Study", icon: "language-outline" },
  { id: "context", label: "Context", icon: "time-outline" },
  { id: "voices", label: "Historic Voices", icon: "chatbubble-ellipses-outline" },
  { id: "application", label: "Application", icon: "heart-outline" },
];

const COMMENTATORS = [
  { name: "Matthew Henry", dates: "1662–1714", tradition: "Reformed" },
  { name: "Jamieson, Fausset & Brown", dates: "1871", tradition: "Presbyterian" },
  { name: "Adam Clarke", dates: "1762–1832", tradition: "Wesleyan" },
  { name: "John Gill", dates: "1697–1771", tradition: "Baptist" },
];

export default function StudyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("word");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          Study Tools
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Deep dive into Scripture
        </Text>
      </View>

      {/* Tab Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabScroll, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.tabContainer}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: isActive ? theme.accent : theme.backgroundSecondary,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? "#fff" : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? "#fff" : theme.textSecondary,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {activeTab === "word" && (
          <WordStudyTab theme={theme} />
        )}
        {activeTab === "context" && (
          <ContextTab theme={theme} />
        )}
        {activeTab === "voices" && (
          <HistoricVoicesTab theme={theme} commentators={COMMENTATORS} />
        )}
        {activeTab === "application" && (
          <ApplicationTab theme={theme} />
        )}
      </ScrollView>
    </View>
  );
}

function WordStudyTab({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.tabContent}>
      <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="language" size={28} color={theme.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
          Original Language Tools
        </Text>
        <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Tap any word in a verse to see its original Hebrew or Greek meaning via Strong's Concordance. Available after Milestone 5.
        </Text>
      </View>
      <Text style={[styles.previewLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        How it works
      </Text>
      {[
        { step: "1", text: "Open any passage in the Read tab" },
        { step: "2", text: "Tap a verse to open the study drawer" },
        { step: "3", text: "Select the Word Study tab in the drawer" },
        { step: "4", text: "Tap any word to see its Strong's entry" },
      ].map((item) => (
        <View key={item.step} style={[styles.stepRow, { borderColor: theme.border }]}>
          <View style={[styles.stepBadge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.stepNum, { fontFamily: "Inter_700Bold" }]}>{item.step}</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ContextTab({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.tabContent}>
      <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "18" }]}>
          <Ionicons name="time" size={28} color={theme.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
          Historical Context
        </Text>
        <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
          Each passage includes historical background, cultural notes, author information, and thematic overview. Available in Milestone 4.
        </Text>
      </View>
    </View>
  );
}

function HistoricVoicesTab({ theme, commentators }: { theme: typeof Colors.light; commentators: { name: string; dates: string; tradition: string }[] }) {
  return (
    <View style={styles.tabContent}>
      <Text style={[styles.previewLabel, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        Featured Commentators
      </Text>
      {commentators.map((c) => (
        <View
          key={c.name}
          style={[styles.commentatorCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={20} color={Colors.light.accent} />
          </View>
          <View style={styles.commentatorInfo}>
            <Text style={[styles.commentatorName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {c.name}
            </Text>
            <Text style={[styles.commentatorMeta, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {c.dates} · {c.tradition}
            </Text>
          </View>
          <View style={[styles.pdBadge, { backgroundColor: theme.success + "22" }]}>
            <Text style={[styles.pdText, { color: theme.success, fontFamily: "Inter_600SemiBold" }]}>
              Public Domain
            </Text>
          </View>
        </View>
      ))}
      <View style={[styles.emptyBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border, marginTop: 16 }]}>
        <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" }]}>
          Commentary text loads per passage in the Bible Reader. Available in Milestone 5.
        </Text>
      </View>
    </View>
  );
}

function ApplicationTab({ theme }: { theme: typeof Colors.light }) {
  return (
    <View style={styles.tabContent}>
      <View style={[styles.appLayer, { backgroundColor: theme.primary }]}>
        <Text style={[styles.appLayerTitle, { fontFamily: "Lora_600SemiBold" }]}>
          The 4-Layer Study Model
        </Text>
        <Text style={[styles.appLayerSub, { fontFamily: "Inter_400Regular" }]}>
          Every passage is presented with progressive depth — from the raw text to your personal application.
        </Text>
      </View>
      {[
        { layer: "Layer 1", name: "Text", desc: "KJV scripture, cross references, word study", icon: "book" as const },
        { layer: "Layer 2", name: "Context", desc: "Historical notes, geography, timeline anchors", icon: "map" as const },
        { layer: "Layer 3", name: "Historic Voices", desc: "Classic commentary from the Church Fathers", icon: "chatbubble-ellipses" as const },
        { layer: "Layer 4", name: "Application", desc: "Then/Now, reflection, prayer, journaling", icon: "heart" as const },
      ].map((layer) => (
        <View key={layer.layer} style={[styles.layerRow, { borderColor: theme.border }]}>
          <View style={[styles.layerIcon, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name={layer.icon} size={18} color={theme.accent} />
          </View>
          <View style={styles.layerText}>
            <Text style={[styles.layerNum, { color: theme.textMuted, fontFamily: "Inter_500Medium" }]}>
              {layer.layer}
            </Text>
            <Text style={[styles.layerName, { color: theme.text, fontFamily: "Lora_600SemiBold" }]}>
              {layer.name}
            </Text>
            <Text style={[styles.layerDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
              {layer.desc}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, marginBottom: 2 },
  subtitle: { fontSize: 14 },
  tabScroll: { flexGrow: 0 },
  tabContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabLabel: { fontSize: 13 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  tabContent: { gap: 12 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  previewLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  commentatorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  commentatorInfo: { flex: 1 },
  commentatorName: { fontSize: 15, marginBottom: 2 },
  commentatorMeta: { fontSize: 12 },
  pdBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pdText: { fontSize: 10 },
  appLayer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  appLayerTitle: { color: "#EDE5D5", fontSize: 17, marginBottom: 8 },
  appLayerSub: { color: "rgba(237,229,213,0.7)", fontSize: 13, lineHeight: 20 },
  layerRow: {
    flexDirection: "row",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  layerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  layerText: { flex: 1 },
  layerNum: { fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  layerName: { fontSize: 16, marginBottom: 3 },
  layerDesc: { fontSize: 13, lineHeight: 19 },
});
