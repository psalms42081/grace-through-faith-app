import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTranslationForLanguage } from "@/lib/bibleTranslationMap";
import { resolveContentLang } from "@/lib/content-language";
import i18n from "@/lib/i18n";

const TRANSLATION_KEY = "@grace-through-faith/translation";
const MANUAL_OVERRIDE_KEY = "@grace-through-faith/translation-manual";

interface TranslationContextType {
  translation: string;
  setTranslation: (t: string) => void;
}

const TranslationContext = createContext<TranslationContextType>({
  translation: "KJV",
  setTranslation: () => {},
});

async function resolveTranslation(): Promise<string> {
  const manualOverride = await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY);
  if (manualOverride) return manualOverride;

  const lang = resolveContentLang(i18n.language || "en");
  return getTranslationForLanguage(lang);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [translation, setTranslationState] = useState("KJV");
  const hasManualOverride = useRef(false);

  useEffect(() => {
    resolveTranslation().then((t) => {
      setTranslationState(t);
      AsyncStorage.getItem(MANUAL_OVERRIDE_KEY).then((v) => {
        hasManualOverride.current = !!v;
      });
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!hasManualOverride.current) {
        const lang = resolveContentLang(i18n.language || "en");
        const defaultTranslation = getTranslationForLanguage(lang);
        setTranslationState(defaultTranslation);
      }
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  const setTranslation = useCallback((t: string) => {
    setTranslationState(t);
    hasManualOverride.current = true;
    AsyncStorage.setItem(TRANSLATION_KEY, t);
    AsyncStorage.setItem(MANUAL_OVERRIDE_KEY, t);
  }, []);

  return (
    <TranslationContext.Provider value={{ translation, setTranslation }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
