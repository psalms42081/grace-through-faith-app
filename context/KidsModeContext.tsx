import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KIDS_MODE_KEY = "@grace-through-faith/kids-mode";
const KIDS_PIN_KEY = "@grace-through-faith/kids-pin";
const KIDS_AGE_GROUP_KEY = "@grace-through-faith/kids-age-group";
const KIDS_ACTIVE_CHILD_ID_KEY = "@grace-through-faith/kids-active-child-id";
const KIDS_ACTIVE_CHILD_NAME_KEY = "@grace-through-faith/kids-active-child-name";

export type AgeGroup = "little_lambs" | "young_disciples" | "young_disciples_plus";

interface KidsModeContextType {
  isKidsMode: boolean;
  isLoading: boolean;
  ageGroup: AgeGroup;
  pin: string | null;
  activeChildProfileId: string | null;
  activeChildName: string | null;
  lastActiveChildId: string | null;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  verifyPin: (pin: string) => boolean;
  enterKidsMode: (childId: string, childName: string, ageGroup: AgeGroup) => Promise<void>;
  exitKidsMode: (pin: string) => Promise<boolean>;
  switchChild: (childId: string, childName: string, ageGroup: AgeGroup) => Promise<void>;
  setAgeGroup: (group: AgeGroup) => Promise<void>;
}

const KidsModeContext = createContext<KidsModeContextType>({
  isKidsMode: false,
  isLoading: true,
  ageGroup: "little_lambs",
  pin: null,
  activeChildProfileId: null,
  activeChildName: null,
  lastActiveChildId: null,
  setPin: async () => {},
  removePin: async () => {},
  verifyPin: () => false,
  enterKidsMode: async () => {},
  exitKidsMode: async () => false,
  switchChild: async () => {},
  setAgeGroup: async () => {},
});

export function KidsModeProvider({ children }: { children: React.ReactNode }) {
  const [isKidsMode, setIsKidsMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPinState] = useState<string | null>(null);
  const [ageGroup, setAgeGroupState] = useState<AgeGroup>("little_lambs");
  const [activeChildProfileId, setActiveChildProfileId] = useState<string | null>(null);
  const [activeChildName, setActiveChildName] = useState<string | null>(null);
  const [lastActiveChildId, setLastActiveChildId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [pinVal, ageVal, childId, childName] = await Promise.all([
          AsyncStorage.getItem(KIDS_PIN_KEY),
          AsyncStorage.getItem(KIDS_AGE_GROUP_KEY),
          AsyncStorage.getItem(KIDS_ACTIVE_CHILD_ID_KEY),
          AsyncStorage.getItem(KIDS_ACTIVE_CHILD_NAME_KEY),
        ]);
        await AsyncStorage.setItem(KIDS_MODE_KEY, "false");
        setIsKidsMode(false);
        setPinState(pinVal);
        if (ageVal === "little_lambs" || ageVal === "young_disciples" || ageVal === "young_disciples_plus") {
          setAgeGroupState(ageVal);
        }
        if (childId) {
          setLastActiveChildId(childId);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const setPin = useCallback(async (newPin: string) => {
    await AsyncStorage.setItem(KIDS_PIN_KEY, newPin);
    setPinState(newPin);
  }, []);

  const removePin = useCallback(async () => {
    await AsyncStorage.removeItem(KIDS_PIN_KEY);
    setPinState(null);
  }, []);

  const verifyPin = useCallback(
    (attempt: string) => {
      if (!pin) return true;
      return attempt === pin;
    },
    [pin]
  );

  const enterKidsMode = useCallback(
    async (childId: string, childName: string, childAgeGroup: AgeGroup) => {
      setIsKidsMode(true);
      setActiveChildProfileId(childId);
      setActiveChildName(childName);
      setLastActiveChildId(childId);
      setAgeGroupState(childAgeGroup);
      await Promise.all([
        AsyncStorage.setItem(KIDS_MODE_KEY, "true"),
        AsyncStorage.setItem(KIDS_AGE_GROUP_KEY, childAgeGroup),
        AsyncStorage.setItem(KIDS_ACTIVE_CHILD_ID_KEY, childId),
        AsyncStorage.setItem(KIDS_ACTIVE_CHILD_NAME_KEY, childName),
      ]);
    },
    []
  );

  const exitKidsMode = useCallback(
    async (attempt: string) => {
      if (!verifyPin(attempt)) return false;
      setIsKidsMode(false);
      setActiveChildProfileId(null);
      setActiveChildName(null);
      await AsyncStorage.setItem(KIDS_MODE_KEY, "false");
      return true;
    },
    [verifyPin]
  );

  const switchChild = useCallback(
    async (childId: string, childName: string, childAgeGroup: AgeGroup) => {
      setActiveChildProfileId(childId);
      setActiveChildName(childName);
      setLastActiveChildId(childId);
      setAgeGroupState(childAgeGroup);
      await Promise.all([
        AsyncStorage.setItem(KIDS_AGE_GROUP_KEY, childAgeGroup),
        AsyncStorage.setItem(KIDS_ACTIVE_CHILD_ID_KEY, childId),
        AsyncStorage.setItem(KIDS_ACTIVE_CHILD_NAME_KEY, childName),
      ]);
    },
    []
  );

  const setAgeGroup = useCallback(async (group: AgeGroup) => {
    setAgeGroupState(group);
    await AsyncStorage.setItem(KIDS_AGE_GROUP_KEY, group);
  }, []);

  return (
    <KidsModeContext.Provider
      value={{
        isKidsMode,
        isLoading,
        ageGroup,
        pin,
        activeChildProfileId,
        activeChildName,
        lastActiveChildId,
        setPin,
        removePin,
        verifyPin,
        enterKidsMode,
        exitKidsMode,
        switchChild,
        setAgeGroup,
      }}
    >
      {children}
    </KidsModeContext.Provider>
  );
}

export function useKidsMode() {
  return useContext(KidsModeContext);
}
