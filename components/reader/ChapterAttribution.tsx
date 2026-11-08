import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { linkSegments, type AttributionLink } from "@/shared/translation-notices";

export type { AttributionLink };

const INK = "#1F1A12";
const INK_MUTED = "#6B6660";
const LINK = "#8A5A2B";
const BORDER = "#E7E0D2";

export interface ChapterAttributionData {
  text: string;
  info?: string | null;
  /** A further notice the licensor designates, shown under the copyright line. */
  notice?: string | null;
  links?: AttributionLink[];
  publisherName?: string | null;
  publisherUrl?: string | null;
  versionName?: string;
}

export interface ChapterFootnote {
  verse: number;
  text: string;
}

function openUrl(raw: string) {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  Linking.openURL(url).catch(() => {});
}

function stripWrappingQuotes(value: string): string {
  return value.trim().replace(/^"([\s\S]*)"$/, "$1").trim();
}

/** Copyright text with publisher web addresses and named phrases made tappable, as the licences require. */
function LinkedText({ text, links }: { text: string; links?: AttributionLink[] }) {
  return (
    <>
      {linkSegments(text, links).map((segment, index) =>
        segment.url ? (
          <Text key={index} style={styles.link} onPress={() => openUrl(segment.url as string)} accessibilityRole="link">
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </>
  );
}

function showsPublisherLink(attribution: ChapterAttributionData, lines: string[]): boolean {
  const publisherUrl = attribution.publisherUrl?.toLowerCase();
  return !!publisherUrl && !lines.some((line) => line.toLowerCase().includes(publisherUrl));
}

/** The required copyright line and publisher link under Scripture shown outside the reader. */
export function ScriptureCredit({ attribution, testID }: { attribution: ChapterAttributionData; testID?: string }) {
  const copyright = stripWrappingQuotes(attribution.text);
  const notice = attribution.notice?.trim();
  const textStyle = styles.credit;
  return (
    <View style={styles.creditWrap} testID={testID}>
      <Text style={textStyle}>
        <LinkedText text={copyright} links={attribution.links} />
      </Text>
      {notice ? (
        <Text style={textStyle}>
          <LinkedText text={notice} />
        </Text>
      ) : null}
      {showsPublisherLink(attribution, [copyright, notice ?? ""]) ? (
        <Text style={[textStyle, styles.link]} onPress={() => openUrl(attribution.publisherUrl as string)} accessibilityRole="link">
          Learn more from {attribution.publisherName || "the publisher"}
        </Text>
      ) : null}
    </View>
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
  const notice = attribution.notice?.trim();
  const showPublisherLink = showsPublisherLink(attribution, [copyright, notice ?? ""]);
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
        <LinkedText text={copyright} links={attribution.links} />
      </Text>
      {notice ? (
        <Text style={styles.copyright}>
          <LinkedText text={notice} />
        </Text>
      ) : null}
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
  creditWrap: { gap: 4, marginTop: 8 },
  credit: { fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular", color: INK_MUTED },
  link: { color: LINK, textDecorationLine: "underline" },
});
