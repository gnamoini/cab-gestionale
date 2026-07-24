import type { DerivedKey } from "@/lib/report/report-domain-types";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";

export type ReportSectionId =
  | "analisi_ai"
  | "lavorazioni"
  | "clienti_mezzi"
  | "magazzino_ricambi"
  | "ore_lavorate"
  | "analisi_ore_officina"
  | "dati_economici"
  | "analisi_incrociate"
  | "recidivita_mezzi";

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
    id: "recidivita_mezzi",
    title: "ANALISI RECIDIVITÀ MEZZI",
    subtitle: "Ritorni ravvicinati, score qualità e correlazioni operative",
    defaultCollapsed: true,
    permission: null,
    permissionAny: ["lavorazioni", "mezzi"],
    order: 4,
    participatesInDerived: false,
    writableDerivedKeys: [],
  },
  {
    id: "magazzino_ricambi",
    title: "MAGAZZINO E RICAMBI",
    subtitle: "Consumi, stock e ordini fornitori",
    defaultCollapsed: true,
    permission: "magazzino",
    order: 5,
    participatesInDerived: true,
    writableDerivedKeys: ["warehouse"],
  },
  {
    id: "ore_lavorate",
    title: "PRESENZE TEAM",
    subtitle: "Cartellino presenze — ore ordinarie, straordinarie e assenze",
    defaultCollapsed: true,
    permission: "dipendenti",
    order: 6,
    participatesInDerived: true,
    writableDerivedKeys: ["labor"],
  },
  {
    id: "analisi_ore_officina",
    title: "ANALISI ORE OFFICINA",
    subtitle: "Produttività reale, utilizzo tecnici e qualità dati consuntivo",
    defaultCollapsed: true,
    permission: null,
    permissionAny: ["dipendenti", "lavorazioni"],
    order: 7,
    participatesInDerived: false,
    writableDerivedKeys: [],
  },
  {
    id: "dati_economici",
    title: "DATI ECONOMICI",
    subtitle: "Preventivi, fatture e DDT",
    defaultCollapsed: false,
    permission: "fatturazione",
    order: 8,
    participatesInDerived: true,
    writableDerivedKeys: ["economic"],
  },
  {
    id: "analisi_incrociate",
    title: "ANALISI",
    subtitle: "Indicatori trasversali tra aree",
    defaultCollapsed: true,
    permission: null,
    order: 9,
    participatesInDerived: true,
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
