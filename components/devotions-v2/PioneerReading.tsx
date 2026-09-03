import React from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPioneerPortrait } from "@/constants/pioneers";
import type { PioneerReadingPayload, PioneerWeekResponse } from "@/shared/pioneer-api";
import { D2, F } from "./tokens";
import { EmptyState, Header, LoadingState } from "./PreviewPrimitives";
import { PioneerProse, PublicDomainLine } from "./PioneerProse";

function readingFromWeek(data: PioneerWeekResponse | undefined): PioneerReadingPayload | null {
  return data?.reading ?? null;
}

export default function PioneerReading() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const readingId = typeof params.id === "string" && params.id.length > 0
    ? params.id
    : Array.isArray(params.id) && params.id[0]
      ? params.id[0]
      : null;

  const byId = useQuery<PioneerReadingPayload>({
    queryKey: [`/api/pioneers/readings/${readingId}`],
    enabled: !!readingId,
  });
  const week = useQuery<PioneerWeekResponse>({
    queryKey: ["/api/pioneers/week"],
    enabled: !readingId,
  });

  const reading = readingId ? byId.data ?? null : readingFromWeek(week.data);
  const loading = readingId ? byId.isLoading : week.isLoading;
  const failed = readingId ? byId.isError : week.isError;

  if (loading) {
    return (
      <View style={s.root}>
        <Header title="Voice of the Week" topInset={insets.top} onBack={() => router.back()} />
        <LoadingState label="Opening this week's voice" />
      </View>
    );
  }

  if (!reading) {
    return (
      <View style={s.root}>
        <Header title="Voice of the Week" topInset={insets.top} onBack={() => router.back()} />
        <EmptyState
          title={failed ? "A quiet pause" : "This week's voice is being prepared"}
          body={
            failed
              ? "This reading could not be opened just now."
              : "Published pioneer readings will appear here each Sabbath."
          }
          action="Browse the shelf"
          onAction={() => router.push("/pioneer-shelf" as any)}
          testID="pioneer-reading-empty"
        />
      </View>
    );
  }

  const portrait = getPioneerPortrait(reading.chapter.authorSlug);
  const note = reading.editorNote.trim();

  return (
    <View style={s.root}>
      <Header
        title="Voice of the Week"
        eyebrow="Pioneer writings"
        topInset={insets.top}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 35 }}>
        <View style={s.hero} testID="pioneer-reading-hero">
          {portrait ? (
            <Image
              source={portrait.photoAsset}
              style={s.portrait}
              accessibilityLabel={reading.chapter.author}
            />
          ) : (
            <View style={s.portraitFallback}>
              <Ionicons name="person-outline" size={28} color={D2.amber} />
            </View>
          )}
          <Text style={s.kicker}>VOICE OF THE WEEK</Text>
          <Text style={s.author}>{reading.chapter.author}</Text>
          {reading.chapter.authorDates ? (
            <Text style={s.dates}>{reading.chapter.authorDates}</Text>
          ) : null}
          <Text style={s.book}>
            {reading.chapter.book} ({reading.chapter.year})
          </Text>
          <Text style={s.chapter}>
            {reading.chapter.chapterTitle}
            {reading.chapter.chapterNumber
              ? ` · Chapter ${reading.chapter.chapterNumber}`
              : ""}
          </Text>
        </View>

        {note ? (
          <View style={s.note} testID="pioneer-reading-editor-note">
            <Text style={s.noteLabel}>A note from Informed Ministries</Text>
            <Text style={s.noteBody}>{note}</Text>
          </View>
        ) : null}

        <PioneerProse paragraphs={reading.paragraphs} testID="pioneer-reading-passage" />

        <PublicDomainLine text={reading.publicDomain} testID="pioneer-reading-public-domain" />

        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(reading.chapter.sourceUrl)}
          style={s.external}
          testID="pioneer-reading-source"
        >
          <Text style={s.externalText}>Read the whole book</Text>
          <Ionicons name="open-outline" size={15} color={D2.amber} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/pioneer-shelf" as any)}
          style={s.shelfLink}
          testID="pioneer-reading-shelf"
        >
          <Text style={s.shelfText}>Browse pioneer writings</Text>
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
    backgroundColor: "#F7EBDD",
    alignItems: "center",
  },
  portrait: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    backgroundColor: "#E8D4B8",
  },
  portraitFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    backgroundColor: D2.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  author: {
    fontFamily: F.loraBold,
    color: D2.ink,
    fontSize: 27,
    lineHeight: 34,
    marginTop: 8,
    textAlign: "center",
  },
  dates: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 13,
    marginTop: 4,
  },
  book: {
    fontFamily: F.interMed,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  chapter: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  note: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: D2.amberSoft,
    gap: 6,
  },
  noteLabel: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  noteBody: {
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 21,
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
  shelfLink: {
    alignItems: "center",
    paddingBottom: 8,
  },
  shelfText: {
    fontFamily: F.interMed,
    color: D2.muted,
    fontSize: 13,
  },
});
