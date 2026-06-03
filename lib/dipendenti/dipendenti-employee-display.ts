import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { sortAddettiRecordsByCognomeNome } from "@/lib/lavorazioni/addetto-model";
import type { DipendenteTimesheetEmployeeRow, DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";

/** Nome su prima riga, cognome sotto (da addetto collegato o da display_name). */
export function employeeNameLines(
  emp: DipendenteTimesheetEmployeeRow,
  addetto?: AddettoRecord | null,
): { nome: string; cognome: string | null } {
  if (addetto) {
    const nome = addetto.nome.trim();
    const cognome = addetto.cognome?.trim() || null;
    return { nome: nome || emp.display_name.trim(), cognome };
  }
  const parts = emp.display_name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { nome: parts[0] ?? (emp.display_name.trim() || "—"), cognome: null };
  }
  const cognome = parts[parts.length - 1]!;
  const nome = parts.slice(0, -1).join(" ");
  return { nome, cognome };
}

/** Ordina dipendenti timesheet per cognome/nome settings quando collegati per id. */
export function sortTimesheetEmployeesForDisplay(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  addettiRecords: readonly AddettoRecord[],
): DipendenteTimesheetEmployeeRow[] {
  const byAddettoId = new Map(addettiRecords.map((r) => [r.id, r]));
  const withMeta = employees.map((emp) => {
    const rec = emp.source_addetto_id ? byAddettoId.get(emp.source_addetto_id) : undefined;
    return { emp, rec };
  });
  withMeta.sort((a, b) => {
    if (a.rec && b.rec) {
      const c = (a.rec.cognome ?? "").localeCompare(b.rec.cognome ?? "", "it", { sensitivity: "base" });
      if (c !== 0) return c;
      return a.rec.nome.localeCompare(b.rec.nome, "it", { sensitivity: "base" });
    }
    return a.emp.display_name.localeCompare(b.emp.display_name, "it", { sensitivity: "base" });
  });
  return withMeta.map((x) => x.emp);
}

export function filterTimesheetEmployeesBySearch(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  addettiRecords: readonly AddettoRecord[],
  query: string,
): DipendenteTimesheetEmployeeRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...employees];
  const byAddettoId = new Map(addettiRecords.map((r) => [r.id, r]));
  return employees.filter((emp) => {
    const rec = emp.source_addetto_id ? byAddettoId.get(emp.source_addetto_id) : undefined;
    if (rec) {
      return (
        rec.nome.toLowerCase().includes(q) ||
        (rec.cognome ?? "").toLowerCase().includes(q) ||
        emp.display_name.toLowerCase().includes(q)
      );
    }
    return emp.display_name.toLowerCase().includes(q);
  });
}

/** Ordina record addetti per dropdown dipendenti. */
export function sortedAddettiForDipendentiFilter(records: readonly AddettoRecord[]): AddettoRecord[] {
  return sortAddettiRecordsByCognomeNome(records);
}

/** ID dipendenti con almeno una entry nel periodo visualizzato (mese/settimana/giorno). */
export function employeeIdsWithEntriesInPeriod(
  entries: readonly DipendenteTimesheetEntryRow[],
): Set<string> {
  const ids = new Set<string>();
  for (const e of entries) {
    if (e.dipendente_id) ids.add(e.dipendente_id);
  }
  return ids;
}

function isCurrentSettingsAddetto(
  emp: DipendenteTimesheetEmployeeRow,
  currentAddettiIds?: ReadonlySet<string>,
): boolean {
  return Boolean(emp.source_addetto_id && currentAddettiIds?.has(emp.source_addetto_id));
}

/**
 * Dipendenti visibili in pagina Dipendenti (sincronizzati con Impostazioni globali):
 * - addetti attuali in settings → sempre nel periodo visualizzato (anche senza ore, per inserimento);
 * - rimossi da settings → solo se hanno ore nel periodo visualizzato (restano a giugno, non a luglio).
 */
export function selectTimesheetEmployeesForDisplay(
  employees: readonly DipendenteTimesheetEmployeeRow[],
  employeeIdsWithEntriesInPeriodSet: ReadonlySet<string>,
  currentAddettiIds?: ReadonlySet<string>,
): DipendenteTimesheetEmployeeRow[] {
  return employees.filter((emp) => {
    if (isCurrentSettingsAddetto(emp, currentAddettiIds)) return true;
    return employeeIdsWithEntriesInPeriodSet.has(emp.id);
  });
}
