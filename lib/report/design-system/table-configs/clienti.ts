import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const topClientiTableConfig = {
  id: "top-clienti",
  label: "Top clienti per fatturato",
  columns: [
    { id: "rank", label: "#", align: "right" as const },
    { id: "cliente", label: "Cliente" },
    { id: "fatturato", label: "Fatturato", align: "right" as const, formatter: "currency" as const },
    { id: "fatture", label: "Fatture", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const topRicambiTableConfig = {
  id: "top-ricambi",
  label: "Top ricambi",
  columns: [
    { id: "rank", label: "#", align: "right" as const },
    { id: "codice", label: "Codice" },
    { id: "nome", label: "Descrizione" },
    { id: "qtaEntrata", label: "Entrate", align: "right" as const, formatter: "integer" as const },
    { id: "qtaUscita", label: "Uscite", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const topMezziTableConfig = {
  id: "top-mezzi",
  label: "Top mezzi",
  columns: [
    { id: "rank", label: "#", align: "right" as const },
    { id: "mezzo", label: "Mezzo" },
    { id: "cliente", label: "Cliente" },
    { id: "interventi", label: "Interventi", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const topClientiInterventiTableConfig = {
  id: "top-clienti-interventi",
  label: "Top clienti per interventi",
  columns: [
    { id: "rank", label: "#", align: "right" as const },
    { id: "cliente", label: "Cliente" },
    { id: "interventi", label: "Interventi", align: "right" as const, formatter: "integer" as const },
    { id: "ultimoIso", label: "Ultimo intervento" },
  ],
} satisfies ReportTableConfig;
