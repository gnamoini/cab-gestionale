"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  getReportDensityTokens,
  REPORT_DEFAULT_DENSITY,
  type ReportDensityTokens,
  type ReportVisualDensity,
} from "@/components/report/design-system/tokens/visual-density";

const ReportDensityContext = createContext<ReportVisualDensity>(REPORT_DEFAULT_DENSITY);

export function ReportDensityProvider({
  density = REPORT_DEFAULT_DENSITY,
  children,
}: {
  density?: ReportVisualDensity;
  children: ReactNode;
}) {
  return <ReportDensityContext.Provider value={density}>{children}</ReportDensityContext.Provider>;
}

export function useReportDensity(): ReportDensityTokens & { density: ReportVisualDensity } {
  const density = useContext(ReportDensityContext);
  return { density, ...getReportDensityTokens(density) };
}
