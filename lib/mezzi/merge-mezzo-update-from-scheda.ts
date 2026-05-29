import { mezzoFormToMeta, parseMezzoMeta, type MezzoAnagraficaMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

export type MezzoMergeExisting = {
  cliente: string;
  utilizzatore: string | null;
  marca: string;
  modello: string;
  targa: string | null;
  matricola: string | null;
  numero_scuderia: string | null;
  tipo_attrezzatura: string | null;
  anno: number | null;
  meta: Record<string, unknown> | null;
};

/** Valore incoming vuoto: non deve sovrascrivere l’anagrafica esistente. */
export function isMezzoIncomingScalarEmpty(v: string | null | undefined): boolean {
  if (v === null || v === undefined) return true;
  const t = v.trim();
  return t.length === 0 || t === "—";
}

function uiScalarToDb(v: string | null | undefined, uiSentinels: string[]): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  if (!t || uiSentinels.some((s) => s.toLowerCase() === t.toLowerCase())) return null;
  return t;
}

export function mezzoRowToMergeExisting(row: MezzoRow): MezzoMergeExisting {
  return {
    cliente: row.cliente,
    utilizzatore: row.utilizzatore,
    marca: row.marca,
    modello: row.modello,
    targa: row.targa,
    matricola: row.matricola,
    numero_scuderia: row.numero_scuderia,
    tipo_attrezzatura: row.tipo_attrezzatura,
    anno: row.anno,
    meta: row.meta,
  };
}

export function mezzoGestitoToMergeExisting(m: MezzoGestito): MezzoMergeExisting {
  return {
    cliente: m.cliente,
    utilizzatore: uiScalarToDb(m.utilizzatore, ["—"]),
    marca: m.marca,
    modello: uiScalarToDb(m.modello, ["—"]) ?? "—",
    targa: uiScalarToDb(m.targa, ["—"]),
    matricola: uiScalarToDb(m.matricola, ["—", "Non assegnata"]),
    numero_scuderia: m.numeroScuderia?.trim() || null,
    tipo_attrezzatura: uiScalarToDb(m.tipoAttrezzatura, ["—"]),
    anno: m.anno ?? null,
    meta: mezzoFormToMeta({
      cantiere: m.cantiere ?? "",
      tipoTelaio: m.tipoTelaio ?? "",
      marcaTelaio: m.marcaTelaio ?? "",
      modelloTelaio: m.modelloTelaio ?? "",
      oreLavoro: m.oreKm != null ? String(m.oreKm) : "",
      km: m.km != null ? String(m.km) : "",
    }) as Record<string, unknown>,
  };
}

function mergeMetaField(
  existing: MezzoAnagraficaMeta,
  incoming: MezzoAnagraficaMeta,
): MezzoAnagraficaMeta {
  const out: MezzoAnagraficaMeta = { ...existing };
  const strFields = ["cantiere", "tipoTelaio", "marcaTelaio", "modelloTelaio"] as const;
  for (const key of strFields) {
    const v = incoming[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  if (incoming.oreLavoro != null && incoming.oreLavoro >= 0) out.oreLavoro = incoming.oreLavoro;
  if (incoming.km != null && incoming.km >= 0) out.km = incoming.km;
  return out;
}

function metaRecordsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Patch UPDATE: solo campi incoming non vuoti; `anno` non viene mai aggiornato dalla scheda.
 */
export function mergeMezzoUpdateFromScheda(existing: MezzoMergeExisting, incoming: MezzoInsert): MezzoUpdate {
  const patch: MezzoUpdate = {};

  if (!isMezzoIncomingScalarEmpty(incoming.cliente)) patch.cliente = incoming.cliente.trim();
  if (!isMezzoIncomingScalarEmpty(incoming.utilizzatore)) patch.utilizzatore = incoming.utilizzatore?.trim() || null;
  if (!isMezzoIncomingScalarEmpty(incoming.marca)) patch.marca = incoming.marca.trim();
  if (!isMezzoIncomingScalarEmpty(incoming.modello)) patch.modello = incoming.modello.trim();
  if (!isMezzoIncomingScalarEmpty(incoming.targa)) patch.targa = incoming.targa?.trim() || null;
  if (!isMezzoIncomingScalarEmpty(incoming.matricola)) patch.matricola = incoming.matricola?.trim() || null;
  if (!isMezzoIncomingScalarEmpty(incoming.numero_scuderia)) {
    patch.numero_scuderia = incoming.numero_scuderia?.trim() || null;
  }
  if (!isMezzoIncomingScalarEmpty(incoming.tipo_attrezzatura)) {
    patch.tipo_attrezzatura = incoming.tipo_attrezzatura?.trim() || null;
  }

  const existingMeta = parseMezzoMeta(existing.meta);
  const incomingMeta = parseMezzoMeta(incoming.meta);
  const mergedMeta = mergeMetaField(existingMeta, incomingMeta);
  const mergedMetaRecord = mezzoFormToMeta({
    cantiere: mergedMeta.cantiere ?? "",
    tipoTelaio: mergedMeta.tipoTelaio ?? "",
    marcaTelaio: mergedMeta.marcaTelaio ?? "",
    modelloTelaio: mergedMeta.modelloTelaio ?? "",
    oreLavoro: mergedMeta.oreLavoro != null ? String(mergedMeta.oreLavoro) : "",
    km: mergedMeta.km != null ? String(mergedMeta.km) : "",
  }) as Record<string, unknown>;

  const existingMetaRecord = mezzoFormToMeta({
    cantiere: existingMeta.cantiere ?? "",
    tipoTelaio: existingMeta.tipoTelaio ?? "",
    marcaTelaio: existingMeta.marcaTelaio ?? "",
    modelloTelaio: existingMeta.modelloTelaio ?? "",
    oreLavoro: existingMeta.oreLavoro != null ? String(existingMeta.oreLavoro) : "",
    km: existingMeta.km != null ? String(existingMeta.km) : "",
  }) as Record<string, unknown>;

  if (!metaRecordsEqual(existingMetaRecord, mergedMetaRecord)) {
    patch.meta = mergedMetaRecord;
  }

  return patch;
}
