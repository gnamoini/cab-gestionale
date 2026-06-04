import { resolveTipoById, type TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

function parseWorkDateYmd(ymd: string): Date | null {
  const t = ymd.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/** Sabato o domenica (stesso criterio del timesheet mensile). */
export function isWeekendWorkDate(ymd: string): boolean {
  const d = parseWorkDateYmd(ymd);
  if (!d) return false;
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Tipo assenza festività (etichetta contiene "festivit", senza distinzione accenti). */
export function isFestivitaAbsenceLabel(label: string): boolean {
  const n = stripDiacritics(label.trim().toLowerCase());
  return n.includes("festivit");
}

export function entryHasAbsence(entry: DipendenteTimesheetEntryRow): boolean {
  if (Number(entry.ore_assenza) > 0) return true;
  return entry.assenza === true;
}

export function resolveAbsenceLabel(
  entry: DipendenteTimesheetEntryRow,
  tipiAssenza?: readonly TipoAssenzaConfig[],
): string {
  const fromRow = (entry.tipo_assenza_label ?? "").trim();
  if (fromRow) return fromRow;
  const tipo = resolveTipoById(tipiAssenza ?? [], entry.tipo_assenza_id);
  return tipo?.label?.trim() ?? "";
}

/** Assenza da ignorare nei KPI Report (weekend o tipo festività). */
export function shouldExcludeAbsenceFromReportKpi(
  entry: DipendenteTimesheetEntryRow,
  tipiAssenza?: readonly TipoAssenzaConfig[],
): boolean {
  if (!entryHasAbsence(entry)) return false;
  if (isWeekendWorkDate(entry.work_date)) return true;
  return isFestivitaAbsenceLabel(resolveAbsenceLabel(entry, tipiAssenza));
}

/** Entry per KPI Report: azzera assenza se esclusa; ore lavorate invariate. */
export function sanitizeEntryForReportTimesheetKpi(
  entry: DipendenteTimesheetEntryRow,
  tipiAssenza?: readonly TipoAssenzaConfig[],
): DipendenteTimesheetEntryRow {
  if (!shouldExcludeAbsenceFromReportKpi(entry, tipiAssenza)) return entry;
  return {
    ...entry,
    ore_assenza: 0,
    assenza: false,
    tipo_assenza_id: null,
    tipo_assenza_label: null,
    motivo_assenza: null,
  };
}

export function filterEntriesForReportTimesheetKpi(
  entries: readonly DipendenteTimesheetEntryRow[],
  tipiAssenza?: readonly TipoAssenzaConfig[],
): DipendenteTimesheetEntryRow[] {
  return entries.map((e) => sanitizeEntryForReportTimesheetKpi(e, tipiAssenza));
}
