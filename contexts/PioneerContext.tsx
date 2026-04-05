import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PIONEERS, getPioneerById, getDefaultPioneer } from "@/constants/pioneers";
import type { Pioneer } from "@/constants/pioneers";
import { EllenWhiteStep, ONBOARDING_STEPS } from "@/constants/ellenWhiteSteps";
import { apiRequest } from "@/lib/query-client";

const ONBOARDING_COMPLETE_KEY = "@gtf/ellen-white-onboarding-complete";
const GUIDES_SEEN_KEY = "@gtf/ellen-white-guides-seen";
const GUIDE_ENABLED_KEY = "@gtf/ellen-white-guide-enabled";
const SELECTED_PIONEER_KEY = "@gtf/selected-pioneer";

interface PioneerState {
  isVisible: boolean;
  currentSteps: EllenWhiteStep[];
  currentStepIndex: number;
  mode: "onboarding" | "feature-guide" | null;
  onboardingComplete: boolean;
  guidesSeen: Set<string>;
  guideEnabled: boolean;
  selectedPioneerId: string;
}

interface PioneerContextType extends PioneerState {
  selectedPioneer: Pioneer;
  showOnboarding: () => void;
  showFeatureGuide: (featureId: string, steps: EllenWhiteStep | EllenWhiteStep[]) => void;
  tryAutoGuide: (featureId: string, steps: EllenWhiteStep | EllenWhiteStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  dismiss: () => void;
  hasSeenGuide: (featureId: string) => boolean;
  setGuideEnabled: (enabled: boolean) => void;
  selectPioneer: (pioneerId: string) => void;
  syncOnboardingFromServer: () => Promise<boolean>;
  isReady: boolean;
}

const PioneerContext = createContext<PioneerContextType | null>(null);

export function PioneerProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<PioneerState>({
    isVisible: false,
    currentSteps: [],
    currentStepIndex: 0,
    mode: null,
    onboardingComplete: true,
    guidesSeen: new Set(),
    guideEnabled: true,
    selectedPioneerId: "ellen-white",
  });

  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = async () => {
    try {
      const [onboardingStr, guidesStr, enabledStr, pioneerStr] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
        AsyncStorage.getItem(GUIDES_SEEN_KEY),
        AsyncStorage.getItem(GUIDE_ENABLED_KEY),
        AsyncStorage.getItem(SELECTED_PIONEER_KEY),
      ]);

      const onboardingComplete = onboardingStr === "true";
      const guidesSeen = guidesStr ? new Set<string>(JSON.parse(guidesStr)) : new Set<string>();
      const guideEnabled = enabledStr !== "false";
      const selectedPioneerId = pioneerStr && getPioneerById(pioneerStr) ? pioneerStr : "ellen-white";

      setState((prev) => ({
        ...prev,
        onboardingComplete,
        guidesSeen,
        guideEnabled,
        selectedPioneerId,
      }));
      setIsReady(true);
    } catch {
      setIsReady(true);
    }
  };

  const syncOnboardingFromServer = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      if (data.user && !data.isGuest) {
        const serverSeen = data.user.hologramOnboardingSeen === true;
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, serverSeen ? "true" : "false");
        setState((prev) => ({ ...prev, onboardingComplete: serverSeen }));
        return serverSeen;
      }
    } catch {}
    return state.onboardingComplete;
  }, [state.onboardingComplete]);

  const selectedPioneer = getPioneerById(state.selectedPioneerId) || getDefaultPioneer();

  const selectPioneer = useCallback((pioneerId: string) => {
    const pioneer = getPioneerById(pioneerId);
    if (!pioneer) return;
    AsyncStorage.setItem(SELECTED_PIONEER_KEY, pioneerId).catch(() => {});
    setState((prev) => ({ ...prev, selectedPioneerId: pioneerId }));
  }, []);

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

  const markOnboardingCompleteOnServer = useCallback(() => {
    apiRequest("POST", "/api/pioneer/onboarding-complete").catch(() => {});
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStepIndex < prev.currentSteps.length - 1) {
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      }
      if (prev.mode === "onboarding") {
        AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true").catch(() => {});
        markOnboardingCompleteOnServer();
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
  }, [markOnboardingCompleteOnServer]);

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
        markOnboardingCompleteOnServer();
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
  }, [markOnboardingCompleteOnServer]);

  const hasSeenGuide = useCallback(
    (featureId: string) => state.guidesSeen.has(featureId),
    [state.guidesSeen]
  );

  const setGuideEnabled = useCallback((enabled: boolean) => {
    AsyncStorage.setItem(GUIDE_ENABLED_KEY, enabled ? "true" : "false").catch(() => {});
    setState((prev) => ({ ...prev, guideEnabled: enabled }));
  }, []);

  return (
    <PioneerContext.Provider
      value={{
        ...state,
        selectedPioneer,
        showOnboarding,
        showFeatureGuide,
        tryAutoGuide,
        nextStep,
        prevStep,
        dismiss,
        hasSeenGuide,
        setGuideEnabled,
        selectPioneer,
        syncOnboardingFromServer,
        isReady,
      }}
    >
      {children}
    </PioneerContext.Provider>
  );
}

export function usePioneer(): PioneerContextType {
  const context = useContext(PioneerContext);
  if (!context) {
    throw new Error("usePioneer must be used within a PioneerProvider");
  }
  return context;
}

export function useEllenWhite(): PioneerContextType {
  return usePioneer();
}
