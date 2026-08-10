import {
  addettoColorKey,
  addettoDisplayName,
  addettiLegacyNomi,
  createAddettoId,
  migrateLegacyAddettiStrings,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { DEFAULT_ADDETTI_LAVORAZIONI } from "@/lib/lavorazioni/constants";

export type EmployeeType = "ADDETTO" | "ALTRO";

export type DipendenteRecord = {
  id: string;
  nome: string;
  cognome?: string | null;
  colorKey?: string | null;
  employeeType: EmployeeType;
  attivo: boolean;
};

export function isEmployeeType(raw: unknown): raw is EmployeeType {
  return raw === "ADDETTO" || raw === "ALTRO";
}

export function normalizeDipendenteRecord(raw: unknown, fallbackNome?: string): DipendenteRecord | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const nome = typeof o.nome === "string" ? o.nome.trim() : "";
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : createAddettoId();
    if (!nome) return null;
    const cognome =
      typeof o.cognome === "string" ? o.cognome.trim() || null : o.cognome === null ? null : null;
    const colorKey =
      typeof o.colorKey === "string" ? o.colorKey.trim() || null : o.colorKey === null ? null : null;
    const employeeType = isEmployeeType(o.employeeType) ? o.employeeType : "ADDETTO";
    const attivo = typeof o.attivo === "boolean" ? o.attivo : true;
    return { id, nome, cognome, colorKey: colorKey ?? id, employeeType, attivo };
  }
  if (typeof raw === "string") {
    const nome = raw.trim();
    if (!nome) return null;
    return {
      id: createAddettoId(),
      nome,
      cognome: null,
      colorKey: null,
      employeeType: "ADDETTO",
      attivo: true,
    };
  }
  if (fallbackNome?.trim()) {
    const id = createAddettoId();
    return {
      id,
      nome: fallbackNome.trim(),
      cognome: null,
      colorKey: id,
      employeeType: "ADDETTO",
      attivo: true,
    };
  }
  return null;
}

/** Migra record addetto legacy (senza tipo) → DipendenteRecord ADDETTO attivo. */
export function migrateAddettoRecordToDipendente(rec: AddettoRecord): DipendenteRecord {
  return {
    id: rec.id,
    nome: rec.nome.trim(),
    cognome: rec.cognome?.trim() ? rec.cognome.trim() : null,
    colorKey: addettoColorKey(rec),
    employeeType: "ADDETTO",
    attivo: true,
  };
}

export function parseDipendentiRecordsFromArray(raw: unknown): DipendenteRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DipendenteRecord[] = [];
  const seenId = new Set<string>();
  for (const item of raw) {
    const rec = normalizeDipendenteRecord(item);
    if (!rec) continue;
    if (seenId.has(rec.id)) continue;
    seenId.add(rec.id);
    out.push(rec);
  }
  return out.length ? out : null;
}

/**
 * Parse anagrafica da payload lavorazioni.prefs:
 * 1. dipendentiRecords (SSOT)
 * 2. migrate da addettiRecords legacy
 * 3. migrate da addetti[] stringhe
 */
export function parseDipendentiRecordsFromPayload(o: Record<string, unknown>): DipendenteRecord[] {
  const fromDipendenti = parseDipendentiRecordsFromArray(o.dipendentiRecords);
  if (fromDipendenti) return fromDipendenti;

  const fromAddettiRecords = parseDipendentiRecordsFromArray(o.addettiRecords);
  if (fromAddettiRecords) return fromAddettiRecords;

  if (Array.isArray(o.addetti)) {
    const legacy = (o.addetti as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    if (legacy.length) {
      return migrateLegacyAddettiStrings(legacy).map(migrateAddettoRecordToDipendente);
    }
  }

  return migrateLegacyAddettiStrings(DEFAULT_ADDETTI_LAVORAZIONI).map(migrateAddettoRecordToDipendente);
}

export function defaultDipendentiRecords(): DipendenteRecord[] {
  return migrateLegacyAddettiStrings(DEFAULT_ADDETTI_LAVORAZIONI).map(migrateAddettoRecordToDipendente);
}

/** Tutti i dipendenti — attivi + inattivi (Impostazioni). */
export function getAllDipendentiRecords(records: readonly DipendenteRecord[]): DipendenteRecord[] {
  return [...records];
}

/** Solo dipendenti attivi. */
export function getActiveDipendentiRecords(records: readonly DipendenteRecord[]): DipendenteRecord[] {
  return records.filter((r) => r.attivo);
}

/** Addetti operativi attivi (lavorazioni / interventi). */
export function getAddettiRecords(records: readonly DipendenteRecord[]): DipendenteRecord[] {
  return records.filter((r) => r.employeeType === "ADDETTO" && r.attivo);
}

/** Altri dipendenti attivi (non produttivi). */
export function getAltriDipendentiRecords(records: readonly DipendenteRecord[]): DipendenteRecord[] {
  return records.filter((r) => r.employeeType === "ALTRO" && r.attivo);
}

/** Resolved lavorazioni: solo addetti (subset AddettoRecord-compatible). */
export function resolveAddettiRecordsFromDipendenti(records: readonly DipendenteRecord[]): AddettoRecord[] {
  return getAddettiRecords(records).map((r) => ({
    id: r.id,
    nome: r.nome.trim(),
    cognome: r.cognome?.trim() ? r.cognome.trim() : null,
    colorKey: addettoColorKey(r),
  }));
}

/** Legacy nomi string[] — unidirezionale da getAddettiRecords. */
export function resolveAddettiLegacyNomiFromDipendenti(records: readonly DipendenteRecord[]): string[] {
  return addettiLegacyNomi(resolveAddettiRecordsFromDipendenti(records));
}

/** Serializza per write storage (solo dipendentiRecords). */
export function serializeDipendentiRecordsForPayload(records: readonly DipendenteRecord[]): DipendenteRecord[] {
  return records.map((r) => ({
    id: r.id,
    nome: r.nome.trim(),
    cognome: r.cognome?.trim() ? r.cognome.trim() : null,
    colorKey: addettoColorKey(r),
    employeeType: r.employeeType,
    attivo: r.attivo,
  }));
}

export function dipendenteDisplayName(r: Pick<DipendenteRecord, "nome" | "cognome">): string {
  return addettoDisplayName(r);
}

export function findDipendenteById(records: readonly DipendenteRecord[], id: string): DipendenteRecord | undefined {
  return records.find((r) => r.id === id);
}
