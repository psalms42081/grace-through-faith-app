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

export default function TermsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: theme.textSecondary }]}>Last updated: April 2026</Text>

        <P theme={theme}>
          Welcome to Informed Ministries. By using our application, you agree to these Terms of Service. Please read them carefully. If you do not agree with these terms, please do not use the App.
        </P>

        <Section title="1. Acceptance of Terms" theme={theme}>
          <P theme={theme}>
            By creating an account or using any part of Informed Ministries ("the App"), you agree to be bound by these Terms of Service. These terms apply to all users of the App, including visitors, registered users, and subscribers.
          </P>
        </Section>

        <Section title="2. Use of the App" theme={theme}>
          <P theme={theme}>
            Informed Ministries is a faith-based spiritual formation platform designed to support Bible study, prayer, devotional growth, and community connection within the Seventh-day Adventist tradition. You agree to use the App in a manner consistent with its purpose and in accordance with these terms.
          </P>
          <P theme={theme}>You agree not to:</P>
          <BulletList theme={theme} items={[
            "Use the App for any unlawful or harmful purpose",
            "Attempt to gain unauthorised access to other accounts or systems",
            "Upload or share content that is offensive, abusive, or contrary to the spirit of the App",
            "Use automated tools to scrape, harvest, or extract data from the App",
            "Interfere with the proper functioning of the App or its infrastructure",
          ]} />
        </Section>

        <Section title="3. Account Registration" theme={theme}>
          <P theme={theme}>
            To access certain features, you may need to create an account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You agree to provide accurate information when registering and to keep your account details up to date.
          </P>
          <P theme={theme}>
            You may delete your account at any time by contacting us. Upon deletion, your personal data will be removed within 30 days in accordance with our Privacy Policy.
          </P>
        </Section>

        <Section title="4. Premium Subscriptions and Billing" theme={theme}>
          <P theme={theme}>
            Informed Ministries offers optional premium features through paid subscriptions. By subscribing, you agree to the pricing and payment terms presented at the time of purchase.
          </P>
          <BulletList theme={theme} items={[
            "Subscriptions renew automatically unless cancelled before the renewal date",
            "You may cancel your subscription at any time through your account settings or app store",
            "Refunds are handled in accordance with the policies of the App Store or Google Play Store through which you subscribed",
            "We reserve the right to change subscription pricing with reasonable notice",
          ]} />
          <P theme={theme}>
            Church and organisation subscriptions are billed directly and governed by separate licensing agreements.
          </P>
        </Section>

        <Section title="5. User Content" theme={theme}>
          <P theme={theme}>
            You may create content within the App, including prayer journal entries, notes, highlights, and study responses. You retain ownership of the content you create. By using the App, you grant us a limited licence to store and display your content within the App solely for the purpose of providing the service to you.
          </P>
          <P theme={theme}>
            We do not access, share, or use your personal content (such as prayer entries) for any purpose other than delivering the App's features. Content shared in community features such as prayer walls or group discussions may be visible to other members of those groups.
          </P>
        </Section>

        <Section title="6. Intellectual Property" theme={theme}>
          <P theme={theme}>
            All content, design, code, and materials within Informed Ministries — including but not limited to study guides, devotional content, video productions, artwork, and the App's interface — are the intellectual property of Informed Ministries or its licensors.
          </P>
          <P theme={theme}>
            Scripture quotations are provided under licence or from public domain translations. Ellen G. White writings are sourced through the official White Estate API and remain the property of the Ellen G. White Estate.
          </P>
          <P theme={theme}>
            You may not copy, reproduce, distribute, or create derivative works from any part of the App without prior written permission.
          </P>
        </Section>

        <Section title="7. Disclaimer of Warranties" theme={theme}>
          <P theme={theme}>
            Informed Ministries is provided on an "as is" and "as available" basis. While we strive to keep the App reliable and accurate, we make no warranties — express or implied — regarding the completeness, accuracy, or availability of the App or its content.
          </P>
          <P theme={theme}>
            The App provides spiritual resources and educational content. It is not a substitute for professional counselling, medical advice, or pastoral care. If you are in crisis, please reach out to a trusted pastor, counsellor, or emergency service.
          </P>
        </Section>

        <Section title="8. Limitation of Liability" theme={theme}>
          <P theme={theme}>
            To the fullest extent permitted by law, Informed Ministries and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App. This includes, but is not limited to, loss of data, interruption of service, or reliance on any content provided through the App.
          </P>
        </Section>

        <Section title="9. Changes to Terms" theme={theme}>
          <P theme={theme}>
            We may update these Terms of Service from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of the App after any changes constitutes your acceptance of the revised terms. We encourage you to review these terms periodically.
          </P>
        </Section>

        <Section title="10. Contact Information" theme={theme}>
          <P theme={theme}>
            If you have any questions about these Terms of Service, please contact us at joseph@gracethroughfaith.app.
          </P>
          <P theme={theme}>
            Informed Ministries{"\n"}
            gracethroughfaith.app
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
