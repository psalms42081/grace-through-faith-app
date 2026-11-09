import { splitVerseWordPieces, wordInRange, type WordRange } from "@/lib/verse-word-range";
import { WORDS_OF_CHRIST_INK } from "@/lib/words-of-christ";
import { VerseTextRuns } from "@/components/reader/VerseTextRuns";

const SPOKEN_STYLE = { color: WORDS_OF_CHRIST_INK };

/** Plain verse body with the words of Christ inked; used where verses are not word-tappable. */
export function VerseSpokenText({
  text,
  spokenRanges,
  lineHeight,
}: {
  text: string;
  spokenRanges: WordRange[];
  lineHeight?: number;
}) {
  if (spokenRanges.length === 0) return <VerseTextRuns text={text} lineHeight={lineHeight} />;
  return (
    <>
      {splitVerseWordPieces(text).map((piece, index) => (
        <VerseTextRuns
          key={`p-${index}`}
          text={piece.text}
          lineHeight={lineHeight}
          style={
            piece.kind === "word" && spokenRanges.some((range) => wordInRange(piece.index, range))
              ? SPOKEN_STYLE
              : undefined
          }
        />
      ))}
    </>
  );
}
