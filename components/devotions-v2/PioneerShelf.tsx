import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPioneerPortrait } from "@/constants/pioneers";
import { PIONEER_SHELF_PUBLIC_DOMAIN } from "@/shared/pioneer-authors";
import { displayPioneerChapterTitle } from "@/shared/pioneer-title";
import type { PioneerShelfResponse } from "@/shared/pioneer-api";
import { D2, F } from "./tokens";
import { EmptyState, Header, LoadingState } from "./PreviewPrimitives";
import { PublicDomainLine } from "./PioneerProse";

export default function PioneerShelf() {
  const insets = useSafeAreaInsets();
  const q = useQuery<PioneerShelfResponse>({ queryKey: ["/api/pioneers/shelf"] });
  const [openAuthor, setOpenAuthor] = useState<string | null>(null);
  const [openBook, setOpenBook] = useState<string | null>(null);

  // Shelf order is applied by GET /api/pioneers/shelf. Do not sort by name here.
  const authors = q.data?.authors || [];

  return (
    <View style={s.root}>
      <Header
        title="Pioneer writings"
        eyebrow="Public domain"
        topInset={insets.top}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 35 }}>
        <View style={s.intro}>
          <Text style={s.introTitle}>Authors, books, and chapters</Text>
          <Text style={s.introBody}>
            These are the words as they were written. Nothing here is generated.
          </Text>
        </View>

        {q.isLoading ? (
          <LoadingState label="Opening the shelf" />
        ) : authors.length === 0 ? (
          <EmptyState
            title="The shelf is still being filled"
            body="Pioneer chapters will appear here after they have been ingested."
            testID="pioneer-shelf-empty"
          />
        ) : (
          authors.map((author) => {
            const portrait = getPioneerPortrait(author.slug);
            const expanded = openAuthor === author.slug;
            return (
              <View key={author.slug} style={s.authorBlock}>
                <Pressable
                  onPress={() => {
                    setOpenAuthor(expanded ? null : author.slug);
                    setOpenBook(null);
                  }}
                  style={s.authorRow}
                  testID={`pioneer-shelf-author-${author.slug}`}
                >
                  {portrait ? (
                    <Image source={portrait.photoAsset} style={s.portrait} />
                  ) : (
                    <View style={s.portraitFallback}>
                      <Ionicons name="person-outline" size={18} color={D2.amber} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.authorName}>{author.name}</Text>
                    <Text style={s.authorMeta}>
                      {author.dates ? `${author.dates} · ` : ""}
                      {author.books.length} {author.books.length === 1 ? "book" : "books"}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? "chevron-down" : "chevron-forward"}
                    size={17}
                    color={D2.muted}
                  />
                </Pressable>

                {expanded
                  ? author.books.map((book) => {
                      const bookOpen = openBook === book.slug;
                      return (
                        <View key={book.slug} style={s.bookBlock}>
                          <Pressable
                            onPress={() => setOpenBook(bookOpen ? null : book.slug)}
                            style={s.bookRow}
                            testID={`pioneer-shelf-book-${book.slug}`}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={s.bookTitle}>{book.title}</Text>
                              <Text style={s.bookMeta}>
                                {book.year} · {book.chapterCount} chapters
                              </Text>
                            </View>
                            <Ionicons
                              name={bookOpen ? "chevron-down" : "chevron-forward"}
                              size={16}
                              color={D2.muted}
                            />
                          </Pressable>
                          {bookOpen
                            ? book.chapters.map((chapter) => (
                                <Pressable
                                  key={chapter.id}
                                  onPress={() =>
                                    router.push(
                                      `/pioneer-chapter?id=${encodeURIComponent(chapter.id)}` as any,
                                    )
                                  }
                                  style={s.chapterRow}
                                  testID={`pioneer-shelf-chapter-${chapter.id}`}
                                >
                                  <Text style={s.chapterNum}>{chapter.number}</Text>
                                  <Text style={s.chapterTitle}>
                                    {displayPioneerChapterTitle(chapter.title)}
                                  </Text>
                                </Pressable>
                              ))
                            : null}
                          {bookOpen ? (
                            <PublicDomainLine text={book.publicDomain} />
                          ) : null}
                        </View>
                      );
                    })
                  : null}
              </View>
            );
          })
        )}

        {authors.length > 0 ? (
          <PublicDomainLine
            text={PIONEER_SHELF_PUBLIC_DOMAIN}
            testID="pioneer-shelf-public-domain"
          />
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
  intro: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  introTitle: {
    fontFamily: F.loraBold,
    color: D2.ink,
    fontSize: 26,
    lineHeight: 32,
  },
  introBody: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  authorBlock: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: D2.card,
    borderWidth: 1,
    borderColor: D2.border,
  },
  portrait: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8D4B8",
  },
  portraitFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: D2.amberSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    fontFamily: F.interSemi,
    color: D2.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  authorMeta: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 12,
    marginTop: 3,
  },
  bookBlock: {
    marginTop: 8,
    marginLeft: 12,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F7EBDD",
  },
  bookTitle: {
    fontFamily: F.interSemi,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  bookMeta: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 12,
    marginTop: 3,
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: D2.border,
  },
  chapterNum: {
    width: 28,
    fontFamily: F.interBold,
    color: D2.amber,
    fontSize: 12,
  },
  chapterTitle: {
    flex: 1,
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 14,
    lineHeight: 20,
  },
});
