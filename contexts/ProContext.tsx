import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import MissionInviteModal from "@/components/MissionInviteModal";

interface ProContextType {
  isPro: boolean;
  isPatron: boolean;
  isLoading: boolean;
  showProGate: () => void;
  trackActivity: (featureType: string) => void;
}

const ProContext = createContext<ProContextType>({
  isPro: false,
  isPatron: false,
  isLoading: true,
  showProGate: () => {},
  trackActivity: () => {},
});

export function useProStatus() {
  return useContext(ProContext);
}

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [donating, setDonating] = useState(false);
  const qc = useQueryClient();
  const activityCheckDone = useRef(false);

  const { data, isLoading } = useQuery<{ isPro: boolean; isPatron: boolean; donationAmount: number }>({
    queryKey: ["/api/user/pro-status?userId=guest"],
  });

  const { data: missionData } = useQuery<{ shouldInvite: boolean; isPatron: boolean; totalUses: number }>({
    queryKey: ["/api/user/mission-status?userId=guest"],
  });

  const isPro = data?.isPro ?? true;
  const isPatron = data?.isPatron ?? false;

  useEffect(() => {
    if (missionData?.shouldInvite && !isPatron && !activityCheckDone.current) {
      activityCheckDone.current = true;
      const timer = setTimeout(() => setModalVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [missionData, isPatron]);

  const showProGate = useCallback(() => {
    if (!isPatron) {
      setModalVisible(true);
    }
  }, [isPatron]);

  const trackActivity = useCallback(async (featureType: string) => {
    try {
      await apiRequest("POST", "/api/user/track-activity", {
        userId: "guest",
        featureType,
      });
      qc.invalidateQueries({ queryKey: ["/api/user/mission-status?userId=guest"] });
    } catch {}
  }, [qc]);

  const handleDonate = useCallback(async (amount: number) => {
    setDonating(true);
    try {
      await apiRequest("POST", "/api/user/donate", { userId: "guest", amount });
      qc.setQueryData(["/api/user/pro-status?userId=guest"], {
        isPro: true,
        isPatron: true,
        donationAmount: amount,
      });
      qc.invalidateQueries({ queryKey: ["/api/user/mission-status?userId=guest"] });
    } catch (e) {
      console.error("Donation error:", e);
    } finally {
      setDonating(false);
    }
  }, [qc]);

  const handleClose = useCallback(async () => {
    setModalVisible(false);
    if (!isPatron) {
      try {
        await apiRequest("POST", "/api/user/dismiss-mission-invite", { userId: "guest" });
        qc.invalidateQueries({ queryKey: ["/api/user/mission-status?userId=guest"] });
      } catch {}
    }
  }, [isPatron, qc]);

  return (
    <ProContext.Provider value={{ isPro, isPatron, isLoading, showProGate, trackActivity }}>
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
