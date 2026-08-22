import { listChartsByDomain } from "@/lib/report/legacy/legacy-chart-migration-matrix";

export type DomainRemovalGateItem = {
  id: string;
  label: string;
  passed: boolean;
  notes?: string;
};

function blockedCount(domain: Parameters<typeof listChartsByDomain>[0]): number {
  return listChartsByDomain(domain).filter((c) => c.status === "BLOCKED").length;
}

export const LAVORAZIONI_REMOVAL_GATE: readonly DomainRemovalGateItem[] = [
  {
    id: "kpi_migrated",
    label: "KPI in BI",
    passed: true,
  },
  {
    id: "ingressi_chiusure",
    label: "Ingressi/chiusure chart in BI",
    passed: true,
  },
  {
    id: "no_blocked",
    label: "Zero BLOCKED charts",
    passed: blockedCount("lavorazioni") === 0,
    notes: `${blockedCount("lavorazioni")} BLOCKED — full REMOVED blocked until engine extensions land.`,
  },
] as const;

export const MAGAZZINO_REMOVAL_GATE: readonly DomainRemovalGateItem[] = [
  { id: "kpi_migrated", label: "KPI in BI", passed: true },
  { id: "ordini_table", label: "Ordini table in BI", passed: true },
  {
    id: "no_blocked",
    label: "Zero BLOCKED charts",
    passed: blockedCount("magazzino_ricambi") === 0,
    notes: `${blockedCount("magazzino_ricambi")} BLOCKED movement/stock charts remain.`,
  },
] as const;

export const CLIENTI_MEZZI_REMOVAL_GATE: readonly DomainRemovalGateItem[] = [
  { id: "kpi_pareto", label: "KPI + pareto in BI", passed: true },
  {
    id: "no_blocked",
    label: "Zero BLOCKED charts",
    passed: blockedCount("clienti_mezzi") === 0,
    notes: `${blockedCount("clienti_mezzi")} BLOCKED fleet/reliability charts remain.`,
  },
] as const;

export const RISORSE_REMOVAL_GATE: readonly DomainRemovalGateItem[] = [
  { id: "kpi_trend", label: "KPI + presence trend in BI", passed: true },
  {
    id: "no_blocked",
    label: "Zero BLOCKED charts",
    passed: blockedCount("ore_lavorate") === 0,
    notes: `${blockedCount("ore_lavorate")} BLOCKED per-employee breakdown remains.`,
  },
] as const;

export const CROSS_REMOVAL_GATE: readonly DomainRemovalGateItem[] = [
  { id: "kpi_pairs", label: "4 KPI + pairwise in BI", passed: true },
  { id: "catena_trend", label: "Catena + indexed trend in BI", passed: true },
  {
    id: "no_blocked",
    label: "Zero BLOCKED charts",
    passed: blockedCount("analisi_incrociate") === 0,
    notes: `${blockedCount("analisi_incrociate")} BLOCKED scatter/matrices remain.`,
  },
] as const;

export function isDomainRemovalGatePassed(gate: readonly DomainRemovalGateItem[]): boolean {
  return gate.every((item) => item.passed);
}
