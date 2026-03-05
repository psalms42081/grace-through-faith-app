import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@grace-through-faith/tutorials-seen";

export type TutorialId =
  | "home"
  | "four-layer-study"
  | "bible-reader"
  | "connect"
  | "explore"
  | "profile"
  | "prayer-journal"
  | "family-dashboard";

interface TutorialContextType {
  hasSeenTutorial: (id: TutorialId) => boolean;
  markTutorialSeen: (id: TutorialId) => void;
  resetTutorial: (id: TutorialId) => void;
  resetAllTutorials: () => void;
  isLoaded: boolean;
}

const TutorialContext = createContext<TutorialContextType>({
  hasSeenTutorial: () => false,
  markTutorialSeen: () => {},
  resetTutorial: () => {},
  resetAllTutorials: () => {},
  isLoaded: false,
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [seenSet, setSeenSet] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) setSeenSet(new Set(arr));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const persist = useCallback((next: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  const hasSeenTutorial = useCallback(
    (id: TutorialId) => seenSet.has(id),
    [seenSet],
  );

  const markTutorialSeen = useCallback(
    (id: TutorialId) => {
      setSeenSet((prev) => {
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetTutorial = useCallback(
    (id: TutorialId) => {
      setSeenSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetAllTutorials = useCallback(() => {
    const next = new Set<string>();
    setSeenSet(next);
    persist(next);
  }, [persist]);

  return (
    <TutorialContext.Provider
      value={{ hasSeenTutorial, markTutorialSeen, resetTutorial, resetAllTutorials, isLoaded }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
