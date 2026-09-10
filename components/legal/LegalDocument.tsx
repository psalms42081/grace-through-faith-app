import React from "react";
import { Text, View, StyleSheet } from "react-native";
import type { LegalBlock, LegalDocument, LegalInline } from "@/lib/legal/parse-legal-markdown";

function InlineRun({
  inlines,
  color,
  strongColor,
}: {
  inlines: LegalInline[];
  color: string;
  strongColor: string;
}) {
  return (
    <Text style={[s.p, { color }]}>
      {inlines.map((part, i) => {
        if (part.type === "strong") {
          return (
            <Text key={i} style={[s.strong, { color: strongColor }]}>
              {part.text}
            </Text>
          );
        }
        if (part.type === "em") {
          return (
            <Text key={i} style={s.em}>
              {part.text}
            </Text>
          );
        }
        return <Text key={i}>{part.text}</Text>;
      })}
    </Text>
  );
}

export function LegalDocumentBody({
  doc,
  text,
  textSecondary,
}: {
  doc: LegalDocument;
  text: string;
  textSecondary: string;
}) {
  return (
    <View>
      {doc.blocks.map((block, i) => (
        <LegalBlockView
          key={i}
          block={block}
          text={text}
          textSecondary={textSecondary}
        />
      ))}
    </View>
  );
}

function LegalBlockView({
  block,
  text,
  textSecondary,
}: {
  block: LegalBlock;
  text: string;
  textSecondary: string;
}) {
  switch (block.type) {
    case "h1":
      return <Text style={[s.h1, { color: text }]}>{block.text}</Text>;
    case "banner":
      return (
        <View style={s.banner}>
          <Text style={s.bannerText}>{block.text}</Text>
        </View>
      );
    case "meta":
      return <Text style={[s.meta, { color: textSecondary }]}>{block.text}</Text>;
    case "h2":
      return <Text style={[s.h2, { color: text }]}>{block.text}</Text>;
    case "h3":
      return <Text style={[s.h3, { color: text }]}>{block.text}</Text>;
    case "p":
      return (
        <InlineRun inlines={block.inlines} color={textSecondary} strongColor={text} />
      );
    case "ul":
      return (
        <View style={s.list}>
          {block.items.map((item, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={[s.bullet, { color: textSecondary }]}>{"\u2022"}</Text>
              <View style={{ flex: 1 }}>
                <InlineRun inlines={item} color={textSecondary} strongColor={text} />
              </View>
            </View>
          ))}
        </View>
      );
  }
}

const s = StyleSheet.create({
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Lora_700Bold",
    marginBottom: 12,
  },
  banner: {
    backgroundColor: "#FBF3E4",
    borderColor: "#E8D4A8",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#7A4E12",
  },
  meta: {
    fontSize: 13,
    marginBottom: 24,
    fontFamily: "Inter_400Regular",
  },
  h2: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: "Inter_600SemiBold",
    marginTop: 28,
    marginBottom: 10,
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    marginTop: 20,
    marginBottom: 8,
  },
  p: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  strong: {
    fontFamily: "Inter_600SemiBold",
  },
  em: {
    fontStyle: "italic",
    fontFamily: "Lora_400Regular_Italic",
  },
  list: {
    marginBottom: 8,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    marginRight: 10,
  },
});
