import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import { REPORT_SECTIONS, type ReportSectionId } from "@/components/report/report-sections-config";

const VALID_SECTIONS = new Set<ReportSectionId>(REPORT_SECTIONS.map((s) => s.id));

const LAVORAZIONI_SUBSECTION_ANCHORS: Record<string, string> = {
  sla: "report-lav-backlog",
  backlog: "report-lav-backlog",
  panoramica: "report-lav-panoramica",
  trend: "report-lav-trend",
  analisi: "report-lav-analisi",
};

export function isValidInsightDrillDownSection(
  targetSection: string,
): targetSection is ReportSectionId {
  return VALID_SECTIONS.has(targetSection as ReportSectionId);
}

const ECONOMIC_TAB_ANCHORS: Record<string, string> = {
  fatture: "report-eco-dettaglio",
  crediti: "report-eco-dettaglio",
  preventivi: "report-eco-dettaglio",
};

export function resolveInsightDrillDownHref(drillDown: DrillDownRef): string {
  if (drillDown.targetSection === "lavorazioni" && drillDown.targetTab) {
    const anchor = LAVORAZIONI_SUBSECTION_ANCHORS[drillDown.targetTab];
    if (anchor) return `#${anchor}`;
  }
  if (drillDown.targetSection === "dati_economici" && drillDown.targetTab) {
    const anchor = ECONOMIC_TAB_ANCHORS[drillDown.targetTab];
    if (anchor) return `#${anchor}`;
  }
  return `#report-section-${drillDown.targetSection}`;
}

export function resolveInsightDrillDownElementId(drillDown: DrillDownRef): string {
  if (drillDown.targetSection === "lavorazioni" && drillDown.targetTab) {
    const anchor = LAVORAZIONI_SUBSECTION_ANCHORS[drillDown.targetTab];
    if (anchor) return anchor;
  }
  if (drillDown.targetSection === "dati_economici" && drillDown.targetTab) {
    const anchor = ECONOMIC_TAB_ANCHORS[drillDown.targetTab];
    if (anchor) return anchor;
  }
  return `report-section-${drillDown.targetSection}`;
}
