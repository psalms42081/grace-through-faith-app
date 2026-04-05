/**
 * TranslateToggle — appears on content screens when the user's language is non-English.
 * Lets users toggle between "Translated" and "Keep in English" for that screen's content.
 *
 * Usage:
 *   const { contentLang, showToggle, isTranslated, toggleTranslation } = useTranslateToggle();
 *
 *   <TranslateToggle />   ← place near the top of the content area
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { resolveContentLang } from "@/lib/content-language";

// ── Context ──────────────────────────────────────────────────────────────────

interface TranslateCtx {
  /** The resolved language that should be sent to the server */
  contentLang: string;
  /** Whether we should show the toggle button at all */
  showToggle: boolean;
  /** true = content is being shown translated; false = show English */
  isTranslated: boolean;
  /** Flip the toggle */
  toggleTranslation: () => void;
}

const TranslateContext = createContext<TranslateCtx>({
  contentLang: "en",
  showToggle: false,
  isTranslated: true,
  toggleTranslation: () => {},
});

export function TranslateProvider({ children }: { children: React.ReactNode }) {
  const appLang = i18n.language || "en";
  const resolved = resolveContentLang(appLang);
  const showToggle = resolved !== "en";

  const [isTranslated, setIsTranslated] = useState(true);

  // Re-evaluate when app language changes
  useEffect(() => {
    setIsTranslated(true);
  }, [appLang]);

  const toggleTranslation = useCallback(() => {
    setIsTranslated((prev) => !prev);
  }, []);

  const contentLang = isTranslated ? resolved : "en";

  return (
    <TranslateContext.Provider value={{ contentLang, showToggle, isTranslated, toggleTranslation }}>
      {children}
    </TranslateContext.Provider>
  );
}

export function useTranslateToggle() {
  return useContext(TranslateContext);
}

// ── UI Component ──────────────────────────────────────────────────────────────

export default function TranslateToggle() {
  const { t } = useTranslation();
  const { showToggle, isTranslated, toggleTranslation } = useTranslateToggle();

  if (!showToggle) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleTranslation}
        style={[styles.pill, isTranslated ? styles.pillTranslated : styles.pillEnglish]}
        activeOpacity={0.75}
      >
        <Text style={styles.globe}>🌐</Text>
        <Text style={styles.label}>
          {isTranslated ? t("content.keepInEnglish", "Keep in English") : t("content.translatePage", "Translate page")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pillTranslated: {
    backgroundColor: "rgba(100, 180, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(100, 180, 255, 0.4)",
  },
  pillEnglish: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  globe: {
    fontSize: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a0c8ff",
    letterSpacing: 0.3,
  },
});
