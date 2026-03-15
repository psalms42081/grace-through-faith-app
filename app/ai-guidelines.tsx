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
            Grace through Faith uses artificial intelligence as a tool to support spiritual growth, never to replace Scripture, pastoral guidance, or the Holy Spirit's leading. Our approach is guided by the Seventh-day Adventist Church's principles for responsible AI use.
          </Text>
        </View>

        <GuidelineSection
          icon="book"
          iconColor="#4A90D9"
          title="Scripture First"
          points={[
            "AI never replaces or reinterprets the Bible. All generated content is rooted in Scripture and presented as a study aid.",
            "Every AI-assisted insight points back to the biblical text. We encourage you to read the Word yourself.",
            "AI content is clearly labeled so you always know what is generated versus curated by people.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="shield-checkmark"
          iconColor="#4CAF50"
          title="Theological Integrity"
          points={[
            "All AI outputs are constrained by SDA doctrinal boundaries including the Sabbath, state of the dead, the Second Coming, and the health message.",
            "Content that conflicts with fundamental Adventist beliefs is filtered at the prompt level before it ever reaches you.",
            "Study resources reference Ellen G. White's writings topically while maintaining a Scripture-first approach.",
            "AI never presents speculative theology as settled doctrine.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="eye"
          iconColor="#E8A838"
          title="Transparency"
          points={[
            "AI-assisted content is always labeled with a sparkle icon so you can distinguish it from human-curated material.",
            "We are open about what AI can and cannot do. It is a tool, not a teacher.",
            "The AI does not know you personally. Its responses are general and should not replace relationship with your pastor, church family, or prayer life.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="people"
          iconColor="#7B61FF"
          title="Human Connection"
          points={[
            "AI should complement, not replace, human discipleship and fellowship.",
            "We encourage discussing study insights with your small group, family, or pastor.",
            "Kids Mode features like Dinner Table Topics are designed to bring families together around what children have learned.",
            "The app encourages church attendance and community participation.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="lock-closed"
          iconColor="#E8456B"
          title="Privacy & Safety"
          points={[
            "We do not train AI models on your personal data, prayers, or journal entries.",
            "Kids Mode content undergoes additional safety review for age-appropriateness.",
            "Parent controls (PIN protection) keep children within safe content boundaries.",
            "No personal data is shared with third-party AI providers beyond what is needed to generate content.",
          ]}
          theme={theme}
        />

        <GuidelineSection
          icon="warning"
          iconColor="#FF6B35"
          title="Limitations"
          points={[
            "AI may occasionally produce imprecise or imperfect responses. Always verify against Scripture.",
            "AI-generated content is not reviewed by your local church or conference and does not constitute official church teaching.",
            "If you encounter content that seems inconsistent with SDA beliefs, please report it through the app's feedback system.",
            "AI cannot replace the conviction and guidance of the Holy Spirit.",
          ]}
          theme={theme}
        />

        <View style={[st.sadSection, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
          <Text style={[st.sadTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Aligned with SDA Guidelines
          </Text>
          <Text style={[st.sadBody, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Our approach to AI follows the principles outlined by the Seventh-day Adventist Church for responsible technology use: prioritizing transparency, ethical responsibility, security, and ensuring technology serves the church's mission of sharing the everlasting gospel.
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
