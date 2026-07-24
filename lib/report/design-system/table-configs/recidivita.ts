import type { ReportTableConfig } from "@/lib/report/design-system/table-configs/types";

export const recidivaMezziTableConfig: ReportTableConfig = {
  id: "recidiva-mezzi",
  label: "Recidività mezzi",
  columns: [
    { id: "rank", label: "#", align: "right" },
    { id: "mezzo", label: "Mezzo" },
    { id: "cliente", label: "Cliente" },
    { id: "interventi", label: "Interventi", align: "right" },
    { id: "ritorni", label: "Ritorni", align: "right" },
    { id: "recidivitaScore", label: "Score", align: "right", formatter: "percentage" },
    { id: "ultimoIntervento", label: "Ultimo" },
  ],
};

export const qualitaInterventiTableConfig: ReportTableConfig = {
  id: "qualita-interventi",
  label: "Qualità interventi",
  columns: [
    { id: "segmentLabel", label: "Segmento" },
    { id: "interventi", label: "Interventi", align: "right" },
    { id: "ritorni", label: "Ritorni", align: "right" },
    { id: "returnRate", label: "Tasso %", align: "right", formatter: "percentage" },
    { id: "riskIndex", label: "Indice attenzione", align: "right" },
    { id: "vsOfficinaPct", label: "vs media %", align: "right" },
  ],
};
