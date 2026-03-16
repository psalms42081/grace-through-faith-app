import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface GuidelineSectionProps {
  icon: string;
  iconColor: string;
  title: string;
  points: string[];
  theme: any;
}

function GuidelineSection({ icon, iconColor, title, points, theme }: GuidelineSectionProps) {
  return (
    <View style={[st.section, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={st.sectionHeader}>
        <View style={[st.iconCircle, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={[st.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {title}
        </Text>
      </View>
      {points.map((point, i) => (
        <View key={i} style={st.pointRow}>
          <View style={[st.bullet, { backgroundColor: iconColor + "40" }]} />
          <Text style={[st.pointText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {point}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AIGuidelinesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[st.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[st.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
          AI Use & Ethics
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[st.introCard, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "25" }]}>
          <Ionicons name="sparkles" size={24} color={theme.accent} />
          <Text style={[st.introTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Our Commitment to Ethical AI
          </Text>
          <Text style={[st.introBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            AI supports spiritual growth here, never replacing Scripture, pastoral guidance, or the Holy Spirit's leading.
          </Text>
        </View>

        <GuidelineSection
          icon="book"
          iconColor="#4A90D9"
          title="Scripture First"
          points={[
            "AI never replaces the Bible. All generated content is a study aid rooted in Scripture.",
            "AI content is clearly labeled so you always know what is generated versus human-curated.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="shield-checkmark"
          iconColor="#4CAF50"
          title="Theological Integrity"
          points={[
            "AI outputs are constrained by SDA doctrinal boundaries including the Sabbath, state of the dead, and the Second Coming.",
            "Content conflicting with fundamental Adventist beliefs is filtered before it reaches you.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="eye"
          iconColor="#E8A838"
          title="Transparency"
          points={[
            "AI-assisted content is marked with a sparkle icon so you can distinguish it from curated material.",
            "AI is a tool, not a teacher. Its responses should not replace your pastor, church family, or prayer life.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="people"
          iconColor="#7B61FF"
          title="Human Connection"
          points={[
            "AI complements human discipleship. We encourage discussing insights with your small group or pastor.",
            "Kids features like Dinner Table Topics bring families together around Scripture.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="lock-closed"
          iconColor="#E8456B"
          title="Privacy & Safety"
          points={[
            "We do not train AI models on your personal data, prayers, or journal entries.",
            "Kids Mode has additional safety review. Parent controls keep children within safe boundaries.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="warning"
          iconColor="#FF6B35"
          title="Limitations"
          points={[
            "AI may produce imprecise responses. Always verify against Scripture.",
            "AI content is not official church teaching. Report concerns through the feedback system.",
          ]}
          theme={theme}
        />

        <View style={[st.sadSection, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[st.sadTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Aligned with SDA Guidelines
          </Text>
          <Text style={[st.sadBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Our AI approach follows SDA principles: transparency, ethical responsibility, and ensuring technology serves the gospel mission.
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 17,
    textAlign: "center",
  },
  introBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    flex: 1,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  pointText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  sadSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  sadTitle: {
    fontSize: 15,
    marginBottom: 8,
  },
  sadBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
