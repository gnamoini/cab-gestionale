import type { ReportSectionId } from "@/components/report/report-sections-config";

export type LegacyMigrationStatus =
  | "NOT_READY"
  | "KPI_MIGRATED"
  | "CHARTS_PARTIAL"
  | "READY_TO_REMOVE"
  | "REMOVED";

export type LegacyDomainMigrationEntry = {
  sectionId: ReportSectionId;
  biTarget: string;
  status: LegacyMigrationStatus;
  notes?: string;
};

/** SSOT: legacy Report accordion domain migration — consumed by removal regression test. */
export const LEGACY_DOMAIN_MIGRATION_MATRIX: readonly LegacyDomainMigrationEntry[] = [
  {
    sectionId: "dati_economici",
    biTarget: "Advanced Economia",
    status: "REMOVED",
    notes: "Economia removal gate passed; margin waterfall BLOCKED in BI (eco_margine_operativo_stimato KPI).",
  },
  {
    sectionId: "lavorazioni",
    biTarget: "Advanced Lavorazioni + /lavorazioni operational panel",
    status: "REMOVED",
    notes: "P9: operational charts on /lavorazioni; BI directional KPIs only on /report.",
  },
  {
    sectionId: "magazzino_ricambi",
    biTarget: "Advanced Magazzino + /magazzino operational panel",
    status: "REMOVED",
    notes: "P9: stock analytics on /magazzino.",
  },
  {
    sectionId: "clienti_mezzi",
    biTarget: "Clienti section + /mezzi operational panel",
    status: "REMOVED",
    notes: "P9: fleet/recidività on /mezzi.",
  },
  {
    sectionId: "ore_lavorate",
    biTarget: "Risorse section + /dipendenti operational panel",
    status: "REMOVED",
    notes: "P9: ore per dipendente and analisi officina on /dipendenti.",
  },
  {
    sectionId: "analisi_incrociate",
    biTarget: "Cross metrics + pairs",
    status: "REMOVED",
    notes: "P9: low-value cross charts removed; KPI pairs remain in BI.",
  },
] as const;

export function listRemovedLegacySectionIds(): ReportSectionId[] {
  return LEGACY_DOMAIN_MIGRATION_MATRIX.filter((e) => e.status === "REMOVED").map((e) => e.sectionId);
}

export function isLegacySectionRemoved(sectionId: ReportSectionId): boolean {
  return listRemovedLegacySectionIds().includes(sectionId);
}
