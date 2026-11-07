import React, { useRef, useState } from "react";
import { Platform, Text, type TextStyle } from "react-native";
import { VerseTextRuns } from "@/components/reader/VerseTextRuns";
import {
  normalizeWordRange,
  splitVerseWordPieces,
  wordInRange,
  type WordRange,
} from "@/lib/verse-word-range";
import { WORDS_OF_CHRIST_INK } from "@/lib/words-of-christ";
import {
  pointerCoords,
  VERSE_LONG_PRESS_MS,
  VERSE_LONG_PRESS_MOVE_PX,
  type VersePointerEvent,
} from "@/lib/verse-web-long-press";

const IS_WEB = Platform.OS === "web";

const webInline: TextStyle | undefined = IS_WEB
  ? ({ display: "inline", padding: 0, margin: 0 } as unknown as TextStyle)
  : undefined;

export type VerseWordRangeHighlight = WordRange & { verseId: string; color: string };

type PointerWithStop = VersePointerEvent & { stopPropagation?: () => void };

function hitWordIndex(clientX: number, clientY: number, verseId: string): number | null {
  if (typeof document === "undefined") return null;
  const el = document.elementFromPoint(clientX, clientY);
  const node = el?.closest?.("[data-word-index]");
  if (!node || node.getAttribute("data-verse-id") !== verseId) return null;
  const index = Number(node.getAttribute("data-word-index"));
  return Number.isFinite(index) ? index : null;
}

function clientPoint(event: VersePointerEvent): { x: number; y: number } {
  return {
    x: event.nativeEvent?.clientX ?? event.clientX ?? pointerCoords(event).x,
    y: event.nativeEvent?.clientY ?? event.clientY ?? pointerCoords(event).y,
  };
}

export function VerseWordSpans({
  verseId,
  verseNum,
  text,
  ranges,
  spokenRanges = [],
  onTap,
  onCommitRange,
}: {
  verseId: string;
  verseNum: number;
  text: string;
  ranges: VerseWordRangeHighlight[];
  spokenRanges?: WordRange[];
  onTap: () => void;
  onCommitRange: (verseId: string, start: number, end: number) => void;
}) {
  const pieces = splitVerseWordPieces(text);
  const [draft, setDraft] = useState<WordRange | null>(null);
  const suppressClick = useRef(false);
  const onCommitRef = useRef(onCommitRange);
  onCommitRef.current = onCommitRange;
  const gesture = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    originX: number;
    originY: number;
    moved: boolean;
    index: number;
  } | null>(null);

  const clearTimer = () => {
    if (gesture.current?.timer) {
      clearTimeout(gesture.current.timer);
      gesture.current.timer = null;
    }
  };

  const armDrag = (startIndex: number, clientX: number, clientY: number) => {
    const initial = normalizeWordRange(startIndex, hitWordIndex(clientX, clientY, verseId) ?? startIndex);
    setDraft(initial);
    suppressClick.current = true;
    if (typeof window === "undefined") {
      onCommitRef.current(verseId, initial.start, initial.end);
      setDraft(null);
      return;
    }
    const move = (event: PointerEvent) => {
      const hit = hitWordIndex(event.clientX, event.clientY, verseId);
      if (hit == null) return;
      setDraft(normalizeWordRange(startIndex, hit));
    };
    const up = (event: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const hit = hitWordIndex(event.clientX, event.clientY, verseId) ?? startIndex;
      const range = normalizeWordRange(startIndex, hit);
      setDraft(null);
      onCommitRef.current(verseId, range.start, range.end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <>
      {pieces.map((piece, pieceIndex) => {
        if (piece.kind === "gap") {
          return (
            <Text key={`${verseId}-gap-${pieceIndex}`} style={webInline}>
              {piece.text}
            </Text>
          );
        }
        const saved = ranges.some((range) => wordInRange(piece.index, range));
        const wash = wordInRange(piece.index, draft) || saved ? "rgba(255, 241, 118, 0.55)" : "transparent";
        const spoken = spokenRanges.some((range) => wordInRange(piece.index, range));
        return (
          <Text
            key={`${verseId}-w-${piece.index}`}
            testID={`reader-verse-word-${verseNum}-${piece.index}`}
            suppressHighlighting={false}
            selectable={false}
            style={[
              webInline,
              wash !== "transparent" ? { backgroundColor: wash } : null,
              spoken ? { color: WORDS_OF_CHRIST_INK } : null,
            ]}
            {...(IS_WEB
              ? {
                  dataSet: { verseId, wordIndex: String(piece.index) },
                  onPointerDown: (event: PointerWithStop) => {
                    event.stopPropagation?.();
                    const point = pointerCoords(event);
                    const client = clientPoint(event);
                    gesture.current = {
                      timer: setTimeout(() => armDrag(piece.index, client.x, client.y), VERSE_LONG_PRESS_MS),
                      originX: point.x,
                      originY: point.y,
                      moved: false,
                      index: piece.index,
                    };
                  },
                  onPointerMove: (event: VersePointerEvent) => {
                    const current = gesture.current;
                    if (!current || current.index !== piece.index) return;
                    const point = pointerCoords(event);
                    if (Math.hypot(point.x - current.originX, point.y - current.originY) > VERSE_LONG_PRESS_MOVE_PX) {
                      current.moved = true;
                      clearTimer();
                    }
                  },
                  onPointerUp: () => clearTimer(),
                  onPointerCancel: () => clearTimer(),
                }
              : {
                  onLongPress: () => {
                    suppressClick.current = true;
                    onCommitRange(verseId, piece.index, piece.index);
                  },
                  delayLongPress: VERSE_LONG_PRESS_MS,
                })}
            onPress={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              if (gesture.current?.moved) return;
              onTap();
            }}
          >
            <VerseTextRuns text={piece.text} />
          </Text>
        );
      })}
    </>
  );
}
