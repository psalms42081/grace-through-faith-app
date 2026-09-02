import { StyleSheet, Text } from "react-native";
import { splitDivineNameRuns } from "@/lib/divine-name";

/** Inline verse body: LORD in small caps when the font supports it. */
export function VerseTextRuns({ text }: { text: string }) {
  return (
    <>
      {splitDivineNameRuns(text).map((run, index) =>
        run.isDivineName ? (
          <Text key={`nd-${index}`} pointerEvents="none" style={s.divineName}>
            {run.text}
          </Text>
        ) : (
          <Text key={`t-${index}`} pointerEvents="none">
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
