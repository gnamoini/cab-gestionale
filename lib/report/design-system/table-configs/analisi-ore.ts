import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const analisiOreProduttivitaTableConfig = {
  id: "analisi-ore-produttivita",
  label: "Produttività tecnici",
  columns: [
    { id: "dipendente", label: "Dipendente" },
    { id: "presenza", label: "Presenza", align: "right" as const },
    { id: "consuntivo", label: "Ore lavorate", align: "right" as const },
    { id: "utilizzo", label: "Utilizzo %", align: "right" as const },
    { id: "interventi", label: "Interventi", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const analisiOreStimaConsuntivoTableConfig = {
  id: "analisi-ore-stima-consuntivo",
  label: "Preventivo vs consuntivo",
  columns: [
    { id: "lavorazione", label: "Lavorazione" },
    { id: "stima", label: "Stima", align: "right" as const },
    { id: "consuntivo", label: "Consuntivo", align: "right" as const },
    { id: "delta", label: "Delta", align: "right" as const },
  ],
} satisfies ReportTableConfig;
