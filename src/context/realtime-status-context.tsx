"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type RealtimeConnectionStatus = "connected" | "polling" | "idle";

type RealtimeStatusContextValue = {
  gestionale: RealtimeConnectionStatus;
  settings: RealtimeConnectionStatus;
  setGestionaleStatus: (s: RealtimeConnectionStatus) => void;
  setSettingsStatus: (s: RealtimeConnectionStatus) => void;
};

const RealtimeStatusContext = createContext<RealtimeStatusContextValue | null>(null);

export function RealtimeStatusProvider({ children }: { children: ReactNode }) {
  const [gestionale, setGestionaleStatus] = useState<RealtimeConnectionStatus>("idle");
  const [settings, setSettingsStatus] = useState<RealtimeConnectionStatus>("idle");
  const value = useMemo(
    () => ({ gestionale, settings, setGestionaleStatus, setSettingsStatus }),
    [gestionale, settings],
  );
  return <RealtimeStatusContext.Provider value={value}>{children}</RealtimeStatusContext.Provider>;
}

export function useRealtimeStatus() {
  const ctx = useContext(RealtimeStatusContext);
  if (!ctx) {
    return {
      gestionale: "idle" as RealtimeConnectionStatus,
      settings: "idle" as RealtimeConnectionStatus,
      setGestionaleStatus: () => undefined,
      setSettingsStatus: () => undefined,
    };
  }
  return ctx;
}
