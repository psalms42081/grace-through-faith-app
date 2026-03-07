import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type StudyDepth = "quick" | "standard" | "deep";

export interface DepthConfig {
  key: StudyDepth;
  label: string;
  minutes: number;
  icon: string;
  tagline: string;
  description: string;
}

export const DEPTH_CONFIGS: Record<StudyDepth, DepthConfig> = {
  quick: {
    key: "quick",
    label: "Quick",
    minutes: 5,
    icon: "flash-outline",
    tagline: "Key Insight & Action",
    description: "1 Verse \u2022 Key Insight \u2022 Action Item",
  },
  standard: {
    key: "standard",
    label: "Standard",
    minutes: 15,
    icon: "book-outline",
    tagline: "Full Lesson",
    description: "Commentary, application & reflection",
  },
  deep: {
    key: "deep",
    label: "Deep Dive",
    minutes: 30,
    icon: "telescope-outline",
    tagline: "Scholarly Study",
    description: "Word studies, EGW, cross-references",
  },
};

interface StudyDepthContextValue {
  depth: StudyDepth;
  setDepth: (d: StudyDepth) => void;
  depthConfig: DepthConfig;
  allConfigs: DepthConfig[];
}

const STORAGE_KEY = "@grace-through-faith/study-depth";

const StudyDepthContext = createContext<StudyDepthContextValue | null>(null);

export function StudyDepthProvider({ children }: { children: ReactNode }) {
  const [depth, setDepthState] = useState<StudyDepth>("standard");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === "quick" || val === "standard" || val === "deep") {
          setDepthState(val);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setDepth = useCallback((d: StudyDepth) => {
    setDepthState(d);
    AsyncStorage.setItem(STORAGE_KEY, d).catch(() => {});
  }, []);

  const allConfigs = useMemo(() => Object.values(DEPTH_CONFIGS), []);

  const value = useMemo(
    () => ({
      depth,
      setDepth,
      depthConfig: DEPTH_CONFIGS[depth],
      allConfigs,
    }),
    [depth, setDepth, allConfigs]
  );

  if (!loaded) return null;

  return (
    <StudyDepthContext.Provider value={value}>
      {children}
    </StudyDepthContext.Provider>
  );
}

export function useStudyDepth() {
  const ctx = useContext(StudyDepthContext);
  if (!ctx) {
    throw new Error("useStudyDepth must be used within a StudyDepthProvider");
  }
  return ctx;
}
