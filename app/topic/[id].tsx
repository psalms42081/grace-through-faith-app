import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { getSpeakerColor, getSpeakerInitials } from "@/constants/speakers";
import { TOPICS } from "@/data/topics";

const MEDIA_TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  sermon: "mic",
  tv: "tv",
  teaching: "school",
  music: "musical-notes",
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  sermon: "Sermon",
  tv: "Watch",
  teaching: "Teaching",
  music: "Music",
};

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const topic = TOPICS[id ?? ""] ?? TOPICS.love;

  const shuffledMedia = useMemo(() => {
    const items = [...topic.media];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [id]);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen options={{ title: "", headerStyle: { backgroundColor: theme.background }, headerShadowVisible: false, headerTintColor: theme.text }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
        testID="topic-screen"
      >
        <LinearGradient
          colors={topic.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons name={topic.icon} size={40} color="rgba(255,255,255,0.9)" testID="topic-hero-icon" />
          <Text style={[styles.heroTitle, { fontFamily: "Lora_700Bold" }]}>{topic.title}</Text>
          <Text style={[styles.heroDesc, { fontFamily: "Inter_400Regular" }]}>{topic.description}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>{topic.verses.length} Verses</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={[styles.heroBadgeText, { fontFamily: "Inter_600SemiBold" }]}>{topic.media.length} Media</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.versesSection}>
          <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Scripture
          </Text>
          {topic.verses.map((v, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/read/${v.bookId}/${v.chapter}`)}
              style={({ pressed }) => [
                styles.verseCard,
                { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
              ]}
              testID={`verse-card-${i}`}
            >
              <View style={styles.verseCardHeader}>
                <View style={[styles.verseRefBadge, { backgroundColor: topic.gradient[0] + "18" }]}>
                  <Text style={[styles.verseRef, { color: topic.gradient[0], fontFamily: "Inter_700Bold" }]}>{v.reference}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
              <Text style={[styles.verseText, { color: theme.text, fontFamily: "Lora_400Regular" }]} numberOfLines={4}>
                {v.text}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.mediaSection}>
          <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Lora_700Bold" }]}>
            Sermons & Teaching
          </Text>
          <Text style={[styles.sectionSubLabel, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]}>
            From today's most-loved pastors and worship artists
          </Text>

          {shuffledMedia.map((item, idx) => {
            const avatarColor = getSpeakerColor(item.source);
            const avatarInitials = getSpeakerInitials(item.source);
            return (
              <Pressable
                key={idx}
                onPress={() => openLink(item.url)}
                style={({ pressed }) => [
                  styles.mediaCard,
                  { backgroundColor: isDark ? theme.backgroundCard : "#FFFDF6", opacity: pressed ? 0.8 : 1 },
                ]}
                testID={`media-card-${idx}`}
              >
                <View style={[styles.speakerAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={[styles.speakerInitials, { fontFamily: "Inter_700Bold" }]}>{avatarInitials}</Text>
                </View>
                <View style={styles.mediaInfo}>
                  <View style={styles.mediaTopRow}>
                    <Text style={[styles.mediaTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.mediaTypeBadge, { backgroundColor: topic.gradient[0] + "18" }]}>
                      <Text style={[styles.mediaTypeText, { color: topic.gradient[0], fontFamily: "Inter_600SemiBold" }]}>
                        {MEDIA_TYPE_LABEL[item.type] || item.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.mediaSource, { color: theme.accent, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {item.source}
                  </Text>
                  <Text style={[styles.mediaDesc, { color: theme.textMuted, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={theme.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  heroTitle: { color: "#fff", fontSize: 32 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22, textAlign: "center" },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroBadgeText: { color: "#fff", fontSize: 12 },
  versesSection: {
    paddingHorizontal: 22,
    paddingTop: 24,
    gap: 12,
  },
  sectionLabel: { fontSize: 22, marginBottom: 4 },
  sectionSubLabel: { fontSize: 13, marginBottom: 8, marginTop: -4 },
  verseCard: {
    borderRadius: 18,
    padding: 18,
  },
  verseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  verseRefBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verseRef: { fontSize: 13 },
  verseText: { fontSize: 16, lineHeight: 26 },
  mediaSection: {
    paddingHorizontal: 22,
    paddingTop: 28,
    gap: 10,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  speakerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  speakerInitials: {
    color: "#fff",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  mediaInfo: { flex: 1, gap: 2 },
  mediaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaTitle: { fontSize: 15, flex: 1 },
  mediaTypeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediaTypeText: { fontSize: 10 },
  mediaSource: { fontSize: 12 },
  mediaDesc: { fontSize: 11, lineHeight: 16 },
});
