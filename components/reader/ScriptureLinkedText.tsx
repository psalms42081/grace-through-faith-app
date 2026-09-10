import React from "react";
import { Text, type TextStyle } from "react-native";
import { useTranslation } from "@/context/TranslationContext";
import { findScriptureCitations } from "@/lib/scripture-reference";
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
    if (hit.start > cursor) nodes.push(text.slice(cursor, hit.start));
    nodes.push(
      <Text
        key={`${hit.start}-${index}`}
        onPress={() =>
          navigateToScriptureByParts(hit.bookId, hit.chapter, hit.verse, translation)
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
