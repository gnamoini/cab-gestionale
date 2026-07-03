import { DEFAULT_ADDETTI_LAVORAZIONI } from "@/lib/lavorazioni/constants";

export type AddettoRecord = {
  id: string;
  nome: string;
  cognome?: string | null;
};

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
    return { id, nome, cognome };
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

export function findAddettoByNome(records: readonly AddettoRecord[], nome: string): AddettoRecord | undefined {
  const norm = nome.trim().toLowerCase();
  return records.find((r) => r.nome.trim().toLowerCase() === norm);
}

/** Etichetta UI da chiave `nome` (scheda/log); fallback al nome grezzo se record assente. */
export function addettoDisplayNameFromNome(
  records: readonly AddettoRecord[],
  nome: string,
): string {
  const trimmed = nome.trim();
  if (!trimmed || trimmed === "—") return "—";
  const rec = findAddettoByNome(records, trimmed);
  return rec ? addettoDisplayName(rec) : trimmed;
}
