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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getCollectionById, getContentLabel } from "@/constants/traditions";
import TraditionDisclaimer from "@/components/TraditionDisclaimer";

export default function TraditionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const collection = id ? getCollectionById(id) : undefined;

  if (!collection) {
    return (
      <View style={[st.container, { backgroundColor: theme.background, paddingTop: topPad + 12 }]}>
        <View style={st.header}>
          <Pressable onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[st.headerTitle, { color: theme.text }]}>Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[st.emptyText, { color: theme.textMuted }]}>This collection is not available yet.</Text>
        </View>
      </View>
    );
  }

  const label = getContentLabel(collection.traditionKey);

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.backBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text }]} numberOfLines={1}>{collection.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.heroSection}>
          <View style={[st.heroIcon, { backgroundColor: collection.color + "15" }]}>
            <Ionicons name={collection.icon as any} size={28} color={collection.color} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text }]}>{collection.title}</Text>
          <View style={[st.traditionBadge, { backgroundColor: collection.color + "18" }]}>
            <Ionicons name="pricetag" size={12} color={collection.color} />
            <Text style={[st.traditionBadgeText, { color: collection.color }]}>
              {label}
            </Text>
          </View>
        </View>

        <TraditionDisclaimer traditionKey={collection.traditionKey} color={collection.color} />

        <View style={[st.introCard, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[st.introText, { color: theme.textSecondary }]}>{collection.description}</Text>
        </View>

        {collection.existingRoute && (
          <Pressable
            onPress={() => router.push(collection.existingRoute as any)}
            style={({ pressed }) => [
              st.existingLink,
              { backgroundColor: collection.color + "12", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="arrow-forward-circle" size={20} color={collection.color} />
            <Text style={[st.existingLinkText, { color: collection.color }]}>
              View full study collection
            </Text>
          </Pressable>
        )}

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        {collection.sampleTopics.length > 0 && (
          <View style={st.topicsSection}>
            <View style={st.topicsHeader}>
              <Ionicons name="list" size={18} color={theme.accent} />
              <Text style={[st.topicsTitle, { color: theme.text }]}>
                {collection.existingRoute ? "Featured Topics" : "Topics"}
              </Text>
            </View>

            {collection.sampleTopics.map((topic, i) => (
              <View
                key={i}
                style={[
                  st.topicRow,
                  { backgroundColor: theme.backgroundCard },
                  i < collection.sampleTopics.length - 1 && st.topicSpacing,
                ]}
              >
                <View style={[st.topicNumber, { backgroundColor: collection.color + "15" }]}>
                  <Text style={[st.topicNumberText, { color: collection.color }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.topicTitle, { color: theme.text }]}>{topic.title}</Text>
                  <Text style={[st.topicSub, { color: theme.textMuted }]}>{topic.subtitle}</Text>
                </View>
                {collection.existingRoute ? (
                  <Ionicons name="checkmark-circle" size={18} color={collection.color} />
                ) : (
                  <View style={[st.pendingDot, { backgroundColor: theme.textMuted + "30" }]} />
                )}
              </View>
            ))}
          </View>
        )}

        {!collection.existingRoute && (
          <View style={st.lessonsComingSoon}>
            <Ionicons name="time-outline" size={16} color={theme.textMuted} />
            <Text style={[st.lessonsComingSoonText, { color: theme.textMuted }]}>
              Lessons & articles coming soon
            </Text>
          </View>
        )}
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
    flex: 1,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Lora_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  traditionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  traditionBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  introCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  introText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  existingLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  existingLinkText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 24,
    opacity: 0.6,
  },
  topicsSection: {
    paddingHorizontal: 20,
  },
  topicsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  topicsTitle: {
    fontSize: 18,
    fontFamily: "Lora_700Bold",
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  topicSpacing: {
    marginBottom: 8,
  },
  topicNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topicNumberText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  topicTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  topicSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  pendingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  lessonsComingSoon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 12,
  },
  lessonsComingSoonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
});
