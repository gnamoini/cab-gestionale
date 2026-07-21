/**
 * Stock SSOT (R-12, Invariant S-01).
 *
 * - Ledger causale: movimenti_ricambi
 * - Proiezione materializzata: magazzino_ricambi.quantita
 * - OCC: magazzino_ricambi.stock_version
 *
 * Runtime UI: Stock Entity Cache — mai SUM(movimenti) per giacenza live.
 */
export const MAGAZZINO_QUANTITY_SSOT = "magazzino_ricambi.quantita" as const;
export const MAGAZZINO_STOCK_VERSION_SSOT = "magazzino_ricambi.stock_version" as const;
export const MOVIMENTI_LEDGER_SSOT = "movimenti_ricambi" as const;

/** Invariant S-01 — quantita deve essere proiezione del ledger. */
export const STOCK_INVARIANT_S01 =
  "magazzino_ricambi.quantita == proiezione(movimenti_ricambi)" as const;
