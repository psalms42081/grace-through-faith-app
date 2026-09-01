import { useCallback, useRef } from "react";
import { router, useFocusEffect } from "expo-router";

import { getTodaysVerse } from "@/components/home-v2/home-data";
import { useTranslation } from "@/context/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { parseScriptureReference } from "@/lib/scripture-reference";
import { bibleTabReaderPath } from "@/lib/bible-tab-navigation";

interface RecentRead {
  bookId: number;
  chapter: number;
}

let bibleTabDidResumeThisSession = false;

/**
 * First visit to the Bible tab's Books home PUSHes last-read (or today's verse)
 * so the nested stack is [Books, Reader] and Back can pop. Never replace —
 * replace made the reader the tab root and left GO_BACK unhandled.
 */
export function useResumeBibleTabChapter(enabled: boolean): void {
  const { translation } = useTranslation();
  const { userId, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const attemptRef = useRef(0);

  const openLastChapter = useCallback(async (attempt: number) => {
    try {
      let bookId: number | null = null;
      let chapter: number | null = null;

      if (isAuthenticated) {
        try {
          const response = await apiRequest(
            "GET",
            `/api/reading-history/recent?userId=${encodeURIComponent(userId)}`,
          );
          const recentReads = (await response.json()) as RecentRead[];
          const latest = recentReads[0];
          if (
            latest &&
            Number.isInteger(latest.bookId) &&
            latest.bookId > 0 &&
            Number.isInteger(latest.chapter) &&
            latest.chapter > 0
          ) {
            bookId = latest.bookId;
            chapter = latest.chapter;
          }
        } catch (historyError) {
          console.warn(
            "[BibleEntry] Unable to load recent reading; opening today's verse instead.",
            historyError,
          );
        }
      }

      if (bookId == null || chapter == null) {
        const parsed = parseScriptureReference(getTodaysVerse().reference);
        if (!parsed) return;
        bookId = parsed.bookId;
        chapter = parsed.chapter;
      }

      if (attempt !== attemptRef.current) return;
      if (bibleTabDidResumeThisSession) return;
      bibleTabDidResumeThisSession = true;
      router.push(bibleTabReaderPath(bookId, chapter, translation) as any);
    } catch (entryError) {
      console.warn("[BibleEntry] The Bible reader could not be opened.", entryError);
    }
  }, [isAuthenticated, translation, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || isAuthLoading || bibleTabDidResumeThisSession) return;
      const attempt = ++attemptRef.current;
      void openLastChapter(attempt);
      return () => {
        attemptRef.current += 1;
      };
    }, [enabled, isAuthLoading, openLastChapter]),
  );
}
