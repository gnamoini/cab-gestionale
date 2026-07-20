import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const lavorazioniMensileTableConfig = {
  id: "lavorazioni-mensile",
  label: "Dettaglio mensile",
  columns: [
    { id: "mese", label: "Mese" },
    { id: "count", label: "Lavorazioni", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const lavSlaTableConfig = {
  id: "lav-sla",
  label: "Oltre SLA",
  columns: [
    { id: "codice", label: "Codice" },
    { id: "cliente", label: "Cliente" },
    { id: "mezzo", label: "Mezzo" },
    { id: "giorni", label: "Giorni", align: "right" as const, formatter: "integer" as const },
    { id: "priorita", label: "Priorità" },
    { id: "stato", label: "Stato" },
  ],
} satisfies ReportTableConfig;

export const lavRecidivaTableConfig = {
  id: "lav-recidiva",
  label: "Recidiva mezzi",
  columns: [
    { id: "mezzo", label: "Mezzo" },
    { id: "cliente", label: "Cliente" },
    { id: "interventi", label: "Interventi", align: "right" as const, formatter: "integer" as const },
    { id: "ultimoIntervento", label: "Ultimo intervento" },
  ],
} satisfies ReportTableConfig;

export const lavStatoAgingTableConfig = {
  id: "lav-stato-aging",
  label: "Stato × aging",
  columns: [
    { id: "stato", label: "Stato" },
    { id: "b0_7", label: "0–7 gg", align: "right" as const, formatter: "integer" as const },
    { id: "b8_14", label: "8–14 gg", align: "right" as const, formatter: "integer" as const },
    { id: "b15_30", label: "15–30 gg", align: "right" as const, formatter: "integer" as const },
    { id: "b30p", label: "30+ gg", align: "right" as const, formatter: "integer" as const },
    { id: "totale", label: "Tot.", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const lavMtbfTableConfig = {
  id: "lav-mtbf",
  label: "Affidabilità mezzi",
  columns: [
    { id: "mezzo", label: "Mezzo" },
    { id: "cliente", label: "Cliente" },
    { id: "interventi", label: "Interventi", align: "right" as const, formatter: "integer" as const },
    { id: "mttr", label: "MTTR (gg)", align: "right" as const, formatter: "decimal" as const },
    { id: "mtbf", label: "MTBF (gg)", align: "right" as const },
  ],
} satisfies ReportTableConfig;

export const orePerDipendenteTableConfig = {
  id: "ore-per-dipendente",
  label: "Ore per dipendente",
  columns: [
    { id: "dipendente", label: "Dipendente" },
    { id: "totaleLavorato", label: "Lavorato", align: "right" as const, formatter: "decimal" as const },
    { id: "oreOrdinarie", label: "Ord.", align: "right" as const, formatter: "decimal" as const },
    { id: "oreStraordinarie", label: "Str.", align: "right" as const, formatter: "decimal" as const },
    { id: "oreAssenza", label: "Ass.", align: "right" as const, formatter: "decimal" as const },
    { id: "pctTeam", label: "% team", align: "right" as const, formatter: "decimal" as const },
  ],
} satisfies ReportTableConfig;

export const sottoScortaTableConfig = {
  id: "sotto-scorta",
  label: "Sotto scorta",
  columns: [
    { id: "codice", label: "Codice" },
    { id: "nome", label: "Nome" },
    { id: "qty", label: "Qty", align: "right" as const, formatter: "integer" as const },
    { id: "giorniCopertura", label: "Giorni copertura", align: "right" as const },
  ],
} satisfies ReportTableConfig;

export const sottoScortaMinTableConfig = {
  id: "sotto-scorta-min",
  label: "Sotto scorta minima",
  columns: [
    { id: "codice", label: "Codice" },
    { id: "marca", label: "Marca" },
    { id: "nome", label: "Nome" },
    { id: "qty", label: "Qty", align: "right" as const, formatter: "integer" as const },
    { id: "scortaMin", label: "Min.", align: "right" as const, formatter: "integer" as const },
    { id: "delta", label: "Δ", align: "right" as const, formatter: "integer" as const },
    { id: "valoreRischio", label: "Valore €", align: "right" as const, formatter: "currency" as const },
  ],
} satisfies ReportTableConfig;

export const coperturaBassaTableConfig = {
  id: "copertura-bassa",
  label: "Copertura bassa",
  columns: [
    { id: "codice", label: "Codice" },
    { id: "marca", label: "Marca" },
    { id: "nome", label: "Nome" },
    { id: "qty", label: "Qty", align: "right" as const, formatter: "integer" as const },
    { id: "giorniCopertura", label: "Giorni copertura", align: "right" as const },
  ],
} satisfies ReportTableConfig;

export const magazzinoRischioMatrixTableConfig = {
  id: "magazzino-rischio-matrix",
  label: "Rischio per categoria",
  columns: [
    { id: "categoria", label: "Categoria" },
    { id: "ok", label: "OK", align: "right" as const, formatter: "integer" as const },
    { id: "sottoMin", label: "Sotto min.", align: "right" as const, formatter: "integer" as const },
    { id: "coperturaBassa", label: "Copert. bassa", align: "right" as const, formatter: "integer" as const },
    { id: "deadStock", label: "Fermi", align: "right" as const, formatter: "integer" as const },
    { id: "totale", label: "Tot.", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;

export const ordiniFornitoriTableConfig = {
  id: "ordini-fornitori",
  label: "Ordini fornitori",
  columns: [
    { id: "numero", label: "N." },
    { id: "fornitore", label: "Fornitore" },
    { id: "dataOrdine", label: "Data" },
    { id: "status", label: "Stato" },
    { id: "totale", label: "Totale", align: "right" as const, formatter: "currency" as const },
    { id: "giorniAperti", label: "Giorni", align: "right" as const, formatter: "integer" as const },
  ],
} satisfies ReportTableConfig;
