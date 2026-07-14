"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  controlTowerDashSliceFromMetrics,
  controlTowerEmptyDashSlice,
  useControlTowerMetricsValue,
  useControlTowerShell,
  type ControlTowerHeaderKpiBase,
  type ControlTowerShell,
} from "@/src/hooks/view/use-control-tower-metrics";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import type { composeControlTowerSlices } from "@/lib/dashboard/control-tower-selectors";

type ControlTowerSlices = ReturnType<typeof composeControlTowerSlices> & {
  headerKpi: ReturnType<typeof composeControlTowerSlices>["headerKpi"];
  agendaKpi?: ReturnType<typeof composeControlTowerSlices>["agendaKpi"];
};

type ControlTowerContextValue = {
  staging: boolean;
  visibleWidgets: DashboardWidgetDefinition[];
  slices: ControlTowerSlices | null;
  headerKpiBase: ControlTowerHeaderKpiBase | null;
  isLoading: boolean;
  activityFeedLoading: boolean;
  canPreventivi: boolean;
  canFatturazione: boolean;
  canDdt: boolean;
  canLavorazioni: boolean;
  canMagazzino: boolean;
};

const ControlTowerMetricsContext = createContext<ControlTowerContextValue | null>(null);

function ControlTowerMetricsWithDash({
  shell,
  children,
}: {
  shell: ControlTowerShell;
  children: ReactNode;
}) {
  const dash = controlTowerDashSliceFromMetrics(useDashboardMetrics());
  const value = useControlTowerMetricsValue(shell, dash);
  return <ControlTowerMetricsContext.Provider value={value}>{children}</ControlTowerMetricsContext.Provider>;
}

function ControlTowerMetricsWithoutDash({
  shell,
  children,
}: {
  shell: ControlTowerShell;
  children: ReactNode;
}) {
  const dash = controlTowerEmptyDashSlice(shell.globalOpts);
  const value = useControlTowerMetricsValue(shell, dash);
  return <ControlTowerMetricsContext.Provider value={value}>{children}</ControlTowerMetricsContext.Provider>;
}

export function ControlTowerMetricsProvider({ children }: { children: ReactNode }) {
  const shell = useControlTowerShell();
  if (shell.visibleWidgets.length === 0) {
    return <ControlTowerMetricsWithoutDash shell={shell}>{children}</ControlTowerMetricsWithoutDash>;
  }
  return <ControlTowerMetricsWithDash shell={shell}>{children}</ControlTowerMetricsWithDash>;
}

export function useControlTowerContext(): ControlTowerContextValue {
  const ctx = useContext(ControlTowerMetricsContext);
  if (!ctx) throw new Error("useControlTowerContext requires ControlTowerMetricsProvider");
  return ctx;
}
