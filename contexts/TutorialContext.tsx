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
  | "family-dashboard"
  | "spiritual-rings"
  | "home_daily_rhythm"
  | "home_for_you"
  | "home_formation_rings"
  | "home_kids_button"
  | "read_verse_tap"
  | "read_translation_picker"
  | "connect_tab"
  | "connect_find_church"
  | "study_tab"
  | "study_four_layers_intro"
  | "study_layer_observe"
  | "study_layer_context"
  | "study_layer_insight"
  | "study_layer_respond"
  | "study_quick_read"
  | "study_guided_study"
  | "study_deep_dive"
  | "inductive_progress_bar"
  | "ss_depth_quick"
  | "ss_depth_standard"
  | "ss_depth_deep"
  | "ss_discussion_generate";

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
