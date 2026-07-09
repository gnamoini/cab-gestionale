import type { DerivedKey } from "@/lib/report/report-domain-types";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export type ReportSectionId =
  | "analisi_ai"
  | "lavorazioni"
  | "magazzino_ricambi"
  | "ore_lavorate"
  | "dati_economici"
  | "analisi_incrociate";

export type ReportSectionConfig = {
  id: ReportSectionId;
  title: string;
  subtitle?: string;
  defaultCollapsed: boolean;
  permission: string | null;
  order: number;
  participatesInDerived: boolean;
  writableDerivedKeys: readonly DerivedKey[];
};

export const REPORT_SECTIONS: readonly ReportSectionConfig[] = [
  {
    id: "analisi_ai",
    title: "ANALISI IA",
    subtitle: "Sintesi assistita sui dati del periodo",
    defaultCollapsed: false,
    permission: null,
    order: 1,
    participatesInDerived: false,
    writableDerivedKeys: [],
  },
  {
    id: "lavorazioni",
    title: "LAVORAZIONI",
    subtitle: "Interventi, flotta e andamento nel periodo",
    defaultCollapsed: false,
    permission: "lavorazioni",
    order: 2,
    participatesInDerived: true,
    writableDerivedKeys: ["operational"],
  },
  {
    id: "magazzino_ricambi",
    title: "MAGAZZINO E RICAMBI",
    subtitle: "Consumi, stock e ordini fornitori",
    defaultCollapsed: true,
    permission: "magazzino",
    order: 3,
    participatesInDerived: true,
    writableDerivedKeys: ["warehouse"],
  },
  {
    id: "ore_lavorate",
    title: "ORE LAVORATE",
    subtitle: "Timesheet e produttività del team",
    defaultCollapsed: true,
    permission: "dipendenti",
    order: 4,
    participatesInDerived: true,
    writableDerivedKeys: ["labor"],
  },
  {
    id: "dati_economici",
    title: "DATI ECONOMICI",
    subtitle: "Preventivi, fatture e DDT",
    defaultCollapsed: true,
    permission: "fatturazione",
    order: 5,
    participatesInDerived: true,
    writableDerivedKeys: ["economic"],
  },
  {
    id: "analisi_incrociate",
    title: "ANALISI",
    subtitle: "Indicatori trasversali tra aree",
    defaultCollapsed: true,
    permission: null,
    order: 6,
    participatesInDerived: true,
    writableDerivedKeys: [],
  },
] as const;

export function filterReportSectionsByPermission(
  sections: readonly ReportSectionConfig[],
  canModule: (moduleId: string) => boolean,
): ReportSectionConfig[] {
  return sections.filter((s) => !s.permission || canModule(s.permission));
}

export function filterReportSectionsWithModules(
  sections: readonly ReportSectionConfig[],
  modules: Record<GestionalePermissionModule, import("@/src/lib/permissions/effective-permissions").EffectiveModulePermission>,
): ReportSectionConfig[] {
  return sections.filter(
    (s) => !s.permission || moduleAllows(modules, s.permission as GestionalePermissionModule, "read"),
  );
}
