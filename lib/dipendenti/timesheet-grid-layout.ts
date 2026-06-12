/** SSOT larghezze colonne griglia presenze UI (desktop). */

export const TIMESHEET_UI_NAME_COL_REM = 8.5;
export const TIMESHEET_UI_DAY_COL_REM = 2.75;
export const TIMESHEET_UI_TOTAL_COL_REM = 4.5;

const fixedColClass = (rem: number) =>
  `w-[${rem}rem] min-w-[${rem}rem] max-w-[${rem}rem]`;

/** Colonna sticky «Dipendente» — larghezza fissa. */
export const TIMESHEET_UI_NAME_COL_CLASS = fixedColClass(TIMESHEET_UI_NAME_COL_REM);

/** Colonna totali mese — larghezza fissa. */
export const TIMESHEET_UI_TOTAL_COL_CLASS = fixedColClass(TIMESHEET_UI_TOTAL_COL_REM);

/**
 * Colonna giorno — solo min-width: si espande in modo uniforme fino a `w-full` della tabella.
 * (Niente max-width: non blocca la crescita fluida.)
 */
export const TIMESHEET_UI_DAY_COL_MIN_CLASS = `min-w-[${TIMESHEET_UI_DAY_COL_REM}rem]`;

/** @deprecated Usare `TIMESHEET_UI_DAY_COL_MIN_CLASS` per celle giorno fluide. */
export const TIMESHEET_UI_DAY_COL_CLASS = fixedColClass(TIMESHEET_UI_DAY_COL_REM);

/** Vincoli overflow su th/td (oltre alle classi col). */
export const TIMESHEET_UI_CELL_OVERFLOW_CLASS = "min-w-0 overflow-hidden";

/** Tabella fluida: riempie il contenitore; sotto il minimo colonne → scroll orizzontale. */
export const TIMESHEET_UI_TABLE_CLASS =
  "w-full border-collapse text-left text-[13px] leading-tight text-[color:var(--cab-text)] table-fixed";

const REM_TO_PX = 16;

/** Larghezza minima tabella in rem (name + days al floor + total). */
export function computeTimesheetUiTableWidthRem(dayCount: number): number {
  const safeDays = Math.max(0, dayCount);
  return TIMESHEET_UI_NAME_COL_REM + safeDays * TIMESHEET_UI_DAY_COL_REM + TIMESHEET_UI_TOTAL_COL_REM;
}

/** Larghezza minima tabella per scroll orizzontale controllato (px). */
export function computeTimesheetUiTableMinWidthPx(dayCount: number): number {
  return Math.round(computeTimesheetUiTableWidthRem(dayCount) * REM_TO_PX);
}
