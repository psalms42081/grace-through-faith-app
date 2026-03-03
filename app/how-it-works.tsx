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

const SECTIONS = [
  {
    icon: "book" as const,
    color: "#C9933A",
    title: "Bible-Centered Study",
    body: "Read Scripture in multiple translations with Strong\u2019s concordance, word studies, and cross-references. Every tool is designed to take you deeper into the text.",
  },
  {
    icon: "layers" as const,
    color: "#5B86E5",
    title: "4-Layer Study Model",
    body: "Each passage can be explored through four lenses: Observation, Interpretation, Application, and Reflection\u2014a proven method for thorough, personal Bible study.",
  },
  {
    icon: "chatbubbles" as const,
    color: "#8B5CF6",
    title: "Socratic AI Guide",
    body: "Our AI guide asks thoughtful questions to help you think critically about Scripture. It doesn\u2019t tell you what to believe\u2014it helps you discover insights on your own.",
  },
  {
    icon: "people" as const,
    color: "#10B981",
    title: "Family & Community",
    body: "Track progress as a family, join prayer groups, and encourage one another. Faith grows best in community.",
  },
  {
    icon: "happy" as const,
    color: "#F59E0B",
    title: "Kids Club",
    body: "Age-appropriate Bible stories with interactive scenes, illustrations, and guided questions\u2014designed to make Scripture come alive for young readers.",
  },
];

export default function HowItWorksScreen() {
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
        <Text style={[st.headerTitle, { color: theme.text }]}>How This App Works</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section, i) => (
          <View key={i} style={[st.card, { backgroundColor: theme.backgroundCard }]}>
            <View style={[st.iconWrap, { backgroundColor: section.color + "15" }]}>
              <Ionicons name={section.icon} size={22} color={section.color} />
            </View>
            <Text style={[st.cardTitle, { color: theme.text }]}>{section.title}</Text>
            <Text style={[st.cardBody, { color: theme.textSecondary }]}>{section.body}</Text>
          </View>
        ))}

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <View style={st.approachSection}>
          <View style={[st.approachIconWrap, { backgroundColor: "rgba(201,147,58,0.12)" }]}>
            <Ionicons name="compass" size={24} color="#C9933A" />
          </View>
          <Text style={[st.approachTitle, { color: theme.text }]}>Our Approach</Text>
          <Text style={[st.approachBody, { color: theme.textSecondary }]}>
            This app is Bible-centered and designed for structured spiritual growth. It includes resources from multiple Christian traditions, presented respectfully and transparently. Our goal is formation and deeper study{"\u2014"}not promoting one denomination over another.
          </Text>
        </View>

        <View style={[st.divider, { backgroundColor: theme.divider }]} />

        <Pressable
          onPress={() => router.push("/christian-traditions" as any)}
          style={({ pressed }) => [
            st.linkCard,
            { backgroundColor: theme.backgroundCard, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[st.linkIcon, { backgroundColor: "rgba(59,108,181,0.12)" }]}>
            <Ionicons name="globe" size={20} color="#5B86E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.linkTitle, { color: theme.text }]}>Christian Traditions</Text>
            <Text style={[st.linkSub, { color: theme.textMuted }]}>
              Explore perspectives from different traditions
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
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
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  cardBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 28,
    opacity: 0.6,
  },
  approachSection: {
    marginHorizontal: 20,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  approachIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  approachTitle: {
    fontSize: 20,
    fontFamily: "Lora_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  approachBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  linkIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  linkSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
