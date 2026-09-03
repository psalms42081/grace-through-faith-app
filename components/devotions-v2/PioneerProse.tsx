import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { D2, F } from "./tokens";

export function PioneerProse({
  paragraphs,
  testID,
}: {
  paragraphs: string[];
  testID?: string;
}) {
  return (
    <View style={s.bodyWrap} testID={testID}>
      {paragraphs.map((paragraph, index) => (
        <Text key={`${index}-${paragraph.slice(0, 24)}`} style={s.body}>
          {paragraph}
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
