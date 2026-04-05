import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface FormattedNoteProps {
  content: string;
  textColor?: string;
  headingColor?: string;
  bulletColor?: string;
  fontSize?: number;
  numberOfLines?: number;
}

export default function FormattedNote({
  content,
  textColor = "#F5F0E8",
  headingColor = "#C9933A",
  bulletColor = "#C9933A",
  fontSize = 14,
  numberOfLines,
}: FormattedNoteProps) {
  if (!content) return null;
  const allLines = content.split("\n");
  const lines = numberOfLines ? allLines.slice(0, numberOfLines) : allLines;

  return (
    <View>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          const headingText = line.slice(3);
          return (
            <Text
              key={i}
              style={[
                fStyles.heading,
                { color: headingColor, fontSize: fontSize + 4 },
              ]}
            >
              {renderInline(headingText, textColor, fontSize + 4)}
            </Text>
          );
        }

        if (line.startsWith("- ")) {
          const bulletText = line.slice(2);
          return (
            <View key={i} style={fStyles.bulletRow}>
              <Text style={[fStyles.bulletDot, { color: bulletColor }]}>
                {"\u2022"}
              </Text>
              <Text style={[fStyles.bulletText, { color: textColor, fontSize }]}>
                {renderInline(bulletText, textColor, fontSize)}
              </Text>
            </View>
          );
        }

        if (line.trim() === "") {
          return <View key={i} style={fStyles.spacer} />;
        }

        return (
          <Text key={i} style={[fStyles.paragraph, { color: textColor, fontSize }]}>
            {renderInline(line, textColor, fontSize)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInline(text: string, color: string, fontSize: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={{ color, fontSize }}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    if (match[2]) {
      parts.push(
        <Text key={key++} style={{ color, fontSize, fontFamily: "Inter_700Bold" }}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      parts.push(
        <Text key={key++} style={{ color, fontSize, fontFamily: "Lora_400Regular_Italic" }}>
          {match[3]}
        </Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={{ color, fontSize }}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts;
}

const fStyles = StyleSheet.create({
  heading: {
    fontFamily: "Lora_700Bold",
    marginBottom: 6,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  paragraph: {
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 4,
  },
  spacer: {
    height: 8,
  },
});
