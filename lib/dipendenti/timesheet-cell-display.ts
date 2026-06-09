import { employeeNameLines } from "@/lib/dipendenti/dipendenti-employee-display";
import { formatMonthLabel, type TimesheetDayInfo } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEmployeeRow, TimesheetMonthKey } from "@/lib/dipendenti/types";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { isFestivitaAbsenceLabel } from "@/lib/dipendenti/timesheet-report-kpi-filter";
import { resolveTipoAbbrev, resolveTipoById } from "@/lib/dipendenti/tipi-assenza-model";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";

function fmtOre(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "";
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

function roundOre(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Sigla motivo assenza (config o testo libero). */
export function absenceReasonCode(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): string {
  const label = value.tipoAssenzaLabel?.trim() ?? "";
  if (label && isFestivitaAbsenceLabel(label)) return "FES";
  const byId = value.tipoAssenzaId ? resolveTipoById(tipiAssenza, value.tipoAssenzaId) : undefined;
  if (byId) {
    if (isFestivitaAbsenceLabel(byId.label)) return "FES";
    return byId.abbrev;
  }
  if (label) return resolveTipoAbbrev(label, tipiAssenza);
  const custom = value.motivoCustom?.trim();
  if (custom) return custom.slice(0, 6).toUpperCase();
  return "A";
}

function absenceAbbrev(value: TimesheetCellValue, tipiAssenza: readonly TipoAssenzaConfig[]): string {
  return absenceReasonCode(value, tipiAssenza);
}

export type CellDisplaySecondaryTone = "work" | "overtime" | "absence" | "neutral";

export type CellDisplayContent = {
  primary: string;
  secondary?: string;
  secondaryTone?: CellDisplaySecondaryTone;
  title: string;
};

function joinTitle(parts: string[]): string {
  return parts.filter(Boolean).join(" · ");
}

/** Contenuto cella griglia per ogni combinazione ord / str / assenza. */
export function buildCellDisplayContent(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): CellDisplayContent {
  const { oreOrdinarie, oreStraordinarie, oreAssenza } = value;
  const hasOrd = oreOrdinarie > 0;
  const hasStr = oreStraordinarie > 0;
  const hasAss = oreAssenza > 0;
  const ord = fmtOre(oreOrdinarie);
  const str = fmtOre(oreStraordinarie);
  const ass = fmtOre(oreAssenza);
  const totWork = roundOre(oreOrdinarie + oreStraordinarie);
  const abbrev = hasAss ? absenceAbbrev(value, tipiAssenza) : "";
  const tipoLabel = value.tipoAssenzaLabel?.trim();

  if (!hasOrd && !hasStr && !hasAss) {
    return { primary: "", title: "Clicca per inserire ore o assenza" };
  }

  if (hasOrd && hasStr && hasAss) {
    return {
      primary: `${fmtOre(totWork)}h`,
      secondary: `${ord}+${str} · ${abbrev}`,
      secondaryTone: "neutral",
      title: joinTitle([
        `${ord}h ordinarie`,
        `${str}h straordinarie`,
        `${ass}h ${tipoLabel ?? "assenza"} (${abbrev})`,
      ]),
    };
  }

  if (hasOrd && hasStr) {
    return {
      primary: `${fmtOre(totWork)}h`,
      secondary: `${ord}+${str}`,
      secondaryTone: "neutral",
      title: joinTitle([`${ord}h ordinarie`, `${str}h straordinarie`, `(tot. ${fmtOre(totWork)}h)`]),
    };
  }

  if (hasOrd && hasAss) {
    return {
      primary: `${ord}h`,
      secondary: abbrev,
      secondaryTone: "absence",
      title: joinTitle([`${ord}h ordinarie`, `${ass}h ${tipoLabel ?? "assenza"} (${abbrev})`]),
    };
  }

  if (hasStr && hasAss) {
    return {
      primary: `${str}h`,
      secondary: abbrev,
      secondaryTone: "absence",
      title: joinTitle([`${str}h straordinarie`, `${ass}h ${tipoLabel ?? "assenza"} (${abbrev})`]),
    };
  }

  if (hasAss && !hasOrd && !hasStr) {
    return {
      primary: abbrev,
      secondary: ass ? `${ass}h` : undefined,
      secondaryTone: "absence",
      title: tipoLabel ? `Assenza ${ass}h — ${tipoLabel}` : `Assenza ${ass}h`,
    };
  }

  if (hasOrd) {
    return { primary: `${ord}h`, title: `${ord}h ordinarie` };
  }

  if (hasStr) {
    return {
      primary: `${str}h`,
      secondary: "str",
      secondaryTone: "overtime",
      title: `${str}h straordinarie`,
    };
  }

  return { primary: abbrev, title: tipoLabel ? `Assenza — ${tipoLabel}` : "Assenza" };
}

export type TimesheetCellLayer = "work" | "absence";

/** Contenuto cella riga presenze (solo ordinarie + straordinarie). */
export function buildWorkCellDisplayContent(value: TimesheetCellValue): CellDisplayContent {
  const { oreOrdinarie, oreStraordinarie } = value;
  const hasOrd = oreOrdinarie > 0;
  const hasStr = oreStraordinarie > 0;
  const ord = fmtOre(oreOrdinarie);
  const str = fmtOre(oreStraordinarie);
  const totWork = fmtOre(roundOre(oreOrdinarie + oreStraordinarie));

  if (!hasOrd && !hasStr) {
    return { primary: "", title: "Nessuna presenza" };
  }

  if (hasOrd && hasStr) {
    return {
      primary: totWork,
      secondary: `${ord}+${str}`,
      secondaryTone: "neutral",
      title: joinTitle([`${ord} ordinarie`, `${str} straordinarie`, `(tot. ${totWork})`]),
    };
  }

  if (hasOrd) {
    return { primary: ord, title: `${ord} ordinarie` };
  }

  return {
    primary: str,
    secondary: "STR",
    secondaryTone: "overtime",
    title: `${str} straordinarie`,
  };
}

/** Contenuto cella riga assenze. */
export function buildAbsenceCellDisplayContent(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): CellDisplayContent {
  const { oreAssenza } = value;
  const ass = fmtOre(oreAssenza);
  const abbrev = oreAssenza > 0 ? absenceAbbrev(value, tipiAssenza) : "";
  const tipoLabel = value.tipoAssenzaLabel?.trim();

  if (oreAssenza <= 0) {
    return { primary: "", title: "Nessuna assenza" };
  }

  return {
    primary: ass,
    secondary: abbrev,
    secondaryTone: "absence",
    title: tipoLabel ? `Assenza ${ass} — ${tipoLabel}` : `Assenza ${ass}`,
  };
}

export function buildLayerCellDisplayContent(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
  layer: TimesheetCellLayer,
): CellDisplayContent {
  return layer === "work"
    ? buildWorkCellDisplayContent(value)
    : buildAbsenceCellDisplayContent(value, tipiAssenza);
}

/** Intestazione colonna giorno (tooltip tabella presenze). */
export function formatTimesheetDayColumnTooltip(day: TimesheetDayInfo, monthKey: TimesheetMonthKey): string {
  const month = formatMonthLabel(monthKey);
  const weekend = day.isWeekend ? " · weekend" : "";
  return `${day.weekdayLong} ${day.day} · ${month}${weekend}`;
}

/** Nome dipendente in colonna sticky. */
export function buildTimesheetEmployeeNameTooltip(
  displayName: string,
  opts?: { inSettings?: boolean },
): string {
  const hint = opts?.inSettings === false ? " · Storico (non in addetti)" : "";
  return `Scheda ${displayName}${hint} · Clicca per aprire`;
}

/** Totali colonna «Tot. ore» nel footer. */
export function formatTimesheetFooterMonthTooltip(
  monthKey: TimesheetMonthKey,
  kind: "work" | "absence",
  amount: number,
): string {
  const month = formatMonthLabel(monthKey);
  const label = kind === "work" ? "Totale presenze mese" : "Totale assenze mese";
  const value = amount > 0 ? `${amount}h` : "—";
  return `${month} · ${label}: ${value}`;
}

/** Es. "Lun 09/06" da TimesheetDayInfo.dateYmd. */
export function formatTimesheetCellTooltipDate(day: TimesheetDayInfo): string {
  const [, mm, dd] = day.dateYmd.split("-");
  const wd = day.weekdayShort.charAt(0).toLocaleUpperCase("it-IT") + day.weekdayShort.slice(1);
  return `${wd} ${dd}/${mm}`;
}

/** Tooltip multilinea cella griglia: cognome, data, azione. */
export function buildTimesheetCellTooltip(opts: {
  employee: DipendenteTimesheetEmployeeRow;
  addetto?: AddettoRecord | null;
  day: TimesheetDayInfo;
  readOnly?: boolean;
}): string {
  const { cognome } = employeeNameLines(opts.employee, opts.addetto);
  const nameLine = cognome?.trim() || opts.employee.display_name.trim() || "—";
  const actionLine = opts.readOnly ? "Sola lettura" : "Clicca per modificare";
  return [nameLine, formatTimesheetCellTooltipDate(opts.day), actionLine].join("\n");
}

/** Footer giornaliero (totali colonna). */
export function formatTimesheetFooterDayTooltip(
  day: TimesheetDayInfo,
  monthKey: TimesheetMonthKey,
  kind: "work" | "absence",
  amount: number,
): string {
  const base = formatTimesheetDayColumnTooltip(day, monthKey);
  const label = kind === "work" ? "Totale presenze giorno" : "Totale assenze giorno";
  const value = amount > 0 ? `${amount}h` : "—";
  return `${base} · ${label}: ${value}`;
}

export function cellDisplayKindForLayer(
  value: TimesheetCellValue,
  layer: TimesheetCellLayer,
): CellDisplayKind {
  if (layer === "work") {
    if (value.oreOrdinarie <= 0 && value.oreStraordinarie <= 0) return "empty";
    if (value.oreOrdinarie > 0 && value.oreStraordinarie > 0) return "split";
    if (value.oreStraordinarie > 0) return "overtime";
    return "work";
  }
  if (value.oreAssenza <= 0) return "empty";
  return "absence";
}

/** Etichetta compatta riga presenze (PDF griglia mensile). */
export function formatWorkCellShortLabel(value: TimesheetCellValue): string {
  const content = buildWorkCellDisplayContent(value);
  if (!content.primary) return "";
  if (content.secondary === "STR") return content.primary;
  if (content.secondary) return content.secondary;
  return content.primary;
}

/** Giorno per PDF dipendente verticale: «12 mercoledì» sulla stessa riga. */
export function formatTimesheetDayLabelPdf(day: TimesheetDayInfo): string {
  return `${day.day} ${day.weekdayLong}`;
}

/** Intestazione colonna griglia PDF complessivo: numero sopra, giorno sotto. */
export function formatTimesheetDayHeaderGrid(day: TimesheetDayInfo): string {
  return `${day.day}\n${day.weekdayShort}`;
}

function fmtOrePdfCell(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "·";
  return fmtOre(v);
}

/** PDF dipendente: solo ore ordinarie. */
export function formatOrdinarieCellPdf(value: TimesheetCellValue): string {
  return fmtOrePdfCell(value.oreOrdinarie);
}

/** PDF dipendente: solo ore straordinarie. */
export function formatStraordinarieCellPdf(value: TimesheetCellValue): string {
  return fmtOrePdfCell(value.oreStraordinarie);
}

/** PDF dipendente: ore, sigla e motivo — es. `4 FE (Ferie)`. */
export function formatAbsenceCellDipendentePdf(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): string {
  if (value.oreAssenza <= 0) return "·";
  const ore = fmtOre(value.oreAssenza);
  const code = absenceReasonCode(value, tipiAssenza);
  const custom = value.motivoCustom?.trim();
  const label = value.tipoAssenzaLabel?.trim();
  if (label === "Altro" && custom) return `${ore} ${code} (${custom})`;
  const tipo = value.tipoAssenzaId ? resolveTipoById(tipiAssenza, value.tipoAssenzaId) : undefined;
  const fullLabel = label || tipo?.label;
  if (fullLabel) return `${ore} ${code} (${fullLabel})`;
  return `${ore} ${code}`;
}

/** Etichetta compatta riga assenze (PDF): ore + codice motivo (es. `7 F`). */
export function formatAbsenceCellShortLabel(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): string {
  if (value.oreAssenza <= 0) return "";
  const ore = fmtOre(value.oreAssenza);
  const code = absenceReasonCode(value, tipiAssenza);
  return `${ore}\u00a0${code}`;
}

/** Etichetta compatta (PDF, liste). */
export function formatCellShortLabel(
  value: TimesheetCellValue,
  tipiAssenza: readonly TipoAssenzaConfig[],
): string {
  const { oreOrdinarie, oreStraordinarie, oreAssenza } = value;
  if (oreOrdinarie <= 0 && oreStraordinarie <= 0 && oreAssenza <= 0) return "";

  const ord = fmtOre(oreOrdinarie);
  const str = fmtOre(oreStraordinarie);
  const abbrev = oreAssenza > 0 ? absenceAbbrev(value, tipiAssenza) : "";

  if (oreOrdinarie > 0 && oreStraordinarie > 0 && oreAssenza > 0) {
    return `${ord}+${str}+${abbrev}`;
  }
  if (oreOrdinarie > 0 && oreStraordinarie > 0) return `${ord}+${str}`;
  if (oreOrdinarie > 0 && oreAssenza > 0) return `${ord}h+${abbrev}`;
  if (oreStraordinarie > 0 && oreAssenza > 0) return `${str}h+${abbrev}`;
  if (oreAssenza > 0 && oreOrdinarie <= 0 && oreStraordinarie <= 0) {
    return abbrev;
  }
  if (ord) return `${ord}h`;
  if (str) return `${str}h`;
  return abbrev || "A";
}

export function cellHasData(value: TimesheetCellValue): boolean {
  return value.oreOrdinarie > 0 || value.oreStraordinarie > 0 || value.oreAssenza > 0;
}

export type CellDisplayKind =
  | "empty"
  | "work"
  | "overtime"
  | "split"
  | "absence"
  | "work_absence"
  | "overtime_absence"
  | "full";

export function cellDisplayKind(value: TimesheetCellValue): CellDisplayKind {
  if (!cellHasData(value)) return "empty";

  const hasOrd = value.oreOrdinarie > 0;
  const hasStr = value.oreStraordinarie > 0;
  const hasAss = value.oreAssenza > 0;

  if (hasOrd && hasStr && hasAss) return "full";
  if (hasOrd && hasStr) return "split";
  if (hasOrd && hasAss) return "work_absence";
  if (hasStr && hasAss) return "overtime_absence";
  if (hasAss) return "absence";
  if (hasStr) return "overtime";
  return "work";
}

const CELL_FILLED_FRAME =
  "border border-[color:color-mix(in_srgb,var(--cab-border)_22%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--cab-text)_5%,transparent)]";

const CELL_FILLED_HOVER = "active:brightness-[0.98]";

/** Cella vuota — sfondo/bordo sul td (crosshair CSS), pulsante trasparente a tutta area. */
export const CELL_EMPTY_WEEKEND_CLASS = "border-0 border-transparent bg-transparent shadow-none";

export const CELL_EMPTY_BASE_CLASS = "border-0 border-transparent bg-transparent shadow-none";

/** Hover vuoto: evidenziazione su td via `.timesheet-presenze-grid` (non sul button). */
export const CELL_EMPTY_HOVER_WORK = "";

export const CELL_EMPTY_HOVER_ABSENCE = "";

export const CELL_KIND_CLASS: Record<CellDisplayKind, string> = {
  empty: CELL_EMPTY_BASE_CLASS,
  work: `${CELL_FILLED_FRAME} bg-[color:color-mix(in_srgb,var(--cab-success)_22%,transparent)] text-[color:var(--cab-text)] hover:bg-[color:color-mix(in_srgb,var(--cab-success)_30%,transparent)] ${CELL_FILLED_HOVER}`,
  overtime: `${CELL_FILLED_FRAME} bg-[color:color-mix(in_srgb,var(--cab-warning)_26%,transparent)] text-[color:var(--cab-text)] hover:bg-[color:color-mix(in_srgb,var(--cab-warning)_34%,transparent)] ${CELL_FILLED_HOVER}`,
  split: `${CELL_FILLED_FRAME} bg-[linear-gradient(160deg,color-mix(in_srgb,var(--cab-success)_22%,transparent)_0%,color-mix(in_srgb,var(--cab-warning)_28%,transparent)_100%)] text-[color:var(--cab-text)] ${CELL_FILLED_HOVER}`,
  absence: `${CELL_FILLED_FRAME} bg-[color:color-mix(in_srgb,var(--cab-danger)_22%,transparent)] text-[color:var(--cab-text)] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_30%,transparent)] ${CELL_FILLED_HOVER}`,
  work_absence: `${CELL_FILLED_FRAME} bg-[linear-gradient(160deg,color-mix(in_srgb,var(--cab-success)_20%,transparent)_0%,color-mix(in_srgb,var(--cab-danger)_24%,transparent)_100%)] text-[color:var(--cab-text)] ${CELL_FILLED_HOVER}`,
  overtime_absence: `${CELL_FILLED_FRAME} bg-[linear-gradient(160deg,color-mix(in_srgb,var(--cab-warning)_24%,transparent)_0%,color-mix(in_srgb,var(--cab-danger)_24%,transparent)_100%)] text-[color:var(--cab-text)] ${CELL_FILLED_HOVER}`,
  full: `${CELL_FILLED_FRAME} bg-[linear-gradient(135deg,color-mix(in_srgb,var(--cab-success)_18%,transparent)_0%,color-mix(in_srgb,var(--cab-warning)_20%,transparent)_45%,color-mix(in_srgb,var(--cab-danger)_22%,transparent)_100%)] text-[color:var(--cab-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-warning)_28%,transparent)] ${CELL_FILLED_HOVER}`,
};

export const CELL_SECONDARY_TONE_CLASS: Record<CellDisplaySecondaryTone, string> = {
  work: "text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]",
  overtime: "text-[color:color-mix(in_srgb,var(--cab-warning)_92%,var(--cab-text))]",
  absence: "text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]",
  neutral: "text-[color:var(--cab-text-muted)]",
};
