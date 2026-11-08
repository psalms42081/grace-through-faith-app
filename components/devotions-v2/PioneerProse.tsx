import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScriptureLinkedText } from "@/components/reader/ScriptureLinkedText";
import { readingSpace, readingType } from "@/lib/reading-font-scale";
import { useReadingFontScale, useSystemFontScale } from "@/lib/use-reading-font-scale";
import { D2, F } from "./tokens";

export function PioneerProse({
  paragraphs,
  testID,
}: {
  paragraphs: string[];
  testID?: string;
}) {
  const scale = useReadingFontScale() * useSystemFontScale();
  const body = [s.body, readingType(16, 28, scale)];
  return (
    <View style={[s.bodyWrap, { gap: readingSpace(16, scale) }]} testID={testID}>
      {paragraphs.map((paragraph, index) => (
        <Text key={`${index}-${paragraph.slice(0, 24)}`} allowFontScaling={false} style={body}>
          <ScriptureLinkedText text={paragraph} style={{ ...s.body, ...readingType(16, 28, scale) }} />
        </Text>
      ))}
    </View>
  );
}

export function PublicDomainLine({
  text,
  testID,
}: {
  text: string;
  testID?: string;
}) {
  return (
    <Text style={s.domain} testID={testID}>
      {text}
    </Text>
  );
}

const s = StyleSheet.create({
  bodyWrap: {
    marginHorizontal: 20,
    marginTop: 22,
    gap: 16,
  },
  body: {
    fontFamily: F.inter,
    color: D2.ink,
    fontSize: 16,
    lineHeight: 28,
  },
  domain: {
    fontFamily: F.inter,
    color: D2.muted,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 20,
    marginTop: 18,
  },
});
