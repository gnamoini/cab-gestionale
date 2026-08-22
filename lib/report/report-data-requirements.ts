import type { ReportSectionId } from "@/components/report/report-sections-config";
import type { SchedeConsumerScope } from "@/lib/report/schede-report-scope";

export type ReportDataRequirements = {
  preventivi: boolean;
  invoices: boolean;
  ddt: boolean;
  ordini: boolean;
  timesheet: boolean;
  schede: boolean;
  schedeScopes: SchedeConsumerScope;
};

const ECONOMIC_SCHEde: SchedeConsumerScope = {
  needsLaborCost: "completed_in_period",
  needsMargin: "completed_in_period",
};

const LABOR_SCHEde: SchedeConsumerScope = {
  needsLaborCost: "completed_in_period",
  needsActualHours: "hours_in_period",
};

const CROSS_SCHEde: SchedeConsumerScope = {
  needsLaborCost: "cross_completed_in_period",
  needsMargin: "cross_completed_in_period",
};

const PERF_SCHEde: SchedeConsumerScope = {
  needsLaborCost: "completed_in_period",
};

function sectionOpen(openSections: ReadonlySet<ReportSectionId>, id: ReportSectionId): boolean {
  return openSections.has(id);
}

/**
 * ponytail: lazy fetch keyed by section visibility + perf gate — no eager eco/ordini/timesheet on bare page.
 */
export function resolveReportDataRequirements(
  openSections: ReadonlySet<ReportSectionId>,
  perfGateEnabled: boolean,
): ReportDataRequirements {
  const magOpen = sectionOpen(openSections, "magazzino_ricambi");
  const oreOpen =
    sectionOpen(openSections, "ore_lavorate") || sectionOpen(openSections, "analisi_ore_officina");
  const ecoOpen = sectionOpen(openSections, "dati_economici");
  const crossOpen = sectionOpen(openSections, "analisi_incrociate");

  const needEco = ecoOpen || crossOpen || perfGateEnabled;
  const needOrdini = magOpen || (perfGateEnabled && sectionOpen(openSections, "magazzino_ricambi"));
  const needTimesheet = oreOpen || crossOpen;

  const schedeScopes: SchedeConsumerScope = {};
  if (needEco) {
    schedeScopes.needsLaborCost = ECONOMIC_SCHEde.needsLaborCost;
    schedeScopes.needsMargin = ECONOMIC_SCHEde.needsMargin;
  }
  if (oreOpen || crossOpen) {
    schedeScopes.needsLaborCost = schedeScopes.needsLaborCost ?? LABOR_SCHEde.needsLaborCost;
    schedeScopes.needsActualHours = LABOR_SCHEde.needsActualHours;
  }
  if (crossOpen) {
    schedeScopes.needsLaborCost = CROSS_SCHEde.needsLaborCost;
    schedeScopes.needsMargin = CROSS_SCHEde.needsMargin;
  }
  if (perfGateEnabled && ecoOpen) {
    schedeScopes.needsLaborCost = schedeScopes.needsLaborCost ?? PERF_SCHEde.needsLaborCost;
  }

  const schede =
    Boolean(schedeScopes.needsLaborCost || schedeScopes.needsMargin || schedeScopes.needsActualHours);

  return {
    preventivi: needEco,
    invoices: needEco,
    ddt: needEco,
    ordini: needOrdini,
    timesheet: needTimesheet,
    schede,
    schedeScopes,
  };
}
