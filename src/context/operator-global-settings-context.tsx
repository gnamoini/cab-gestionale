"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { readOperatorGlobalSettingsDbEnabledFromRows } from "@/lib/permissions/operator-global-settings";
import { resolvePilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import type { PilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";

export type OperatorGlobalSettingsContextValue = PilotSettingsState & {
  /** @deprecated Usare effectiveEnabled */
  isPilotActive: boolean;
  isLoading: boolean;
};

const OperatorGlobalSettingsContext = createContext<OperatorGlobalSettingsContextValue | null>(null);

export function OperatorGlobalSettingsProvider({ children }: { children: ReactNode }) {
  const q = useCabAppSettingsPayloadQuery();
  const dbEnabled = useMemo(
    () => readOperatorGlobalSettingsDbEnabledFromRows(q.data?.rows),
    [q.data?.rows],
  );
  const pilot = useMemo(() => resolvePilotSettingsState(dbEnabled), [dbEnabled]);
  const value = useMemo(
    (): OperatorGlobalSettingsContextValue => ({
      ...pilot,
      isPilotActive: pilot.effectiveEnabled,
      isLoading: q.isPending && !q.data && !getRuntimeCabAppSettings(),
    }),
    [pilot, q.isPending, q.data],
  );

  return (
    <OperatorGlobalSettingsContext.Provider value={value}>{children}</OperatorGlobalSettingsContext.Provider>
  );
}

export function useOperatorGlobalSettings(): OperatorGlobalSettingsContextValue {
  const ctx = useContext(OperatorGlobalSettingsContext);
  if (!ctx) {
    const pilot = resolvePilotSettingsState(false);
    return { ...pilot, isPilotActive: false, isLoading: false };
  }
  return ctx;
}
