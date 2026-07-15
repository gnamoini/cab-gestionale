"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuthUserId } from "@/context/auth-context";
import { REPORT_SECTIONS, type ReportSectionId } from "@/components/report/report-sections-config";
import { readSection } from "@/lib/ui/collapsible-prefs";

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

function defaultOpenReportSections(): Set<ReportSectionId> {
  return new Set(REPORT_SECTIONS.filter((section) => !section.defaultCollapsed).map((section) => section.id));
}

function reportSectionsEqual(a: Set<ReportSectionId>, b: Set<ReportSectionId>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function readReportSectionOpen(userId: string, sectionId: ReportSectionId, defaultCollapsed: boolean): boolean {
  const collapsed = readSection(
    userId,
    "report",
    sectionId,
    defaultCollapsed,
    (raw, fallback) => (typeof raw === "boolean" ? raw : fallback),
  );
  return !collapsed;
}

export function ReportSectionVisibilityProvider({ children }: { children: ReactNode }) {
  const userId = useAuthUserId();
  const hydratedPersistedRef = useRef(false);
  const [openSections, setOpenSections] = useState<Set<ReportSectionId>>(defaultOpenReportSections);

  useEffect(() => {
    if (!userId || hydratedPersistedRef.current) return;
    hydratedPersistedRef.current = true;

    setOpenSections((prev) => {
      const next = new Set<ReportSectionId>();
      for (const section of REPORT_SECTIONS) {
        if (readReportSectionOpen(userId, section.id, section.defaultCollapsed)) {
          next.add(section.id);
        }
      }
      return reportSectionsEqual(prev, next) ? prev : next;
    });
  }, [userId]);

  const setOpen = useCallback((id: ReportSectionId, open: boolean) => {
    setOpenSections((prev) => {
      const wasOpen = prev.has(id);
      if (wasOpen === open) return prev;
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
