import React from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { D2, F } from "./tokens";
import { ErrorState, Header, LoadingState } from "./PreviewPrimitives";
import { withDeviceTimeZone } from "@/lib/device-time-zone";

type Odb = {
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
};

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    quot: "\"",
    lt: "<",
    gt: ">",
    nbsp: " ",
    auml: "ä",
    Auml: "Ä",
    ouml: "ö",
    Ouml: "Ö",
    uuml: "ü",
    Uuml: "Ü",
    eacute: "é",
    Eacute: "É",
    rsquo: "\u2019",
    lsquo: "\u2018",
    rdquo: "\u201D",
    ldquo: "\u201C",
    ndash: "–",
    mdash: "—",
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => namedEntities[name] ?? entity);
}

export default function OdbDevotionalPreview() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const endpoint = id ? `/api/odb/post/${id}` : withDeviceTimeZone("/api/odb/today");

  const query = useQuery<Odb>({
    queryKey: [endpoint],
    staleTime: 600000,
    refetchOnMount: "always",
    retry: false,
  });
  const d = query.data;

  const retryFetch = () => {
    queryClient.resetQueries({ queryKey: [endpoint] });
  };

  const share = () =>
    d &&
    Share.share({
      title: decodeHtmlEntities(d.title),
      message: `${decodeHtmlEntities(d.title)} - Our Daily Bread\n${d.url}`,
      url: d.url,
    }).catch(() => {});

  if ((query.isLoading || query.isFetching) && !d) {
    return (
      <View style={s.root}>
        <Header title="Our Daily Bread" topInset={insets.top} onBack={() => router.back()} />
        <LoadingState label="Opening today's bread" />
      </View>
    );
  }

  if (query.error || !d) {
    return (
      <View style={s.root}>
        <Header title="Our Daily Bread" topInset={insets.top} onBack={() => router.back()} />
        <ErrorState
          onRetry={retryFetch}
          label="Our Daily Bread is taking a moment to load."
        />
      </View>
    );
  }

  const date = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={s.root}>
      <Header
        title="Our Daily Bread"
        eyebrow="Daily reading"
        topInset={insets.top}
        onBack={() => router.back()}
        action={share}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 35 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.hero}>
          <Text style={s.kicker}>OUR DAILY BREAD</Text>
          <Text style={s.date}>{date}</Text>
          <Text style={s.title}>{decodeHtmlEntities(d.title)}</Text>
          {d.author ? (
            <Text style={s.author}>by {decodeHtmlEntities(d.author)}</Text>
          ) : null}
        </View>

        {d.verse ? (
          <View style={s.verse}>
            <Ionicons name="book-outline" size={17} color={D2.amber} />
            <View style={{ flex: 1 }}>
              <Text style={s.verseText}>{decodeHtmlEntities(d.verse)}</Text>
              {d.verseRef ? (
                <Text style={s.verseRef}>{decodeHtmlEntities(d.verseRef)}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {d.passage ? (
          <Text style={s.passage}>Read: {decodeHtmlEntities(d.passage)}</Text>
        ) : null}
        {d.content ? (
          <Text style={s.body}>{decodeHtmlEntities(d.content)}</Text>
        ) : null}

        {d.thought ? (
          <View style={s.thought}>
            <Text style={s.label}>PRAYER</Text>
            <Text style={s.thoughtText}>{decodeHtmlEntities(d.thought)}</Text>
          </View>
        ) : null}

        {d.response ? (
          <View style={s.section}>
            <Text style={s.label}>REFLECT</Text>
            <Text style={s.bodyInline}>{decodeHtmlEntities(d.response)}</Text>
          </View>
        ) : null}

        {d.insights ? (
          <View style={s.insight}>
            <Text style={s.label}>INSIGHT</Text>
            <Text style={s.bodyInline}>{decodeHtmlEntities(d.insights)}</Text>
            {d.insightsAuthor ? (
              <Text style={s.author}>— {decodeHtmlEntities(d.insightsAuthor)}</Text>
            ) : null}
          </View>
        ) : null}

        {d.bibleInAYear ? (
          <Text style={s.bible}>Bible in a Year: {decodeHtmlEntities(d.bibleInAYear)}</Text>
        ) : null}

        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(d.url)}
          style={s.external}
          testID="odb-devotional-preview-source"
        >
          <Text style={s.externalText}>Read on odb.org</Text>
          <Ionicons name="open-outline" size={15} color={D2.amber} />
        </Pressable>
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
    backgroundColor: D2.amberSoft,
  },
  kicker: {
    fontFamily: F.interBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: D2.amber,
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
  author: {
    fontFamily: F.interMed,
    color: D2.muted,
    fontSize: 13,
    marginTop: 7,
  },
  verse: {
    flexDirection: "row",
    gap: 10,
    margin: 20,
    padding: 15,
    backgroundColor: "#FFF8ED",
    borderLeftWidth: 3,
    borderLeftColor: D2.amber,
    borderRadius: 10,
  },
  verseText: {
    fontFamily: F.loraSemi,
    color: D2.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  verseRef: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 12,
    marginTop: 7,
  },
  passage: {
    fontFamily: F.interMed,
    color: D2.muted,
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 2,
  },
  body: {
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 16,
    lineHeight: 27,
    margin: 20,
    marginTop: 19,
  },
  section: {
    margin: 20,
    gap: 8,
  },
  label: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  bodyInline: {
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 15,
    lineHeight: 25,
  },
  thought: {
    margin: 20,
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#F6ECDF",
    gap: 8,
  },
  thoughtText: {
    fontFamily: F.loraSemi,
    fontStyle: "italic",
    color: D2.ink,
    fontSize: 16,
    lineHeight: 25,
  },
  insight: {
    margin: 20,
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#F0ECFB",
    gap: 8,
  },
  bible: {
    fontFamily: F.interMed,
    color: D2.muted,
    fontSize: 13,
    marginHorizontal: 20,
    padding: 12,
    backgroundColor: "#F1EBDD",
    borderRadius: 9,
  },
  external: {
    margin: 20,
    marginTop: 24,
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
