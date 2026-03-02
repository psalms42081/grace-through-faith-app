import React, { createContext, useContext, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import ProGateModal from "@/components/ProGateModal";

interface ProContextType {
  isPro: boolean;
  isLoading: boolean;
  showProGate: () => void;
}

const ProContext = createContext<ProContextType>({
  isPro: false,
  isLoading: true,
  showProGate: () => {},
});

export function useProStatus() {
  return useContext(ProContext);
}

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ isPro: boolean }>({
    queryKey: ["/api/user/pro-status?userId=guest"],
  });

  const isPro = data?.isPro ?? false;

  const showProGate = useCallback(() => {
    if (!isPro) setModalVisible(true);
  }, [isPro]);

  const handleStartTrial = useCallback(async () => {
    setTrialLoading(true);
    try {
      await apiRequest("POST", "/api/user/start-trial", { userId: "guest" });
      qc.setQueryData(["/api/user/pro-status?userId=guest"], { isPro: true });
      setModalVisible(false);
    } catch (e) {
      console.error("Trial start error:", e);
    } finally {
      setTrialLoading(false);
    }
  }, [qc]);

  return (
    <ProContext.Provider value={{ isPro, isLoading, showProGate }}>
      {children}
      <ProGateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStartTrial={handleStartTrial}
        isLoading={trialLoading}
      />
    </ProContext.Provider>
  );
}
