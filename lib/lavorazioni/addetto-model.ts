import { DEFAULT_ADDETTI_LAVORAZIONI } from "@/lib/lavorazioni/constants";

export type AddettoRecord = {
  id: string;
  nome: string;
  cognome?: string | null;
  /** Chiave stabile colore pill; default = id. */
  colorKey?: string | null;
};

export function addettoColorKey(rec: Pick<AddettoRecord, "id" | "colorKey">): string {
  const ck = rec.colorKey?.trim();
  return ck || rec.id;
}

export function createAddettoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `addetto-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function addettoDisplayName(r: Pick<AddettoRecord, "nome" | "cognome">): string {
  const nome = r.nome.trim();
  const cognome = r.cognome?.trim();
  return cognome ? `${nome} ${cognome}` : nome;
}

export function addettiLegacyNomi(records: readonly AddettoRecord[]): string[] {
  return records.map((r) => r.nome.trim()).filter(Boolean);
}

export function normalizeAddettoRecord(raw: unknown, fallbackNome?: string): AddettoRecord | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const nome = typeof o.nome === "string" ? o.nome.trim() : "";
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : createAddettoId();
    if (!nome) return null;
    const cognome =
      typeof o.cognome === "string" ? o.cognome.trim() || null : o.cognome === null ? null : null;
    const colorKey =
      typeof o.colorKey === "string" ? o.colorKey.trim() || null : o.colorKey === null ? null : null;
    return { id, nome, cognome, colorKey: colorKey ?? id };
  }
  if (typeof raw === "string") {
    const nome = raw.trim();
    if (!nome) return null;
    return { id: createAddettoId(), nome, cognome: null };
  }
  if (fallbackNome?.trim()) {
    return { id: createAddettoId(), nome: fallbackNome.trim(), cognome: null };
  }
  return null;
}

/** Migra `addetti: string[]` legacy in record strutturati (id nuovi). */
export function migrateLegacyAddettiStrings(addetti: readonly string[]): AddettoRecord[] {
  const out: AddettoRecord[] = [];
  const seen = new Set<string>();
  for (const raw of addetti) {
    const rec = normalizeAddettoRecord(raw);
    if (!rec) continue;
    const norm = rec.nome.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(rec);
  }
  return out;
}

export function parseAddettiRecordsFromPayload(raw: unknown): AddettoRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AddettoRecord[] = [];
  const seenId = new Set<string>();
  for (const item of raw) {
    const rec = normalizeAddettoRecord(item);
    if (!rec) continue;
    if (seenId.has(rec.id)) continue;
    seenId.add(rec.id);
    out.push(rec);
  }
  return out.length ? out : null;
}

export function defaultAddettiRecords(): AddettoRecord[] {
  return migrateLegacyAddettiStrings(DEFAULT_ADDETTI_LAVORAZIONI);
}

export function syncLavorazioniAddettiFromRecords(records: readonly AddettoRecord[]): {
  addettiRecords: AddettoRecord[];
  addetti: string[];
} {
  const addettiRecords = records.map((r) => ({
    id: r.id,
    nome: r.nome.trim(),
    cognome: r.cognome?.trim() ? r.cognome.trim() : null,
    colorKey: addettoColorKey(r),
  }));
  return { addettiRecords, addetti: addettiLegacyNomi(addettiRecords) };
}

export function sortAddettiRecordsByNome(records: readonly AddettoRecord[]): AddettoRecord[] {
  return [...records].sort((a, b) => a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }));
}

export function sortAddettiRecordsByCognomeNome(records: readonly AddettoRecord[]): AddettoRecord[] {
  return [...records].sort((a, b) => {
    const c = (a.cognome ?? "").localeCompare(b.cognome ?? "", "it", { sensitivity: "base" });
    if (c !== 0) return c;
    return a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });
  });
}

export function findAddettoById(records: readonly AddettoRecord[], id: string): AddettoRecord | undefined {
  return records.find((r) => r.id === id);
}

function normalizeStoredAddettoName(value: string): string {
  return value.trim().toLowerCase();
}

/** Valori storici possibili in scheda per un addetto (chiave legacy + nome completo). */
export function addettoStoredNameAliases(rec: Pick<AddettoRecord, "nome" | "cognome">): string[] {
  const out = new Set<string>();
  const nome = rec.nome.trim();
  if (nome) out.add(nome);
  const full = addettoDisplayName(rec).trim();
  if (full) out.add(full);
  return [...out];
}

/**
 * Risolve addetto da stringa salvata in scheda/log:
 * - chiave legacy `nome`
 * - `nome cognome` completo
 * - nome intero in campo `nome` (migrazione legacy)
 */
export function findAddettoByStoredName(
  records: readonly AddettoRecord[],
  stored: string,
): AddettoRecord | undefined {
  const norm = normalizeStoredAddettoName(stored);
  if (!norm || norm === "—") return undefined;

  for (const rec of records) {
    if (normalizeStoredAddettoName(rec.nome) === norm) return rec;
  }
  for (const rec of records) {
    if (normalizeStoredAddettoName(addettoDisplayName(rec)) === norm) return rec;
  }
  return undefined;
}

/** Etichetta UI da snapshot scheda (nome o nome+cognome); arricchisce da settings se match. */
export function addettoDisplayNameFromNome(
  records: readonly AddettoRecord[],
  stored: string,
): string {
  const trimmed = stored.trim();
  if (!trimmed || trimmed === "—") return "—";
  const rec = findAddettoByStoredName(records, trimmed);
  return rec ? addettoDisplayName(rec) : trimmed;
}
