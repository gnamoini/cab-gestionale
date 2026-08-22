"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";

export type ReportDomainSnapshot = Pick<
  DomainReportSectionProps,
  | "range"
  | "compareRange"
  | "anchor"
  | "showCompare"
  | "attive"
  | "storico"
  | "completate"
  | "manualByMonth"
  | "magazzinoRows"
  | "magLog"
  | "costoOrario"
  | "schedeStore"
  | "semanticIndex"
  | "compareDetail"
  | "rangeKey"
>;

const ReportDomainSnapshotContext = createContext<ReportDomainSnapshot | null>(null);

export function ReportDomainSnapshotProvider({
  value,
  children,
}: {
  value: ReportDomainSnapshot;
  children: ReactNode;
}) {
  return (
    <ReportDomainSnapshotContext.Provider value={value}>{children}</ReportDomainSnapshotContext.Provider>
  );
}

export function useReportDomainSnapshot(): ReportDomainSnapshot {
  const ctx = useContext(ReportDomainSnapshotContext);
  if (!ctx) throw new Error("useReportDomainSnapshot must be used within ReportDomainSnapshotProvider");
  return ctx;
}
