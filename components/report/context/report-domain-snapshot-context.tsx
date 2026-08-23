"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type {
  TopClienteReportRow,
  TopMezzoReportRow,
  TopRicambioReportRow,
} from "@/lib/report/report-classifiche";

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
> & {
  derivedBundle: ReportDerivedBundle;
  magazzino: RicambioMagazzino[];
  mezzi: MezzoGestito[];
  lavListRows: readonly LavorazioneListRow[];
  histRev: number;
  onHistRev: () => void;
  tops: {
    mezzi: TopMezzoReportRow[];
    clienti: TopClienteReportRow[];
    ricambi: TopRicambioReportRow[];
  };
};

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
