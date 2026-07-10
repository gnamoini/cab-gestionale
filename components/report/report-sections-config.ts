import type { DerivedKey } from "@/lib/report/report-domain-types";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export type ReportSectionId =
  | "analisi_ai"
  | "lavorazioni"
  | "clienti_mezzi"
  | "magazzino_ricambi"
  | "ore_lavorate"
  | "dati_economici"
  | "analisi_incrociate"
  | "grafici_kpi";

export type ReportSectionConfig = {
  id: ReportSectionId;
  title: string;
  subtitle?: string;
  defaultCollapsed: boolean;
  permission: string | null;
  /** Se valorizzato, la sezione è visibile con almeno uno dei moduli in lettura. */
  permissionAny?: readonly string[];
  order: number;
  participatesInDerived: boolean;
  writableDerivedKeys: readonly DerivedKey[];
};

export const REPORT_SECTIONS: readonly ReportSectionConfig[] = [
  {
    id: "analisi_ai",
    title: "ANALISI IA",
    subtitle: "Sintesi assistita sui dati del periodo",
    defaultCollapsed: true,
    permission: null,
    order: 1,
    participatesInDerived: false,
    writableDerivedKeys: [],
  },
  {
    id: "lavorazioni",
    title: "LAVORAZIONI",
    subtitle: "Interventi e andamento nel periodo",
    defaultCollapsed: false,
    permission: "lavorazioni",
    order: 2,
    participatesInDerived: true,
    writableDerivedKeys: ["operational"],
  },
  {
    id: "clienti_mezzi",
    title: "CLIENTI E MEZZI",
    subtitle: "Flotta, disponibilità e classifiche clienti e mezzi",
    defaultCollapsed: true,
    permission: null,
    permissionAny: ["mezzi", "lavorazioni"],
    order: 3,
    participatesInDerived: false,
    writableDerivedKeys: [],
  },
  {
    id: "magazzino_ricambi",
    title: "MAGAZZINO E RICAMBI",
    subtitle: "Consumi, stock e ordini fornitori",
    defaultCollapsed: true,
    permission: "magazzino",
    order: 4,
    participatesInDerived: true,
    writableDerivedKeys: ["warehouse"],
  },
  {
    id: "ore_lavorate",
    title: "ORE LAVORATE",
    subtitle: "Timesheet e produttività del team",
    defaultCollapsed: true,
    permission: "dipendenti",
    order: 5,
    participatesInDerived: true,
    writableDerivedKeys: ["labor"],
  },
  {
    id: "dati_economici",
    title: "DATI ECONOMICI",
    subtitle: "Preventivi, fatture e DDT",
    defaultCollapsed: true,
    permission: "fatturazione",
    order: 6,
    participatesInDerived: true,
    writableDerivedKeys: ["economic"],
  },
  {
    id: "analisi_incrociate",
    title: "ANALISI",
    subtitle: "Indicatori trasversali tra aree",
    defaultCollapsed: true,
    permission: null,
    order: 7,
    participatesInDerived: true,
    writableDerivedKeys: [],
  },
  {
    id: "grafici_kpi",
    title: "GRAFICI KPI",
    subtitle: "Confronto trend personalizzato tra indicatori",
    defaultCollapsed: true,
    permission: null,
    order: 8,
    participatesInDerived: false,
    writableDerivedKeys: [],
  },
] as const;

export function filterReportSectionsByPermission(
  sections: readonly ReportSectionConfig[],
  canModule: (moduleId: string) => boolean,
): ReportSectionConfig[] {
  return sections.filter((s) => {
    if (s.permissionAny?.length) {
      return s.permissionAny.some((perm) => canModule(perm));
    }
    return !s.permission || canModule(s.permission);
  });
}

export function filterReportSectionsWithModules(
  sections: readonly ReportSectionConfig[],
  modules: Record<GestionalePermissionModule, import("@/src/lib/permissions/effective-permissions").EffectiveModulePermission>,
): ReportSectionConfig[] {
  return sections.filter((s) => {
    if (s.permissionAny?.length) {
      return s.permissionAny.some((perm) =>
        moduleAllows(modules, perm as GestionalePermissionModule, "read"),
      );
    }
    return !s.permission || moduleAllows(modules, s.permission as GestionalePermissionModule, "read");
  });
}
