import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const crossOutlierTableConfig: ReportTableConfig = {
  id: "cross-outlier",
  label: "Outlier interventi",
  columns: [
    { id: "label", label: "Intervento" },
    { id: "ore", label: "Ore", align: "right", formatter: "integer" },
    { id: "ricambiQty", label: "Ricambi", align: "right", formatter: "integer" },
    { id: "costo", label: "Costo stim.", align: "right", formatter: "currency" },
    { id: "zScore", label: "Anomalia", align: "right", formatter: "decimal" },
  ],
};

export const crossClienteTableConfig: ReportTableConfig = {
  id: "cross-cliente-redditivita",
  label: "Redditività clienti",
  columns: [
    { id: "cliente", label: "Cliente" },
    { id: "fatturato", label: "Fatturato", align: "right", formatter: "currency" },
    { id: "costoStimato", label: "Costo stim.", align: "right", formatter: "currency" },
    { id: "margine", label: "Margine", align: "right", formatter: "currency" },
    { id: "quadrant", label: "Quadrante" },
  ],
};

export const crossMezzoCostTableConfig: ReportTableConfig = {
  id: "cross-mezzo-costo",
  label: "Costo per mezzo",
  columns: [
    { id: "label", label: "Mezzo" },
    { id: "cost", label: "Costo stim.", align: "right", formatter: "currency" },
  ],
};
