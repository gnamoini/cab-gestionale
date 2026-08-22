"use client";

import {
  createContext,
  useContext,
  useMemo,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  type DateRange,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";

export type ReportPeriodContextValue = {
  anchor: Date;
  preset: ReportPeriodPreset;
  customFrom: string;
  customTo: string;
  compareMode: ReportCompareMode;
  compareCustomFrom: string;
  compareCustomTo: string;
  range: DateRange;
  compareRange: DateRange | null;
  rangeKey: string;
  showCompare: boolean;
  setPreset: (p: ReportPeriodPreset) => void;
  setCustomFrom: Dispatch<SetStateAction<string>>;
  setCustomTo: Dispatch<SetStateAction<string>>;
  setCompareMode: (m: ReportCompareMode) => void;
  setCompareCustomFrom: Dispatch<SetStateAction<string>>;
  setCompareCustomTo: Dispatch<SetStateAction<string>>;
};

const ReportPeriodContext = createContext<ReportPeriodContextValue | null>(null);

export function ReportPeriodContextProvider({
  value,
  children,
}: {
  value: ReportPeriodContextValue;
  children: ReactNode;
}) {
  const stable = useMemo(() => value, [
    value.anchor.getTime(),
    value.preset,
    value.customFrom,
    value.customTo,
    value.compareMode,
    value.compareCustomFrom,
    value.compareCustomTo,
    value.range.start.getTime(),
    value.range.end.getTime(),
    value.compareRange?.start.getTime(),
    value.compareRange?.end.getTime(),
    value.rangeKey,
    value.showCompare,
    value.setPreset,
    value.setCustomFrom,
    value.setCustomTo,
    value.setCompareMode,
    value.setCompareCustomFrom,
    value.setCompareCustomTo,
  ]);
  return <ReportPeriodContext.Provider value={stable}>{children}</ReportPeriodContext.Provider>;
}

export function useReportPeriodContext(): ReportPeriodContextValue {
  const ctx = useContext(ReportPeriodContext);
  if (!ctx) {
    throw new Error("useReportPeriodContext requires ReportPeriodContextProvider");
  }
  return ctx;
}

export function useOptionalReportPeriodContext(): ReportPeriodContextValue | null {
  return useContext(ReportPeriodContext);
}
