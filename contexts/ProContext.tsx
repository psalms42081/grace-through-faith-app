import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MissionInviteModal from "@/components/MissionInviteModal";
import { ENABLE_PREMIUM } from "@/lib/feature-flags";

const COOLDOWN_KEY = "@grace-through-faith/mission-invite-last-shown";
const COOLDOWN_DAYS = 7;

interface ProContextType {
  isPro: boolean;
  isPatron: boolean;
  isLoading: boolean;
  showProGate: () => void;
  trackActivity: (featureType: string) => void;
  triggerMissionInvite: () => void;
}

const ProContext = createContext<ProContextType>({
  isPro: false,
  isPatron: false,
  isLoading: true,
  showProGate: () => {},
  trackActivity: () => {},
  triggerMissionInvite: () => {},
});

export function useProStatus() {
  return useContext(ProContext);
}

async function canShowInvite(): Promise<boolean> {
  try {
    const lastShown = await AsyncStorage.getItem(COOLDOWN_KEY);
    if (!lastShown) return true;
    const elapsed = Date.now() - parseInt(lastShown, 10);
    return elapsed >= COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

async function markInviteShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {}
}

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [donating, setDonating] = useState(false);
  const qc = useQueryClient();
  const { userId } = useAuth();

  const { data, isLoading } = useQuery<{ isPro: boolean; isPatron: boolean; donationAmount: number }>({
    queryKey: [`/api/user/pro-status?userId=${userId}`],
  });

  const isPro = data?.isPro ?? false;
  const isPatron = data?.isPatron ?? false;

  const triggerMissionInvite = useCallback(async () => {
    if (isPatron) return;
    const allowed = await canShowInvite();
    if (!allowed) return;
    await markInviteShown();
    setTimeout(() => setModalVisible(true), 1500);
  }, [isPatron]);

  const showProGate = useCallback(() => {
    if (!ENABLE_PREMIUM) return;
    if (!isPatron) {
      setModalVisible(true);
    }
  }, [isPatron]);

  const trackActivity = useCallback(async (featureType: string) => {
    try {
      await apiRequest("POST", "/api/user/track-activity", {
        userId,
        featureType,
      });
    } catch {}
  }, [userId]);

  const handleDonate = useCallback(async (amount: number) => {
    setDonating(true);
    try {
      await apiRequest("POST", "/api/user/donate", { userId, amount });
      qc.setQueryData([`/api/user/pro-status?userId=${userId}`], {
        isPro: true,
        isPatron: true,
        donationAmount: amount,
      });
    } catch (e) {
      console.error("Donation error:", e);
    } finally {
      setDonating(false);
    }
  }, [qc, userId]);

  const handleClose = useCallback(async () => {
    setModalVisible(false);
    if (!isPatron) {
      try {
        await apiRequest("POST", "/api/user/dismiss-mission-invite", { userId });
      } catch {}
    }
  }, [isPatron, userId]);

  return (
    <ProContext.Provider value={{ isPro, isPatron, isLoading, showProGate, trackActivity, triggerMissionInvite }}>
      {children}
      <MissionInviteModal
        visible={modalVisible}
        onClose={handleClose}
        onDonate={handleDonate}
        isDonating={donating}
      />
    </ProContext.Provider>
  );
}
