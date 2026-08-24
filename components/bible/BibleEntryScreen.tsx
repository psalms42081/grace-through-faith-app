import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getTodaysVerse } from "@/components/home-v2/home-data";
import { useTranslation } from "@/context/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";
import { SWEEP_LIGHT } from "@/constants/light-sweep";
import { apiRequest } from "@/lib/query-client";
import { parseScriptureReference } from "@/lib/scripture-reference";

interface RecentRead {
  bookId: number;
  chapter: number;
}

interface PassageDestination {
  bookId: number;
  chapter: number;
}

export default function BibleEntryScreen() {
  const { translation } = useTranslation();
  const { userId, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(0);

  const openBible = useCallback(async () => {
    const attempt = ++attemptRef.current;
    setError(null);

    try {
      let destination: PassageDestination | null = null;

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
            destination = {
              bookId: latest.bookId,
              chapter: latest.chapter,
            };
          }
        } catch (historyError) {
          console.warn(
            "[BibleEntry] Unable to load recent reading; opening today's verse instead.",
            historyError,
          );
        }
      }

      if (!destination) {
        const parsed = parseScriptureReference(getTodaysVerse().reference);
        if (!parsed) {
          throw new Error("Today's Scripture reference could not be opened.");
        }
        destination = {
          bookId: parsed.bookId,
          chapter: parsed.chapter,
        };
      }

      if (attempt !== attemptRef.current) return;

      router.replace({
        pathname: "/(tabs)/read/[bookId]/[chapter]" as any,
        params: {
          bookId: String(destination.bookId),
          chapter: String(destination.chapter),
          translation,
        },
      });
    } catch (entryError) {
      if (attempt !== attemptRef.current) return;
      setError(
        entryError instanceof Error
          ? entryError.message
          : "The Bible reader could not be opened.",
      );
    }
  }, [isAuthenticated, translation, userId]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthLoading) return;
      void openBible();

      return () => {
        attemptRef.current += 1;
      };
    }, [isAuthLoading, openBible]),
  );

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Ionicons
            name="alert-circle-outline"
            size={38}
            color={SWEEP_LIGHT.error}
          />
          <Text style={styles.title}>Unable to open the Bible</Text>
          <Text style={styles.message}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openBible()}
            style={styles.primaryButton}
            testID="retry-bible-entry"
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={SWEEP_LIGHT.accent} />
          <Text style={styles.loadingText}>Opening Scripture…</Text>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Browse all Bible books"
        onPress={() => router.replace("/book-picker")}
        style={styles.browseButton}
        testID="browse-bible-books-entry"
      >
        <Ionicons name="library-outline" size={17} color={SWEEP_LIGHT.accent} />
        <Text style={styles.browseButtonText}>Browse books</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SWEEP_LIGHT.background,
    paddingHorizontal: 32,
  },
  title: {
    marginTop: 16,
    color: SWEEP_LIGHT.text,
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    color: SWEEP_LIGHT.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 14,
    color: SWEEP_LIGHT.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 22,
    borderRadius: 999,
    backgroundColor: SWEEP_LIGHT.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  browseButton: {
    position: "absolute",
    bottom: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: SWEEP_LIGHT.accent + "14",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  browseButtonText: {
    color: SWEEP_LIGHT.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});