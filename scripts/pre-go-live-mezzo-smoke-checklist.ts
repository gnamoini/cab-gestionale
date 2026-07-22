/**
 * Smoke checklist operatori — staging (Step 3).
 * Eseguire manualmente; non automatizzabile in CI.
 *
 * A — Nuovo mezzo: targa nuova → scheda → salva → mezzo + lav + metering FK
 * B — Esistente: matricola → "Usa dati mezzo" → km/ore/anomalia/note vuoti
 * C — Conflitto: Ravo→Bucher → dialog → history scheda_ingresso vs modifica_manuale
 * D — AI: import PDF → gate → apply; import_ai in history se patch confermata
 * E — OCC: op. A scheda + op. B modifica mezzo → A salva → MEZZO_STALE_CONFLICT
 * Hub — ≥3 ingressi: panoramica origine, storico Prima/Dopo, drawer snapshot ≠ anagrafica
 */
export const PRE_GO_LIVE_MEZZO_SMOKE_CHECKLIST = [
  "A_nuovo_mezzo",
  "B_usa_dati_mezzo",
  "C_conflitto_anagrafica",
  "D_import_ai",
  "E_occ_concorrente",
  "hub_storico_snapshot",
] as const;
