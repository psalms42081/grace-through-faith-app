import { StyleSheet, Text, type TextStyle } from "react-native";
import { splitDivineNameRuns } from "@/lib/divine-name";

/** Inline verse body: LORD in small caps when the font supports it. */
export function VerseTextRuns({
  text,
  style,
  lineHeight,
}: {
  text: string;
  style?: TextStyle;
  /** Paragraph line height. Android applies a nested span's own line height to the whole verse. */
  lineHeight?: number;
}) {
  const inherited = lineHeight != null ? { lineHeight } : null;
  return (
    <>
      {splitDivineNameRuns(text).map((run, index) =>
        run.isDivineName ? (
          <Text key={`nd-${index}`} allowFontScaling={false} pointerEvents="none" style={[s.divineName, style, inherited]}>
            {run.text}
          </Text>
        ) : (
          <Text key={`t-${index}`} allowFontScaling={false} pointerEvents="none" style={[style, inherited]}>
            {run.text}
          </Text>
        )
      )}
    </>
  );
}

const s = StyleSheet.create({
  divineName: {
    fontVariant: ["small-caps"],
  },
});
