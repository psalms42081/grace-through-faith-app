import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { D2, F } from "./tokens";
import { ErrorState, Header, LoadingState } from "./PreviewPrimitives";
import { withDeviceTimeZone } from "@/lib/device-time-zone";

type Egw = {
  title: string;
  content: string;
  bookTitle: string;
  bookId: number;
  date: string;
  sourceUrl: string | null;
  source?: "live" | "fallback";
};

function formatExcerpt(content: string) {
  const excerpt = content.trim();
  return /[.!?"']$/.test(excerpt) ? excerpt : `${excerpt}…`;
}

export default function EgwDevotionalPreview() {
  const insets = useSafeAreaInsets();
  const q = useQuery<Egw>({ queryKey: [withDeviceTimeZone("/api/egw/devotional/today")], staleTime: 86400000 });
  const d = q.data;

  if (q.isLoading) {
    return (
      <View style={s.root}>
        <Header title="Ellen G. White" topInset={insets.top} onBack={() => router.back()} />
        <LoadingState label="Opening today's reflection" />
      </View>
    );
  }

  if (q.error || !d) {
    return (
      <View style={s.root}>
        <Header title="Ellen G. White" topInset={insets.top} onBack={() => router.back()} />
        <ErrorState onRetry={() => q.refetch()} label="This reflection could not be loaded." />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Header
        title="Ellen G. White"
        eyebrow="Daily reflection"
        topInset={insets.top}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 35 }}>
        <View style={s.hero}>
          <Text style={s.kicker}>ELLEN G. WHITE</Text>
          <Text style={s.date}>{d.date}</Text>
          <Text style={s.title}>{d.title}</Text>
          <View style={s.source}>
            <Ionicons name="library-outline" size={15} color={D2.amber} />
            <Text style={s.sourceText}>{d.bookTitle}</Text>
          </View>
        </View>

        <View style={s.attribution}>
          <Ionicons name="shield-checkmark-outline" size={16} color={D2.amber} />
          <Text style={s.attributionText}>Excerpt from Ellen G. White devotional writings</Text>
        </View>

        <Text style={s.body}>{formatExcerpt(d.content)}</Text>

        {d.source !== "fallback" && d.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(d.sourceUrl as string)}
            style={s.external}
            testID="egw-devotional-preview-source"
          >
            <Text style={s.externalText}>Read this chapter on EGW Writings</Text>
            <Ionicons name="open-outline" size={15} color={D2.amber} />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: D2.surface,
  },
  hero: {
    padding: 23,
    backgroundColor: "#F7EBDD",
  },
  kicker: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  date: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 13,
    marginTop: 7,
  },
  title: {
    fontFamily: F.loraBold,
    color: D2.ink,
    fontSize: 29,
    lineHeight: 36,
    marginTop: 10,
  },
  source: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    marginTop: 12,
  },
  sourceText: {
    fontFamily: F.interMed,
    color: D2.amber,
    fontSize: 13,
  },
  attribution: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 20,
    marginTop: 17,
    padding: 11,
    borderRadius: 10,
    backgroundColor: D2.amberSoft,
  },
  attributionText: {
    fontFamily: F.interMed,
    color: D2.amber,
    fontSize: 12,
  },
  body: {
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 16,
    lineHeight: 28,
    margin: 20,
    marginTop: 22,
  },
  external: {
    margin: 20,
    borderWidth: 1,
    borderColor: D2.amber,
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  externalText: {
    fontFamily: F.interSemi,
    color: D2.amber,
    fontSize: 14,
  },
});
