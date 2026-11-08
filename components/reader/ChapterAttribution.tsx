import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

const INK = "#1F1A12";
const INK_MUTED = "#6B6660";
const LINK = "#8A5A2B";
const BORDER = "#E7E0D2";

export interface ChapterAttributionData {
  text: string;
  info?: string | null;
  publisherName?: string | null;
  publisherUrl?: string | null;
  versionName?: string;
}

export interface ChapterFootnote {
  verse: number;
  text: string;
}

const URL_IN_TEXT = /((?:https?:\/\/|www\.)[^\s)]+[^\s).,;])/gi;

function openUrl(raw: string) {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  Linking.openURL(url).catch(() => {});
}

function stripWrappingQuotes(value: string): string {
  return value.trim().replace(/^"([\s\S]*)"$/, "$1").trim();
}

/** Copyright text with any publisher web address made tappable, as the licences require. */
function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_IN_TEXT);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Text key={index} style={styles.link} onPress={() => openUrl(part)} accessibilityRole="link">
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        ),
      )}
    </>
  );
}

/** Footnotes and the version's required copyright line, shown at the foot of a chapter. */
export function ChapterAttribution({
  versionLabel,
  chapter,
  attribution,
  footnotes,
  testID,
}: {
  versionLabel: string;
  chapter: number | string;
  attribution: ChapterAttributionData;
  footnotes?: ChapterFootnote[];
  testID?: string;
}) {
  const copyright = stripWrappingQuotes(attribution.text);
  const showPublisherLink = !!attribution.publisherUrl && !copyright.includes(attribution.publisherUrl);
  return (
    <View style={styles.wrap} testID={testID}>
      {footnotes && footnotes.length > 0 ? (
        <View style={styles.notes}>
          <Text style={styles.heading} accessibilityRole="header">
            {versionLabel} notes
          </Text>
          {footnotes.map((note, index) => (
            <Text key={`${note.verse}-${index}`} style={styles.note}>
              <Text style={styles.noteRef}>
                {chapter}:{note.verse}
                {"\u00a0\u00a0"}
              </Text>
              {note.text}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.copyright}>
        <LinkedText text={copyright} />
      </Text>
      {attribution.info ? <Text style={styles.copyright}>{attribution.info}</Text> : null}
      {showPublisherLink ? (
        <Text
          style={[styles.copyright, styles.link]}
          onPress={() => openUrl(attribution.publisherUrl as string)}
          accessibilityRole="link"
        >
          Learn more from {attribution.publisherName || "the publisher"}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    gap: 8,
  },
  notes: { gap: 6, marginBottom: 8 },
  heading: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
  },
  note: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", color: INK },
  noteRef: { fontFamily: "Inter_600SemiBold", color: INK_MUTED },
  copyright: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", color: INK_MUTED },
  link: { color: LINK, textDecorationLine: "underline" },
});
