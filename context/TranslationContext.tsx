import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRANSLATION_KEY = "@grace-through-faith/translation";

interface TranslationContextType {
  translation: string;
  setTranslation: (t: string) => void;
}

const TranslationContext = createContext<TranslationContextType>({
  translation: "KJV",
  setTranslation: () => {},
});

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [translation, setTranslationState] = useState("KJV");

  useEffect(() => {
    AsyncStorage.getItem(TRANSLATION_KEY).then((val) => {
      if (val) setTranslationState(val);
    });
  }, []);

  const setTranslation = useCallback((t: string) => {
    setTranslationState(t);
    AsyncStorage.setItem(TRANSLATION_KEY, t);
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
