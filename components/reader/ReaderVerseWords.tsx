import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, type TextStyle } from "react-native";
import { VerseTextRuns } from "@/components/reader/VerseTextRuns";
import {
  alignMapsToSurface,
  type ReaderStrongMap,
} from "@/lib/reader-word-study";
import { wordInRange, type WordRange } from "@/lib/verse-word-range";
import { WORDS_OF_CHRIST_INK } from "@/lib/words-of-christ";
import {
  createVerseWebLongPress,
  pointerCoords,
  type VersePointerEvent,
} from "@/lib/verse-web-long-press";

const IS_WEB = Platform.OS === "web";

const webInline: TextStyle | undefined = IS_WEB
  ? ({
      display: "inline",
      padding: 0,
      margin: 0,
    } as unknown as TextStyle)
  : undefined;

/** Canon cream tint shown on the tapped word before its sheet opens. */
export const WORD_TAP_TINT = "#F1EBDD";
export const WORD_TAP_TINT_MS = 300;

const tappedStyle: TextStyle = {
  backgroundColor: WORD_TAP_TINT,
  borderRadius: 4,
};

export function ReaderVerseWords({
  verseId,
  verseNum,
  text,
  maps,
  wordStudyMode,
  onVerseTap,
  onVerseLongPress,
  onWordActivate,
  spokenRanges = [],
}: {
  verseId: string;
  verseNum: number;
  text: string;
  maps: ReaderStrongMap[];
  wordStudyMode: boolean;
  onVerseTap: () => void;
  onVerseLongPress: () => void;
  onWordActivate: (surface: string, mapping: ReaderStrongMap) => void;
  spokenRanges?: WordRange[];
}) {
  const tokens = useMemo(
    () =>
      alignMapsToSurface(
        text,
        maps.map((item) => ({
          translatedWord: item.map.translatedWord,
          kjvUsage: item.entry?.kjvUsage,
        })),
      ),
    [text, maps],
  );
  const activateRef = useRef(onWordActivate);
  activateRef.current = onWordActivate;
  const verseLongRef = useRef(onVerseLongPress);
  verseLongRef.current = onVerseLongPress;
  const mapsRef = useRef(maps);
  mapsRef.current = maps;
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const webLongPressRef = useRef<ReturnType<typeof createVerseWebLongPress> | null>(null);
  if (webLongPressRef.current === null) {
    webLongPressRef.current = createVerseWebLongPress({
      onLongPress: (id) => {
        const tokenIndex = Number(id.split("::")[1]);
        const token = tokensRef.current[tokenIndex];
        if (token?.kind === "word" && token.mapIndex != null) {
          const mapping = mapsRef.current[token.mapIndex];
          if (mapping) activateRef.current(token.surface, mapping);
          return;
        }
        verseLongRef.current();
      },
    });
  }
  const webLongPress = webLongPressRef.current;
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  let spokenOrdinal = -1;
  return (
    <>
      {tokens.map((token, index) => {
        if (token.kind === "word") spokenOrdinal += 1;
        // Punctuation after a spoken word belongs to that word's whitespace-split index.
        const spoken =
          (token.kind === "word" || /\S/.test(token.surface)) &&
          spokenOrdinal >= 0 &&
          spokenRanges.some((range) => wordInRange(spokenOrdinal, range));
        const mapping = token.mapIndex != null ? maps[token.mapIndex] : null;
        const tagged = token.kind === "word" && mapping != null;
        const pressOpensSheet = tagged && wordStudyMode;
        const testId =
          tagged && token.surface.toLowerCase() === "loved"
            ? `reader-word-${verseNum}-loved`
            : undefined;

        const activate = () => {
          if (mapping) onWordActivate(token.surface, mapping);
        };
        const tapThenActivate = () => {
          if (!mapping) return;
          if (tapTimer.current) clearTimeout(tapTimer.current);
          setTappedIndex(index);
          tapTimer.current = setTimeout(() => {
            setTappedIndex(null);
            activateRef.current(token.surface, mapping);
          }, WORD_TAP_TINT_MS);
        };

        const webHandlers = IS_WEB
          ? {
              onPointerDown: (event: VersePointerEvent) => {
                const { x, y } = pointerCoords(event);
                webLongPress.start(`${verseId}::${index}`, x, y);
              },
              onPointerMove: (event: VersePointerEvent) => {
                const { x, y } = pointerCoords(event);
                webLongPress.move(x, y);
              },
              onPointerUp: () => webLongPress.cancel(),
              onPointerCancel: () => webLongPress.cancel(),
              onContextMenu: (event: { preventDefault?: () => void }) => {
                event.preventDefault?.();
              },
            }
          : {
              onLongPress: tagged ? activate : onVerseLongPress,
              delayLongPress: 400,
            };

        if (token.kind === "sep") {
          return (
            <Text
              key={`${verseId}-s-${index}`}
              pointerEvents={wordStudyMode ? "none" : "auto"}
              onPress={wordStudyMode ? undefined : onVerseTap}
              style={[webInline, spoken ? { color: WORDS_OF_CHRIST_INK } : null]}
            >
              {token.surface}
            </Text>
          );
        }

        if (wordStudyMode && !tagged) {
          return (
            <Text
              key={`${verseId}-w-${index}`}
              pointerEvents="none"
              style={[webInline, spoken ? { color: WORDS_OF_CHRIST_INK } : null]}
            >
              <VerseTextRuns
                text={token.surface}
                style={spoken ? { color: WORDS_OF_CHRIST_INK } : undefined}
              />
            </Text>
          );
        }

        return (
          <Text
            key={`${verseId}-w-${index}`}
            testID={testId}
            nativeID={testId}
            onPress={() => {
              if (IS_WEB && webLongPress.consumeSuppressedClick()) return;
              if (pressOpensSheet) tapThenActivate();
              else onVerseTap();
            }}
            {...webHandlers}
            suppressHighlighting={pressOpensSheet}
            selectable={false}
            style={[
              webInline,
              tappedIndex === index ? tappedStyle : null,
              IS_WEB && tagged ? ({ cursor: "pointer" } as unknown as TextStyle) : null,
              spoken ? { color: WORDS_OF_CHRIST_INK } : null,
            ]}
            accessibilityLabel={
              tagged ? `Word study ${token.surface}` : `Verse ${verseNum}`
            }
          >
            {tagged ? (
              token.surface
            ) : (
              <VerseTextRuns
                text={token.surface}
                style={spoken ? { color: WORDS_OF_CHRIST_INK } : undefined}
              />
            )}
          </Text>
        );
      })}
    </>
  );
}
