"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ReportSectionId } from "@/components/report/report-sections-config";

type ReportSectionVisibilityContextValue = {
  isOpen: (id: ReportSectionId) => boolean;
  setOpen: (id: ReportSectionId, open: boolean) => void;
  perfGateEnabled: boolean;
};

const ReportSectionVisibilityContext = createContext<ReportSectionVisibilityContextValue | null>(null);

const PERF_GATE_SECTIONS: readonly ReportSectionId[] = [
  "lavorazioni",
  "clienti_mezzi",
  "magazzino_ricambi",
  "dati_economici",
];

export function ReportSectionVisibilityProvider({ children }: { children: ReactNode }) {
  const [openSections, setOpenSections] = useState<Set<ReportSectionId>>(() => new Set());

  const setOpen = useCallback((id: ReportSectionId, open: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const isOpen = useCallback((id: ReportSectionId) => openSections.has(id), [openSections]);

  const perfGateEnabled = useMemo(
    () => PERF_GATE_SECTIONS.some((id) => openSections.has(id)),
    [openSections],
  );

  const value = useMemo(
    () => ({ isOpen, setOpen, perfGateEnabled }),
    [isOpen, setOpen, perfGateEnabled],
  );

  return (
    <ReportSectionVisibilityContext.Provider value={value}>{children}</ReportSectionVisibilityContext.Provider>
  );
}

export function useReportSectionVisibility(): ReportSectionVisibilityContextValue {
  const ctx = useContext(ReportSectionVisibilityContext);
  if (!ctx) {
    throw new Error("useReportSectionVisibility must be used within ReportSectionVisibilityProvider");
  }
  return ctx;
}
