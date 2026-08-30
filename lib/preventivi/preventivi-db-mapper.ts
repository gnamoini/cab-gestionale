import { ensurePreventivoStruttura } from "@/lib/preventivi/preventivi-struttura";
import { normalizePreventivoTipoDocumento } from "@/lib/preventivi/preventivi-tipo-documento";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";
import { preventivoRowToRecordStub } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";
import type { PreventivoInsert, PreventivoUpdate } from "@/src/services/preventivi.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPreventivoUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

function recordToDettagli(record: PreventivoRecord): Record<string, unknown> {
  const { ...rest } = record;
  return { ...rest, version: 1 };
}

export function preventivoRecordToInsert(
  record: PreventivoRecord,
  mezzoId: string,
): PreventivoInsert {
  const dettagli = recordToDettagli(record);
  if (!isPreventivoUuid(record.id)) {
    dettagli.localLegacyId = record.id;
  }
  const row: PreventivoInsert = {
    mezzo_id: mezzoId,
    lavorazione_id: isPreventivoUuid(record.lavorazioneId) ? record.lavorazioneId : null,
    cliente: record.cliente.trim() || "—",
    totale: record.totaleFinale,
    dettagli,
  };
  if (isPreventivoUuid(record.id)) {
    return { ...row, id: record.id } as PreventivoInsert & { id: string };
  }
  return row;
}

export function preventivoRecordToUpdate(
  record: PreventivoRecord,
  mezzoId: string,
  expectedUpdatedAt?: string,
): PreventivoUpdate {
  const dettagli = recordToDettagli(record);
  const base: PreventivoUpdate = {
    mezzo_id: mezzoId,
    lavorazione_id: isPreventivoUuid(record.lavorazioneId) ? record.lavorazioneId : null,
    cliente: record.cliente.trim() || "—",
    totale: record.totaleFinale,
    dettagli,
  };
  if (expectedUpdatedAt) {
    (base as PreventivoUpdate & { updated_at: string }).updated_at = expectedUpdatedAt;
  }
  return base;
}

/** Record completo da riga DB (+ mezzo opzionale per campi anagrafici). */
export function preventivoRowToRecord(row: PreventivoRow, mezzo: MezzoRow | null): PreventivoRecord {
  const stub = preventivoRowToRecordStub(row, mezzo);
  const det = (row.dettagli ?? {}) as Record<string, unknown>;
  const merged: PreventivoRecord = {
    ...stub,
    numero: typeof det.numero === "string" && det.numero.trim() ? det.numero : stub.numero,
    stato: (row.stato ?? (typeof det.stato === "string" ? det.stato : stub.stato)) as PreventivoStato,
    tipoDocumento: normalizePreventivoTipoDocumento(det.tipoDocumento ?? stub.tipoDocumento),
    lavorazioneOrigine: det.lavorazioneOrigine === "storico" ? "storico" : stub.lavorazioneOrigine,
    lavorazioneTimestamp:
      typeof det.lavorazioneTimestamp === "string" ? det.lavorazioneTimestamp : stub.lavorazioneTimestamp,
    righeRicambi: Array.isArray(det.righeRicambi)
      ? (det.righeRicambi as PreventivoRecord["righeRicambi"])
      : stub.righeRicambi,
    manodopera:
      det.manodopera && typeof det.manodopera === "object"
        ? (det.manodopera as PreventivoRecord["manodopera"])
        : stub.manodopera,
    sanificazionePrezzo:
      typeof det.sanificazionePrezzo === "number" ? det.sanificazionePrezzo : stub.sanificazionePrezzo,
    sanificazioneOre: typeof det.sanificazioneOre === "number" ? det.sanificazioneOre : stub.sanificazioneOre,
    sanificazioneDescrizione:
      typeof det.sanificazioneDescrizione === "string"
        ? det.sanificazioneDescrizione
        : stub.sanificazioneDescrizione,
    collaudoPrezzo: typeof det.collaudoPrezzo === "number" ? det.collaudoPrezzo : stub.collaudoPrezzo,
    collaudoOre: typeof det.collaudoOre === "number" ? det.collaudoOre : stub.collaudoOre,
    collaudoDescrizione:
      typeof det.collaudoDescrizione === "string"
        ? det.collaudoDescrizione
        : stub.collaudoDescrizione,
    noteFinali: typeof det.noteFinali === "string" ? det.noteFinali : stub.noteFinali,
    descrizioneLavorazioniCliente:
      typeof det.descrizioneLavorazioniCliente === "string"
        ? det.descrizioneLavorazioniCliente
        : stub.descrizioneLavorazioniCliente,
    descrizioneLavorazioniTecnicaSorgente:
      typeof det.descrizioneLavorazioniTecnicaSorgente === "string"
        ? det.descrizioneLavorazioniTecnicaSorgente
        : stub.descrizioneLavorazioniTecnicaSorgente,
    descrizioneGenerataAuto:
      typeof det.descrizioneGenerataAuto === "string"
        ? det.descrizioneGenerataAuto
        : stub.descrizioneGenerataAuto,
    descriptionGenerationId:
      typeof det.descriptionGenerationId === "string" ? det.descriptionGenerationId : stub.descriptionGenerationId,
    descriptionEngineMeta:
      det.descriptionEngineMeta && typeof det.descriptionEngineMeta === "object"
        ? (det.descriptionEngineMeta as PreventivoRecord["descriptionEngineMeta"])
        : stub.descriptionEngineMeta,
    createdBy: typeof det.createdBy === "string" ? det.createdBy : stub.createdBy,
    lastEditedBy: typeof det.lastEditedBy === "string" ? det.lastEditedBy : stub.lastEditedBy,
    targetType:
      det.targetType === "telaio" || det.targetType === "attrezzatura"
        ? det.targetType
        : stub.targetType,
    attrezzaturaId: typeof det.attrezzaturaId === "string" ? det.attrezzaturaId : stub.attrezzaturaId,
    attrezzaturaMarca: typeof det.attrezzaturaMarca === "string" ? det.attrezzaturaMarca : stub.attrezzaturaMarca,
    attrezzaturaModello:
      typeof det.attrezzaturaModello === "string" ? det.attrezzaturaModello : stub.attrezzaturaModello,
    attrezzaturaMatricola:
      typeof det.attrezzaturaMatricola === "string" ? det.attrezzaturaMatricola : stub.attrezzaturaMatricola,
    attrezzaturaSnapshot:
      det.attrezzaturaSnapshot && typeof det.attrezzaturaSnapshot === "object"
        ? (det.attrezzaturaSnapshot as PreventivoRecord["attrezzaturaSnapshot"])
        : stub.attrezzaturaSnapshot,
    dataCreazione: row.created_at,
    aggiornatoAt: row.updated_at,
    totaleFinale: row.totale,
  };
  const strutturato = ensurePreventivoStruttura(merged);
  const withTotals = { ...strutturato, ...calcolaTotaliPreventivo(strutturato) };
  if (typeof det.mezzoId === "string" && isPreventivoUuid(det.mezzoId.trim())) {
    withTotals.mezzoId = det.mezzoId.trim();
  } else if (row.mezzo_id && isPreventivoUuid(row.mezzo_id)) {
    withTotals.mezzoId = row.mezzo_id;
  }
  return withTotals;
}

function rowMatchesLegacyLocalRecord(row: PreventivoRow, local: PreventivoRecord): boolean {
  const det = row.dettagli as Record<string, unknown> | undefined;
  if (typeof det?.localLegacyId === "string" && det.localLegacyId === local.id) return true;
  const detNum = typeof det?.numero === "string" ? det.numero.trim() : "";
  if (!detNum || detNum !== local.numero.trim()) return false;
  if (isPreventivoUuid(local.lavorazioneId)) {
    return row.lavorazione_id === local.lavorazioneId;
  }
  return !row.lavorazione_id;
}

export function mergePreventivoRecords(
  local: readonly PreventivoRecord[],
  remote: readonly PreventivoRow[],
  mezziById: Map<string, MezzoRow>,
  dbPrimary: boolean,
): PreventivoRecord[] {
  const byId = new Map<string, PreventivoRecord>();
  const legacyToUuid = new Map<string, string>();

  for (const row of remote) {
    const mezzo = mezziById.get(row.mezzo_id) ?? null;
    const rec = preventivoRowToRecord(row, mezzo);
    byId.set(rec.id, rec);
    const det = row.dettagli as Record<string, unknown> | undefined;
    const legacy = typeof det?.localLegacyId === "string" ? det.localLegacyId : null;
    if (legacy) legacyToUuid.set(legacy, rec.id);
  }

  for (const p of local) {
    const mappedId = legacyToUuid.get(p.id);
    if (mappedId && byId.has(mappedId)) {
      if (!dbPrimary) byId.set(mappedId, p);
      continue;
    }
    if (byId.has(p.id)) {
      if (!dbPrimary) byId.set(p.id, p);
      continue;
    }
    if (!isPreventivoUuid(p.id) && dbPrimary) {
      const ghost = remote.some((row) => rowMatchesLegacyLocalRecord(row, p));
      if (ghost) continue;
    }
    byId.set(p.id, p);
  }

  return [...byId.values()].sort((a, b) => b.dataCreazione.localeCompare(a.dataCreazione));
}
