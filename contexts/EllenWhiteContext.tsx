import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EllenWhiteStep, ONBOARDING_STEPS } from "@/constants/ellenWhiteSteps";

const ONBOARDING_COMPLETE_KEY = "@gtf/ellen-white-onboarding-complete";
const GUIDES_SEEN_KEY = "@gtf/ellen-white-guides-seen";
const GUIDE_ENABLED_KEY = "@gtf/ellen-white-guide-enabled";

interface EllenWhiteState {
  isVisible: boolean;
  currentSteps: EllenWhiteStep[];
  currentStepIndex: number;
  mode: "onboarding" | "feature-guide" | null;
  onboardingComplete: boolean;
  guidesSeen: Set<string>;
  guideEnabled: boolean;
}

interface EllenWhiteContextType extends EllenWhiteState {
  showOnboarding: () => void;
  showFeatureGuide: (featureId: string, steps: EllenWhiteStep | EllenWhiteStep[]) => void;
  tryAutoGuide: (featureId: string, steps: EllenWhiteStep | EllenWhiteStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  dismiss: () => void;
  hasSeenGuide: (featureId: string) => boolean;
  setGuideEnabled: (enabled: boolean) => void;
  isReady: boolean;
}

const EllenWhiteContext = createContext<EllenWhiteContextType | null>(null);

export function EllenWhiteProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<EllenWhiteState>({
    isVisible: false,
    currentSteps: [],
    currentStepIndex: 0,
    mode: null,
    onboardingComplete: true,
    guidesSeen: new Set(),
    guideEnabled: true,
  });

  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = async () => {
    try {
      const [onboardingStr, guidesStr, enabledStr] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
        AsyncStorage.getItem(GUIDES_SEEN_KEY),
        AsyncStorage.getItem(GUIDE_ENABLED_KEY),
      ]);

      const onboardingComplete = onboardingStr === "true";
      const guidesSeen = guidesStr ? new Set<string>(JSON.parse(guidesStr)) : new Set<string>();
      const guideEnabled = enabledStr !== "false";

      setState((prev) => ({
        ...prev,
        onboardingComplete,
        guidesSeen,
        guideEnabled,
      }));
      setIsReady(true);
    } catch {
      setIsReady(true);
    }
  };

  const showOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVisible: true,
      currentSteps: ONBOARDING_STEPS,
      currentStepIndex: 0,
      mode: "onboarding",
    }));
  }, []);

  const normalizeSteps = (steps: EllenWhiteStep | EllenWhiteStep[]): EllenWhiteStep[] =>
    Array.isArray(steps) ? steps : [steps];

  const showFeatureGuide = useCallback((featureId: string, steps: EllenWhiteStep | EllenWhiteStep[]) => {
    const stepsArr = normalizeSteps(steps);
    setState((prev) => {
      const updatedSeen = new Set(prev.guidesSeen);
      updatedSeen.add(featureId);
      AsyncStorage.setItem(GUIDES_SEEN_KEY, JSON.stringify([...updatedSeen])).catch(() => {});
      return {
        ...prev,
        isVisible: true,
        currentSteps: stepsArr,
        currentStepIndex: 0,
        mode: "feature-guide" as const,
        guidesSeen: updatedSeen,
      };
    });
  }, []);

  const tryAutoGuide = useCallback((featureId: string, steps: EllenWhiteStep | EllenWhiteStep[]) => {
    setState((prev) => {
      if (!prev.guideEnabled || prev.guidesSeen.has(featureId) || prev.isVisible) {
        return prev;
      }
      const stepsArr = normalizeSteps(steps);
      const updatedSeen = new Set(prev.guidesSeen);
      updatedSeen.add(featureId);
      AsyncStorage.setItem(GUIDES_SEEN_KEY, JSON.stringify([...updatedSeen])).catch(() => {});
      return {
        ...prev,
        isVisible: true,
        currentSteps: stepsArr,
        currentStepIndex: 0,
        mode: "feature-guide" as const,
        guidesSeen: updatedSeen,
      };
    });
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStepIndex < prev.currentSteps.length - 1) {
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      }
      if (prev.mode === "onboarding") {
        AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true").catch(() => {});
      }
      return {
        ...prev,
        isVisible: false,
        currentSteps: [],
        currentStepIndex: 0,
        mode: null,
        onboardingComplete: prev.mode === "onboarding" ? true : prev.onboardingComplete,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      if (prev.mode === "onboarding") {
        AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true").catch(() => {});
      }
      return {
        ...prev,
        isVisible: false,
        currentSteps: [],
        currentStepIndex: 0,
        mode: null,
        onboardingComplete: prev.mode === "onboarding" ? true : prev.onboardingComplete,
      };
    });
  }, []);

  const hasSeenGuide = useCallback(
    (featureId: string) => state.guidesSeen.has(featureId),
    [state.guidesSeen]
  );

  const setGuideEnabled = useCallback((enabled: boolean) => {
    AsyncStorage.setItem(GUIDE_ENABLED_KEY, enabled ? "true" : "false").catch(() => {});
    setState((prev) => ({ ...prev, guideEnabled: enabled }));
  }, []);

  return (
    <EllenWhiteContext.Provider
      value={{
        ...state,
        showOnboarding,
        showFeatureGuide,
        tryAutoGuide,
        nextStep,
        prevStep,
        dismiss,
        hasSeenGuide,
        setGuideEnabled,
        isReady,
      }}
    >
      {children}
    </EllenWhiteContext.Provider>
  );
}

export function useEllenWhite(): EllenWhiteContextType {
  const context = useContext(EllenWhiteContext);
  if (!context) {
    throw new Error("useEllenWhite must be used within an EllenWhiteProvider");
  }
  return context;
}
