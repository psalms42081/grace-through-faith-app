import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { PathB } from "@/constants/colors";
import { withDeviceTimeZone } from "@/lib/device-time-zone";

const INK_MUTED = "#6B6660";

interface OdbDevotional {
  id: number;
  title: string;
  date: string;
  author: string;
  verse: string;
  verseRef: string;
  passage: string;
  content: string;
  thought: string;
  response: string;
  insights: string;
  insightsAuthor: string;
  bibleInAYear: string;
  url: string;
  imageUrl: string | null;
}

export default function OdbDevotionalScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const postId = params.id;

  const endpoint = postId ? `/api/odb/post/${postId}` : withDeviceTimeZone("/api/odb/today");

  const { data: devotional, isLoading, error, refetch } = useQuery<OdbDevotional>({
    queryKey: [endpoint],
    staleTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });

  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const handleShare = async () => {
    if (!devotional) return;
    try {
      await Share.share({
        title: devotional.title,
        message: `${devotional.title} - Our Daily Bread\n${devotional.url}`,
        url: devotional.url,
      });
    } catch {}
  };

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: insets.top + webTopPad }]}>
        <ActivityIndicator size="large" color={PathB.coral} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (error || !devotional) {
    return (
      <View style={[s.container, { paddingTop: insets.top + webTopPad }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={PathB.ink} />
          </Pressable>
          <Text style={[s.headerTitle, { fontFamily: "Inter_600SemiBold" }]}>Our Daily Bread</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Ionicons name="cloud-offline-outline" size={48} color={INK_MUTED} />
          <Text style={[s.errorText, { fontFamily: "Inter_400Regular" }]}>
            Unable to load devotional
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [s.readMoreBtn, { marginTop: 16, width: 160 }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.readMoreText, { fontFamily: "Inter_600SemiBold" }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const formattedDate = (() => {
    try {
      const d = new Date(devotional.date + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch {
      return devotional.date;
    }
  })();

  return (
    <View style={[s.container, { paddingTop: insets.top + webTopPad }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={PathB.ink} />
        </Pressable>
        <Text style={[s.headerTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          Our Daily Bread
        </Text>
        <Pressable onPress={handleShare} hitSlop={12}>
          <Ionicons name="share-outline" size={22} color={PathB.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1A3A1A", "#0D1B2A", "#1A1F3C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroBanner}
        >
          <Text style={[s.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>OUR DAILY BREAD</Text>
          <Text style={[s.heroDate, { fontFamily: "Inter_400Regular" }]}>{formattedDate}</Text>
          <Text style={[s.heroTitle, { fontFamily: "Lora_700Bold" }]}>{devotional.title}</Text>
          {devotional.author ? (
            <Text style={[s.heroAuthor, { fontFamily: "Inter_500Medium" }]}>
              by {devotional.author}
            </Text>
          ) : null}
        </LinearGradient>

        {devotional.verse ? (
          <View style={s.verseCard}>
            <Ionicons name="book-outline" size={16} color={PathB.coral} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.verseText, { fontFamily: "Lora_400Regular_Italic" }]}>
                {devotional.verse}
              </Text>
              {devotional.verseRef ? (
                <Text style={[s.verseRef, { fontFamily: "Inter_600SemiBold" }]}>
                  {devotional.verseRef}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {devotional.passage ? (
          <View style={s.passageRow}>
            <Ionicons name="document-text-outline" size={14} color={INK_MUTED} />
            <Text style={[s.passageText, { fontFamily: "Inter_500Medium" }]}>
              Read: {devotional.passage}
            </Text>
          </View>
        ) : null}

        {devotional.content ? (
          <View style={s.section}>
            <Text style={[s.bodyText, { fontFamily: "Inter_400Regular" }]}>
              {devotional.content}
            </Text>
          </View>
        ) : null}

        {devotional.thought ? (
          <View style={s.thoughtCard}>
            <Text style={[s.thoughtLabel, { fontFamily: "Inter_600SemiBold" }]}>PRAYER</Text>
            <Text style={[s.thoughtText, { fontFamily: "Lora_400Regular_Italic" }]}>
              {devotional.thought}
            </Text>
          </View>
        ) : null}

        {devotional.response ? (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>REFLECT</Text>
            <Text style={[s.bodyText, { fontFamily: "Inter_400Regular" }]}>
              {devotional.response}
            </Text>
          </View>
        ) : null}

        {devotional.insights ? (
          <View style={s.insightCard}>
            <Text style={[s.insightLabel, { fontFamily: "Inter_600SemiBold" }]}>INSIGHT</Text>
            <Text style={[s.bodyText, { fontFamily: "Inter_400Regular" }]}>
              {devotional.insights}
            </Text>
            {devotional.insightsAuthor ? (
              <Text style={[s.insightAuthor, { fontFamily: "Inter_500Medium" }]}>
                -- {devotional.insightsAuthor}
              </Text>
            ) : null}
          </View>
        ) : null}

        {devotional.bibleInAYear ? (
          <View style={s.bibleYearRow}>
            <Ionicons name="calendar-outline" size={14} color={PathB.coral} />
            <Text style={[s.bibleYearText, { fontFamily: "Inter_500Medium" }]}>
              Bible in a Year: {devotional.bibleInAYear}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={async () => {
            try {
              await Linking.openURL(devotional.url);
            } catch {}
          }}
          style={({ pressed }) => [s.readMoreBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[s.readMoreText, { fontFamily: "Inter_600SemiBold" }]}>
            Read on odb.org
          </Text>
          <Ionicons name="open-outline" size={16} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PathB.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: PathB.ink,
    fontSize: 17,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  errorText: {
    color: INK_MUTED,
    fontSize: 15,
    marginTop: 12,
  },
  heroBanner: {
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  heroLabel: {
    color: PathB.coral,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroDate: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 34,
    marginBottom: 6,
  },
  heroAuthor: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  verseCard: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: PathB.coral + "14",
    borderLeftWidth: 3,
    borderLeftColor: PathB.coral,
    borderRadius: 8,
    padding: 14,
  },
  verseText: {
    color: PathB.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  verseRef: {
    color: PathB.coralInk,
    fontSize: 13,
    marginTop: 6,
  },
  passageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
  },
  passageText: {
    color: INK_MUTED,
    fontSize: 13,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionLabel: {
    color: PathB.coralInk,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  bodyText: {
    color: PathB.ink,
    fontSize: 16,
    lineHeight: 26,
  },
  thoughtCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: PathB.coral + "10",
    borderRadius: 12,
    padding: 16,
  },
  thoughtLabel: {
    color: PathB.coralInk,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  thoughtText: {
    color: PathB.ink,
    fontSize: 15,
    lineHeight: 24,
  },
  insightCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "rgba(99,102,241,0.08)",
    borderRadius: 12,
    padding: 16,
  },
  insightLabel: {
    color: "#818CF8",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  insightAuthor: {
    color: INK_MUTED,
    fontSize: 13,
    marginTop: 8,
    textAlign: "right",
  },
  bibleYearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: PathB.surfaceCard,
    borderRadius: 8,
    padding: 12,
  },
  bibleYearText: {
    color: INK_MUTED,
    fontSize: 13,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: PathB.coral,
    borderRadius: 12,
  },
  readMoreText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});
