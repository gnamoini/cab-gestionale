import "server-only";

import {
  computeEcoMargineOperativoStimato,
  computeEcoFatturato,
} from "@/lib/report/analytics-engine/calculators";
import { sumManodoperaCostFromSchede, sumRicambiCostFromMagLog } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportDrillDownCompositionComponent } from "@/lib/report/drilldown/types";

export function buildMargineComposition(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDrillDownCompositionComponent[] {
  const fatturato = computeEcoFatturato({ bundle, range });
  const margine = computeEcoMargineOperativoStimato({ bundle, range });
  const manodopera = sumManodoperaCostFromSchede(
    bundle.integrity.completate,
    range,
    bundle.schedeStore,
    bundle.costoOrario,
    bundle.magazzinoRows,
  ).manodopera;
  const ricambi = sumRicambiCostFromMagLog(
    bundle.integrity.magLog,
    bundle.integrity.magazzino,
    range,
  );

  return [
    {
      id: "fatturato",
      label: "Fatturato periodo",
      value: fatturato.value,
      formulaId: fatturato.formulaId,
      trust: fatturato.availability === "not_available" ? "not_available" : "verified",
      source: "invoice-calculations",
    },
    {
      id: "manodopera",
      label: "Costo manodopera disponibile",
      value: manodopera,
      formulaId: "sumManodoperaCostFromSchede",
      trust: bundle.schedeStore == null ? "partial" : "estimated",
      source: "schede-lavorazione",
    },
    {
      id: "ricambi",
      label: "Costo ricambi disponibile",
      value: ricambi,
      formulaId: "sumRicambiCostFromMagLog",
      trust: "verified",
      source: "magazzino-log",
    },
    {
      id: "margine",
      label: "Margine operativo stimato",
      value: margine.value,
      formulaId: margine.formulaId,
      trust: margine.availability === "partial" ? "partial" : "estimated",
      source: "analytics-engine",
    },
  ];
}
