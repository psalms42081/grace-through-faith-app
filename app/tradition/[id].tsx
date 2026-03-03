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

interface TraditionDetail {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  intro: string;
  existingRoute?: string;
  sampleTopics: { title: string; subtitle: string }[];
}

const TRADITION_DATA: Record<string, TraditionDetail> = {
  adventist: {
    title: "Adventist Studies",
    icon: "school",
    color: "#7C3AED",
    intro: "Explore the 28 Fundamental Beliefs of the Seventh-day Adventist Church. These doctrinal studies cover core Christian teachings as understood within the Adventist tradition, including the Sabbath, the Second Coming, and holistic living.",
    existingRoute: "/sda-studies",
    sampleTopics: [
      { title: "The Holy Scriptures", subtitle: "Belief #1 \u2014 The Bible as the written Word of God" },
      { title: "The Godhead", subtitle: "Beliefs #2\u20134 \u2014 Father, Son, and Holy Spirit" },
      { title: "The Sabbath", subtitle: "Belief #20 \u2014 The seventh-day rest" },
      { title: "The Second Coming", subtitle: "Belief #25 \u2014 Christ\u2019s return in glory" },
    ],
  },
  baptist: {
    title: "Baptist Studies",
    icon: "water",
    color: "#2563EB",
    intro: "Study the distinctive teachings and practices of the Baptist tradition. Baptist theology emphasizes believer\u2019s baptism by immersion, the authority of Scripture, the priesthood of all believers, and the autonomy of the local church.",
    sampleTopics: [
      { title: "Believer\u2019s Baptism", subtitle: "Baptism as a conscious profession of faith" },
      { title: "Soul Liberty", subtitle: "Freedom of conscience in matters of faith" },
      { title: "Congregational Governance", subtitle: "The autonomy of the local church" },
      { title: "The Authority of Scripture", subtitle: "The Bible as the sole rule of faith and practice" },
    ],
  },
  reformed: {
    title: "Reformed Studies",
    icon: "book",
    color: "#0D9488",
    intro: "Explore the Reformed tradition rooted in the 16th-century Protestant Reformation. Reformed theology centers on God\u2019s sovereignty, covenant theology, and the five solas: Scripture alone, faith alone, grace alone, Christ alone, and God\u2019s glory alone.",
    sampleTopics: [
      { title: "The Five Solas", subtitle: "Core principles of the Reformation" },
      { title: "Covenant Theology", subtitle: "God\u2019s covenants as a framework for redemption" },
      { title: "The Sovereignty of God", subtitle: "God\u2019s rule over all creation and salvation" },
      { title: "The Westminster Standards", subtitle: "Historic confessional documents" },
    ],
  },
  catholic: {
    title: "Catholic Studies",
    icon: "fitness",
    color: "#DC2626",
    intro: "Explore the teachings of the Catholic tradition, including sacramental theology, Sacred Tradition, and the Magisterium.",
    sampleTopics: [],
  },
  methodist: {
    title: "Methodist Studies",
    icon: "heart",
    color: "#D97706",
    intro: "Explore the Wesleyan tradition of holiness, prevenient grace, and social witness.",
    sampleTopics: [],
  },
  orthodox: {
    title: "Orthodox Studies",
    icon: "star",
    color: "#9333EA",
    intro: "Explore the Eastern Orthodox tradition of theosis, liturgical worship, and patristic theology.",
    sampleTopics: [],
  },
};

export default function TraditionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const tradition = id ? TRADITION_DATA[id] : null;

  if (!tradition) {
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

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [st.backBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text }]} numberOfLines={1}>{tradition.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.heroSection}>
          <View style={[st.heroIcon, { backgroundColor: tradition.color + "15" }]}>
            <Ionicons name={tradition.icon} size={28} color={tradition.color} />
          </View>
          <Text style={[st.heroTitle, { color: theme.text }]}>{tradition.title}</Text>
          <View style={[st.traditionBadge, { backgroundColor: tradition.color + "18" }]}>
            <Ionicons name="pricetag" size={12} color={tradition.color} />
            <Text style={[st.traditionBadgeText, { color: tradition.color }]}>
              {tradition.title.replace(" Studies", " tradition")}
            </Text>
          </View>
        </View>

        <View style={[st.introCard, { backgroundColor: theme.backgroundCard }]}>
          <Text style={[st.introText, { color: theme.textSecondary }]}>{tradition.intro}</Text>
        </View>

        {tradition.existingRoute && (
          <Pressable
            onPress={() => router.push(tradition.existingRoute as any)}
            style={({ pressed }) => [
              st.existingLink,
              { backgroundColor: tradition.color + "12", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="arrow-forward-circle" size={20} color={tradition.color} />
            <Text style={[st.existingLinkText, { color: tradition.color }]}>
              View full study collection
            </Text>
          </Pressable>
        )}

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <View style={st.topicsSection}>
          <View style={st.topicsHeader}>
            <Ionicons name="list" size={18} color={theme.accent} />
            <Text style={[st.topicsTitle, { color: theme.text }]}>
              {tradition.existingRoute ? "Featured Topics" : "Topics"}
            </Text>
          </View>

          {tradition.sampleTopics.map((topic, i) => (
            <View
              key={i}
              style={[
                st.topicRow,
                { backgroundColor: theme.backgroundCard },
                i < tradition.sampleTopics.length - 1 && st.topicSpacing,
              ]}
            >
              <View style={[st.topicNumber, { backgroundColor: tradition.color + "15" }]}>
                <Text style={[st.topicNumberText, { color: tradition.color }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.topicTitle, { color: theme.text }]}>{topic.title}</Text>
                <Text style={[st.topicSub, { color: theme.textMuted }]}>{topic.subtitle}</Text>
              </View>
              {tradition.existingRoute ? (
                <Ionicons name="checkmark-circle" size={18} color={tradition.color} />
              ) : (
                <View style={[st.pendingDot, { backgroundColor: theme.textMuted + "30" }]} />
              )}
            </View>
          ))}

          {!tradition.existingRoute && (
            <View style={st.lessonsComingSoon}>
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />
              <Text style={[st.lessonsComingSoonText, { color: theme.textMuted }]}>
                Lessons & articles coming soon
              </Text>
            </View>
          )}
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
    marginTop: 20,
    paddingVertical: 12,
  },
  lessonsComingSoonText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
});
