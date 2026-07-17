"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type RealtimeConnectionStatus = "connected" | "polling" | "idle";

type RealtimeStatusSetters = {
  setGestionaleStatus: (s: RealtimeConnectionStatus) => void;
  setSettingsStatus: (s: RealtimeConnectionStatus) => void;
};

const GestionaleStatusContext = createContext<RealtimeConnectionStatus>("idle");
const SettingsStatusContext = createContext<RealtimeConnectionStatus>("idle");
const RealtimeStatusSettersContext = createContext<RealtimeStatusSetters | null>(null);

export function RealtimeStatusProvider({ children }: { children: ReactNode }) {
  const [gestionale, setGestionaleStatus] = useState<RealtimeConnectionStatus>("idle");
  const [settings, setSettingsStatus] = useState<RealtimeConnectionStatus>("idle");
  const setters = useMemo(
    () => ({ setGestionaleStatus, setSettingsStatus }),
    [setGestionaleStatus, setSettingsStatus],
  );

  return (
    <RealtimeStatusSettersContext.Provider value={setters}>
      <GestionaleStatusContext.Provider value={gestionale}>
        <SettingsStatusContext.Provider value={settings}>{children}</SettingsStatusContext.Provider>
      </GestionaleStatusContext.Provider>
    </RealtimeStatusSettersContext.Provider>
  );
}

export function useGestionaleRealtimeStatus(): RealtimeConnectionStatus {
  return useContext(GestionaleStatusContext);
}

export function useSettingsRealtimeStatus(): RealtimeConnectionStatus {
  return useContext(SettingsStatusContext);
}

/** Selector — re-render solo su flip gestionale realtime. */
export function useRealtimeConnected(): boolean {
  return useGestionaleRealtimeStatus() === "connected";
}

export function useRealtimeStatusSetters(): RealtimeStatusSetters {
  const setters = useContext(RealtimeStatusSettersContext);
  return {
    setGestionaleStatus: setters?.setGestionaleStatus ?? (() => undefined),
    setSettingsStatus: setters?.setSettingsStatus ?? (() => undefined),
  };
}

export function useRealtimeStatus() {
  const gestionale = useGestionaleRealtimeStatus();
  const settings = useSettingsRealtimeStatus();
  const { setGestionaleStatus, setSettingsStatus } = useRealtimeStatusSetters();
  return {
    gestionale,
    settings,
    setGestionaleStatus,
    setSettingsStatus,
  };
}
