import { useCallback, useEffect, useRef } from "react";
import { PLAN_END_DWELL_MS, passageEndReached } from "@/lib/plan-reading";
import { offerPlanReminder } from "@/lib/plan-reminder-offer";
import { getDeviceTimeZone } from "@/lib/device-time-zone";
import { apiRequest, queryClient } from "@/lib/query-client";

type WatchInput = {
  enabled: boolean;
  bookId: number | null;
  chapter: number | null;
  translation: string;
  /** Last verse rendered for this chapter. Used when the plan day is the whole chapter. */
  lastVerse: number | null;
  bottomPadding: number;
  journalEntry?: string;
  onDayComplete?: () => void;
};

/**
 * Reports a plan passage once its last verse has stayed on screen for
 * PLAN_END_DWELL_MS, or the chapter audio has played through.
 */
export function usePassageEndWatch(input: WatchInput) {
  const scroll = useRef({ y: 0, height: 0, content: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sent = useRef("");
  const targetVerse = useRef<number | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  const report = useCallback(async (source: "scroll" | "listen", verse: number) => {
    const current = inputRef.current;
    if (!current.enabled || !current.bookId || !current.chapter || !current.translation) return;
    const key = `${current.bookId}:${current.chapter}:${verse}:${source}`;
    if (sent.current === key) return;
    sent.current = key;
    try {
      const response = await apiRequest("POST", "/api/user-plans/read", {
        bookId: current.bookId,
        chapter: current.chapter,
        verse,
        translation: current.translation,
        source,
        timeZone: getDeviceTimeZone(),
        journalEntry: current.journalEntry?.trim() || undefined,
      });
      const body = await response.json() as {
        updates?: { dayComplete?: boolean }[];
      };
      const matchesPlan = (key: unknown) =>
        typeof key === "string" && (
          key.includes("/api/user-plans")
          || key.includes("/api/devotionals/today")
          || key.includes("/api/reading-streaks")
        );
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.some(matchesPlan),
      });
      if ((body.updates ?? []).some((row) => row.dayComplete)) {
        current.onDayComplete?.();
        void offerPlanReminder();
      }
    } catch {
      sent.current = "";
    }
  }, []);

  const consider = useCallback(() => {
    const verse = targetVerse.current;
    const current = inputRef.current;
    if (!current.enabled || verse == null || current.lastVerse == null) return;
    const reached = passageEndReached({
      scrollY: scroll.current.y,
      viewportHeight: scroll.current.height,
      contentHeight: scroll.current.content,
      bottomPadding: current.bottomPadding,
      targetVerse: verse,
      lastVerse: current.lastVerse,
    });
    if (!reached) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      const held = passageEndReached({
        scrollY: scroll.current.y,
        viewportHeight: scroll.current.height,
        contentHeight: scroll.current.content,
        bottomPadding: inputRef.current.bottomPadding,
        targetVerse: verse,
        lastVerse: inputRef.current.lastVerse ?? verse,
      });
      if (held) void report("scroll", verse);
    }, PLAN_END_DWELL_MS);
  }, [report]);

  useEffect(() => {
    targetVerse.current = null;
    sent.current = "";
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!input.enabled || !input.bookId || !input.chapter) return;
    let cancel = false;
    const bookId = input.bookId;
    const chapter = input.chapter;
    apiRequest(
      "GET",
      `/api/user-plans/reading-target?bookId=${bookId}&chapter=${chapter}&timeZone=${encodeURIComponent(getDeviceTimeZone())}`,
    )
      .then((response) => response.json())
      .then((body: { active?: boolean; verse?: number | null }) => {
        if (cancel) return;
        targetVerse.current = body.active ? (body.verse ?? inputRef.current.lastVerse) : null;
        consider();
      })
      .catch(() => {
        targetVerse.current = null;
      });
    return () => {
      cancel = true;
    };
  }, [consider, input.bookId, input.chapter, input.enabled, input.lastVerse]);

  const onScroll = useCallback((y: number, viewportHeight: number, contentHeight: number) => {
    scroll.current = { y, height: viewportHeight, content: contentHeight };
    consider();
  }, [consider]);

  const onChapterAudioFinished = useCallback(() => {
    const verse = targetVerse.current;
    if (verse == null) return;
    void report("listen", verse);
  }, [report]);

  return { onScroll, onChapterAudioFinished };
}
