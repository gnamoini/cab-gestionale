"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useControlTowerMetrics } from "@/src/hooks/view/use-control-tower-metrics";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import type { composeControlTowerSlices } from "@/lib/dashboard/control-tower-selectors";

type ControlTowerSlices = ReturnType<typeof composeControlTowerSlices> & {
  headerKpi: ReturnType<typeof composeControlTowerSlices>["headerKpi"];
};

type ControlTowerContextValue = {
  staging: boolean;
  visibleWidgets: DashboardWidgetDefinition[];
  slices: ControlTowerSlices | null;
  isLoading: boolean;
  canPreventivi: boolean;
  canFatturazione: boolean;
};

const ControlTowerMetricsContext = createContext<ControlTowerContextValue | null>(null);

export function ControlTowerMetricsProvider({ children }: { children: ReactNode }) {
  const value = useControlTowerMetrics();
  return <ControlTowerMetricsContext.Provider value={value}>{children}</ControlTowerMetricsContext.Provider>;
}

export function useControlTowerContext(): ControlTowerContextValue {
  const ctx = useContext(ControlTowerMetricsContext);
  if (!ctx) throw new Error("useControlTowerContext requires ControlTowerMetricsProvider");
  return ctx;
}
