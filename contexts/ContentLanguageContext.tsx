import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  initContentLanguage,
  getContentLanguage,
  setContentLanguage as persistContentLang,
  resolveContentLang,
  type ContentLanguageOption,
} from "@/lib/content-language";
import { useTranslation } from "react-i18next";

interface ContentLanguageContextValue {
  contentLangOption: ContentLanguageOption;
  resolvedLang: string;
  setContentLang: (code: ContentLanguageOption) => Promise<void>;
}

const ContentLanguageContext = createContext<ContentLanguageContextValue>({
  contentLangOption: "same",
  resolvedLang: "en",
  setContentLang: async () => {},
});

export function ContentLanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [option, setOption] = useState<ContentLanguageOption>(getContentLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initContentLanguage().then(() => {
      setOption(getContentLanguage());
      setReady(true);
    });
  }, []);

  const resolved = resolveContentLang(i18n.language || "en");

  const setContentLang = useCallback(async (code: ContentLanguageOption) => {
    await persistContentLang(code);
    setOption(code);
  }, []);

  if (!ready) return null;

  return (
    <ContentLanguageContext.Provider value={{ contentLangOption: option, resolvedLang: resolved, setContentLang }}>
      {children}
    </ContentLanguageContext.Provider>
  );
}

export function useContentLanguage() {
  return useContext(ContentLanguageContext);
}
