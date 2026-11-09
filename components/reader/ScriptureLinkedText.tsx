import React from "react";
import { Text, type TextStyle } from "react-native";
import { useTranslation } from "@/context/TranslationContext";
import { findScriptureCitations } from "@/lib/scripture-reference";
import { footnoteSuperscript, splitLeadingFootnote } from "@/lib/scripture-footnote";
import { navigateToScriptureByParts } from "@/lib/scripture-nav";

export function ScriptureLinkedText({
  text,
  style,
}: {
  text: string;
  style?: TextStyle;
}) {
  const { translation } = useTranslation();
  const hits = findScriptureCitations(text);
  if (!hits.length) return <>{text}</>;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach((hit, index) => {
    if (hit.start > cursor) {
      const gap = text.slice(cursor, hit.start);
      const marker = splitLeadingFootnote(gap);
      if (marker.digits) {
        if (marker.plain) nodes.push(marker.plain);
        nodes.push(footnoteSuperscript(marker.digits));
      } else {
        nodes.push(gap);
      }
    }
    nodes.push(
      <Text
        key={`${hit.start}-${index}`}
        allowFontScaling={false}
        onPress={() =>
          navigateToScriptureByParts(
            hit.bookId,
            hit.chapter,
            hit.verse,
            translation,
            hit.verses ? undefined : hit.verse != null ? (hit.verseEnd ?? hit.verse) : undefined,
            hit.verses,
          )
        }
        accessibilityRole="link"
        accessibilityLabel={hit.text}
        style={[style, { textDecorationLine: "underline" }]}
      >
        {hit.text}
      </Text>,
    );
    cursor = hit.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
