import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const lavorazioniMensileTableConfig = {
  id: "lavorazioni-mensile",
  label: "Dettaglio mensile",
  columns: [
    { id: "mese", label: "Mese" },
    { id: "count", label: "Lavorazioni", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;
