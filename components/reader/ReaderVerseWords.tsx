import React, { useMemo, useRef } from "react";
import { Platform, Text, type TextStyle } from "react-native";
import { VerseTextRuns } from "@/components/reader/VerseTextRuns";
import {
  alignMapsToSurface,
  type ReaderStrongMap,
} from "@/lib/reader-word-study";
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

const taggedStyle: TextStyle = {
  textDecorationLine: "underline",
  textDecorationStyle: "solid",
  textDecorationColor: "#5B6B7A",
  backgroundColor: "rgba(91, 107, 122, 0.12)",
};

export function ReaderVerseWords({
  verseId,
  verseNum,
  text,
  maps,
  wordStudyMode,
  indicateTagged,
  onVerseTap,
  onVerseLongPress,
  onWordActivate,
}: {
  verseId: string;
  verseNum: number;
  text: string;
  maps: ReaderStrongMap[];
  wordStudyMode: boolean;
  indicateTagged: boolean;
  onVerseTap: () => void;
  onVerseLongPress: () => void;
  onWordActivate: (surface: string, mapping: ReaderStrongMap) => void;
}) {
  const tokens = useMemo(
    () => alignMapsToSurface(text, maps.map((item) => item.map)),
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
  const mark = indicateTagged ? taggedStyle : undefined;

  return (
    <>
      {tokens.map((token, index) => {
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
              style={webInline}
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
              style={webInline}
            >
              <VerseTextRuns text={token.surface} />
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
              if (pressOpensSheet) activate();
              else onVerseTap();
            }}
            {...webHandlers}
            suppressHighlighting={false}
            selectable={false}
            style={[
              webInline,
              tagged && mark
                ? IS_WEB
                  ? ({
                      textDecoration: "underline",
                      textDecorationColor: "#5B6B7A",
                      backgroundColor: "rgba(91, 107, 122, 0.14)",
                    } as unknown as TextStyle)
                  : mark
                : null,
              IS_WEB && tagged ? ({ cursor: "pointer" } as unknown as TextStyle) : null,
            ]}
            accessibilityLabel={
              tagged ? `Word study ${token.surface}` : `Verse ${verseNum}`
            }
          >
            {tagged ? (
              token.surface
            ) : (
              <VerseTextRuns text={token.surface} />
            )}
          </Text>
        );
      })}
    </>
  );
}
