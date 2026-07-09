/**
 * Copy UI per KPI report unificati (solo presentazione).
 * Le formule restano in kpi-performance-formulas.ts e build-report-model.ts.
 */

export type UnifiedKpiDisplayMeta = {
  description: string;
  /** Ordine nella griglia sintesi. */
  order: number;
  hero?: boolean;
  compact?: boolean;
};

export const UNIFIED_KPI_DISPLAY: Record<string, UnifiedKpiDisplayMeta> = {
  "lav-periodo": {
    order: 1,
    hero: true,
    description: "Lavorazioni con data di ingresso nel periodo selezionato (carico).",
  },
  "lav-media-settimanale": {
    order: 2,
    description:
      "Media chiusure archiviate per settimana: somma delle chiusure su ogni settimana del periodo ÷ numero di settimane nel filtro.",
  },
  "lav-chiusi": {
    order: 3,
    description: "Completate archiviate nel periodo (DB + eventuali override mensili manuali).",
  },
  "lav-saldo-periodo": {
    order: 3.5,
    description: "Ingressi meno chiusure nel periodo (accumulo vs smaltimento).",
  },
  "lav-aperti": {
    order: 4,
    description: "Lavorazioni non archiviate attualmente in gestione.",
  },
  "lav-tempo": {
    order: 5,
    description: "Media giorni tra ingresso e chiusura delle archiviate nel periodo.",
  },
  "flotta-officina": {
    order: 7,
    description: "Mezzi con almeno una lavorazione non archiviata collegata.",
  },
  cap: {
    order: 8,
    description: "Valore di magazzino a costo di acquisto (istantaneo, non legato al periodo).",
  },
  "ric-usati": {
    order: 9,
    description: "Somma quantità in uscita dai movimenti di magazzino nel periodo.",
  },
  "cost-tot": {
    order: 10,
    description: "Costo ricambi da log + manodopera da schede lavorazione (se caricate).",
  },
  clienti: {
    order: 11,
    description: "Clienti con almeno un ingresso o una chiusura nel periodo.",
  },
  mezzi: {
    order: 12,
    compact: true,
    description: "Totale mezzi in anagrafica (non filtrato per periodo).",
  },
  scorta: {
    order: 13,
    compact: true,
    description: "Ricambi con quantità sotto la scorta minima impostata.",
  },
};
