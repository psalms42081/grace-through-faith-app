import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KIDS_MODE_KEY = "@grace-through-faith/kids-mode";
const KIDS_PIN_KEY = "@grace-through-faith/kids-pin";
const KIDS_AGE_GROUP_KEY = "@grace-through-faith/kids-age-group";

type AgeGroup = "little_lambs" | "young_disciples";

interface KidsModeContextType {
  isKidsMode: boolean;
  isLoading: boolean;
  ageGroup: AgeGroup;
  pin: string | null;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  enterKidsMode: (ageGroup?: AgeGroup) => Promise<void>;
  exitKidsMode: (pin: string) => Promise<boolean>;
  setAgeGroup: (group: AgeGroup) => Promise<void>;
}

const KidsModeContext = createContext<KidsModeContextType>({
  isKidsMode: false,
  isLoading: true,
  ageGroup: "little_lambs",
  pin: null,
  setPin: async () => {},
  verifyPin: () => false,
  enterKidsMode: async () => {},
  exitKidsMode: async () => false,
  setAgeGroup: async () => {},
});

export function KidsModeProvider({ children }: { children: React.ReactNode }) {
  const [isKidsMode, setIsKidsMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPinState] = useState<string | null>(null);
  const [ageGroup, setAgeGroupState] = useState<AgeGroup>("little_lambs");

  useEffect(() => {
    (async () => {
      try {
        const [pinVal, ageVal] = await Promise.all([
          AsyncStorage.getItem(KIDS_PIN_KEY),
          AsyncStorage.getItem(KIDS_AGE_GROUP_KEY),
        ]);
        await AsyncStorage.setItem(KIDS_MODE_KEY, "false");
        setIsKidsMode(false);
        setPinState(pinVal);
        if (ageVal === "little_lambs" || ageVal === "young_disciples") {
          setAgeGroupState(ageVal);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const setPin = useCallback(async (newPin: string) => {
    await AsyncStorage.setItem(KIDS_PIN_KEY, newPin);
    setPinState(newPin);
  }, []);

  const verifyPin = useCallback(
    (attempt: string) => {
      if (!pin) return true;
      return attempt === pin;
    },
    [pin]
  );

  const enterKidsMode = useCallback(
    async (group?: AgeGroup) => {
      setIsKidsMode(true);
      await AsyncStorage.setItem(KIDS_MODE_KEY, "true");
      if (group) {
        setAgeGroupState(group);
        await AsyncStorage.setItem(KIDS_AGE_GROUP_KEY, group);
      }
    },
    []
  );

  const exitKidsMode = useCallback(
    async (attempt: string) => {
      if (!verifyPin(attempt)) return false;
      setIsKidsMode(false);
      await AsyncStorage.setItem(KIDS_MODE_KEY, "false");
      return true;
    },
    [verifyPin]
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
        setPin,
        verifyPin,
        enterKidsMode,
        exitKidsMode,
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
