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
    order: 7,
    compact: true,
    description:
      "Media chiusure archiviate per settimana: somma delle chiusure su ogni settimana del periodo ÷ numero di settimane nel filtro.",
  },
  "lav-chiusi": {
    order: 3,
    description: "Completate archiviate nel periodo (DB + eventuali override mensili manuali).",
  },
  "lav-saldo-periodo": {
    order: 6,
    compact: true,
    description:
      "Ingressi meno chiusure nel periodo (accumulo netto). Non coincide con il backlog attuale (WIP).",
  },
  "lav_late_sla": {
    order: 4,
    hero: true,
    description: "Interventi aperti oltre la soglia giorni configurata, con quota sul backlog.",
  },
  "lav-aperti": {
    order: 3,
    hero: true,
    description: "Lavorazioni non archiviate attualmente in gestione (backlog attuale).",
  },
  "lav-tempo": {
    order: 5,
    compact: true,
    description: "Mediana giorni tra ingresso e chiusura delle archiviate nel periodo (P90 in sottotitolo).",
  },
  "flotta-officina": {
    order: 7,
    description: "Mezzi con almeno una lavorazione non archiviata collegata.",
  },
  "fleet-disponibilita": {
    order: 6,
    hero: true,
    description: "Percentuale mezzi senza lavorazione aperta sul parco totale (proxy).",
  },
  "clienti-sotto-soglia": {
    order: 8,
    hero: true,
    description: "Clienti con disponibilità flotta sotto il 75% (proxy su lav aperte).",
  },
  "fleet-tempo-fermo": {
    order: 9,
    description: "Media giorni tra ingresso e chiusura delle lavorazioni completate nel periodo.",
  },
  "fleet-mezzi-critici": {
    order: 10,
    description: "Mezzi classificati con frequenza guasti elevata (euristica interventi).",
  },
  cap: {
    order: 8,
    hero: true,
    description: "Valore di magazzino a costo di acquisto (istantaneo, non legato al periodo).",
  },
  "mag-entrate": {
    order: 8.5,
    hero: true,
    description: "Somma quantità in entrata dai movimenti di magazzino nel periodo.",
  },
  "mag-valore-rischio": {
    order: 8.6,
    compact: true,
    description: "Valore stimato dei pezzi mancanti rispetto alla scorta minima (prezzo netto fornitore).",
  },
  "mag-copertura-media": {
    order: 8.7,
    compact: true,
    description: "Media giorni di copertura sugli articoli con uscite nel periodo.",
  },
  "mag-dead-stock": {
    order: 8.8,
    compact: true,
    description: "Articoli con giacenza > 0 e nessuna uscita negli ultimi 90 giorni.",
  },
  "mag-rotazione": {
    order: 8.9,
    compact: true,
    description: "Rapporto uscite periodo / giacenza attuale (indicatore di rotazione).",
  },
  "ric-usati": {
    order: 9,
    hero: true,
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
    hero: true,
    description: "Ricambi con quantità sotto la scorta minima impostata.",
  },
};
