import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children, theme }: { children: React.ReactNode; theme: any }) {
  return <Text style={[styles.paragraph, { color: theme.textSecondary }]}>{children}</Text>;
}

function BulletList({ items, theme }: { items: string[]; theme: any }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: theme.textSecondary }]}>{"\u2022"}</Text>
          <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PrivacyScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: theme.textSecondary }]}>Last updated: March 27, 2026</Text>

        <P theme={theme}>
          Grace Through Faith ("the App") is a faith-based mobile application designed to support spiritual growth through Bible study, devotional plans, prayer journaling, and evangelism video content. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
        </P>

        <Section title="1. Information We Collect" theme={theme}>
          <P theme={theme}>
            <Text style={{ fontWeight: "600" as const, color: theme.text }}>Account Information. </Text>
            When you create an account, we collect your name, email address, and a securely hashed password. We never store passwords in plain text.
          </P>
          <P theme={theme}>
            <Text style={{ fontWeight: "600" as const, color: theme.text }}>Usage Data. </Text>
            We collect information about how you use the App, including Bible reading progress, completed devotionals, study activity, and feature interactions. This data is used to personalise your experience.
          </P>
          <P theme={theme}>
            <Text style={{ fontWeight: "600" as const, color: theme.text }}>Prayer and Journal Entries. </Text>
            If you use the prayer journal feature, your entries are stored in our database and associated with your account. These are private to you and are never shared with other users or third parties.
          </P>
          <P theme={theme}>
            <Text style={{ fontWeight: "600" as const, color: theme.text }}>Device Information. </Text>
            We may collect basic device information such as platform (iOS or Android) and language preferences to optimise the App experience.
          </P>
        </Section>

        <Section title="2. How We Use Your Information" theme={theme}>
          <BulletList theme={theme} items={[
            "To create and manage your account",
            "To personalise content recommendations and study paths",
            "To track your reading and study progress",
            "To generate AI-powered study content tailored to your interests",
            "To improve the App and fix issues",
          ]} />
        </Section>

        <Section title="3. AI-Generated Content" theme={theme}>
          <P theme={theme}>
            The App uses artificial intelligence (OpenAI) to generate Bible study content, discussion questions, and evangelism video scripts. Your personal data is not sent to AI services. AI is used only to create general spiritual content based on Scripture topics and themes.
          </P>
        </Section>

        <Section title="4. Third-Party Services" theme={theme}>
          <P theme={theme}>We use the following third-party services:</P>
          <BulletList theme={theme} items={[
            "Cloudinary — for hosting evangelism video content",
            "OpenAI — for generating study and devotional content",
            "HeyGen — for creating avatar-based evangelism videos",
            "Replit — for hosting the App and database",
          ]} />
          <P theme={theme}>
            These services process data on our behalf and are subject to their own privacy policies.
          </P>
        </Section>

        <Section title="5. Data Storage and Security" theme={theme}>
          <P theme={theme}>Your data is stored in a PostgreSQL database hosted on Replit. We use industry-standard security practices including:</P>
          <BulletList theme={theme} items={[
            "Encrypted passwords using bcrypt hashing",
            "JWT-based authentication with secure token handling",
            "HTTPS encryption for all data in transit",
            "Rate limiting on authentication endpoints",
            "Content Security Policy headers",
          ]} />
        </Section>

        <Section title="6. Data Retention" theme={theme}>
          <P theme={theme}>
            We retain your account data and activity history for as long as your account is active. If you wish to delete your account and all associated data, please contact us and we will process your request within 30 days.
          </P>
        </Section>

        <Section title="7. Children's Privacy" theme={theme}>
          <P theme={theme}>
            The App includes a Kids section with Bible stories and learning content. We do not knowingly collect personal information from children under 13 without parental consent. The Kids section does not require a separate account and operates under the parent's account.
          </P>
        </Section>

        <Section title="8. Your Rights" theme={theme}>
          <P theme={theme}>You have the right to:</P>
          <BulletList theme={theme} items={[
            "Access the personal data we hold about you",
            "Request correction of inaccurate data",
            "Request deletion of your account and data",
            "Withdraw consent for data processing",
          ]} />
        </Section>

        <Section title="9. Changes to This Policy" theme={theme}>
          <P theme={theme}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the App. Continued use of the App after changes constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="10. Contact" theme={theme}>
          <P theme={theme}>
            If you have questions about this Privacy Policy or your data, please contact us at joseph@gracethroughfaith.app.
          </P>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  updated: {
    fontSize: 13,
    marginBottom: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    marginRight: 10,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
});
