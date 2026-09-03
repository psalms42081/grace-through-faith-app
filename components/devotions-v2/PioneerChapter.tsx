import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PioneerChapterPayload } from "@/shared/pioneer-api";
import { D2, F } from "./tokens";
import { EmptyState, Header, LoadingState } from "./PreviewPrimitives";
import { PioneerProse, PublicDomainLine } from "./PioneerProse";

export default function PioneerChapter() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const chapterId = typeof params.id === "string" && params.id.length > 0
    ? params.id
    : Array.isArray(params.id) && params.id[0]
      ? params.id[0]
      : null;

  const q = useQuery<PioneerChapterPayload>({
    queryKey: [`/api/pioneers/chapter/${chapterId}`],
    enabled: !!chapterId,
  });

  if (!chapterId || q.isLoading) {
    return (
      <View style={s.root}>
        <Header title="Pioneer writings" topInset={insets.top} onBack={() => router.back()} />
        <LoadingState label="Opening the chapter" />
      </View>
    );
  }

  const chapter = q.data;
  if (!chapter) {
    return (
      <View style={s.root}>
        <Header title="Pioneer writings" topInset={insets.top} onBack={() => router.back()} />
        <EmptyState
          title="This chapter could not be opened"
          body="Return to the shelf and choose another chapter."
          action="Back to the shelf"
          onAction={() => router.push("/pioneer-shelf" as any)}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Header
        title={chapter.chapterTitle}
        eyebrow={chapter.author}
        topInset={insets.top}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 35 }}>
        <View style={s.hero} testID="pioneer-chapter-hero">
          <Text style={s.kicker}>{chapter.author.toUpperCase()}</Text>
          {chapter.authorDates ? <Text style={s.dates}>{chapter.authorDates}</Text> : null}
          <Text style={s.title}>{chapter.chapterTitle}</Text>
          <View style={s.source}>
            <Ionicons name="library-outline" size={15} color={D2.amber} />
            <Text style={s.sourceText}>
              {chapter.book} ({chapter.year})
              {chapter.chapterNumber ? ` · Chapter ${chapter.chapterNumber}` : ""}
            </Text>
          </View>
        </View>

        <PioneerProse paragraphs={chapter.paragraphs} testID="pioneer-chapter-passage" />
        <PublicDomainLine text={chapter.publicDomain} testID="pioneer-chapter-public-domain" />

        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(chapter.sourceUrl)}
          style={s.external}
          testID="pioneer-chapter-source"
        >
          <Text style={s.externalText}>Read the whole book</Text>
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
    backgroundColor: "#F7EBDD",
  },
  kicker: {
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  dates: {
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
    flex: 1,
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
