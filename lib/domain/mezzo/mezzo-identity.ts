import { normalizeVehicleIdentifier } from "@/lib/schede/normalize-vehicle-identifier";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import type { MezzoRow } from "@/src/types/supabase-tables";

export function normalizeTarga(raw: string | null | undefined): string | null {
  const n = normalizeVehicleIdentifier("targa", raw);
  return n || null;
}

export function normalizeVinIdentity(raw: string | null | undefined): string | null {
  const n = normalizeVin(raw);
  return n || null;
}

export function normCliente(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  return t && t.length > 0 ? t.toLowerCase() : null;
}

export function normScuderiaIdentity(raw: string | null | undefined): string | null {
  const n = normalizeVehicleIdentifier("scuderia", raw);
  return n || null;
}

function hasStrongIdentifier(row: Pick<MezzoRow, "telaio_num" | "targa">): boolean {
  if (normalizeVinIdentity(row.telaio_num)) return true;
  if (normalizeTarga(row.targa)) return true;
  return false;
}

function hasSignificantOperationalData(
  row: Pick<
    MezzoRow,
    | "marca_telaio"
    | "modello_telaio"
    | "tipo_telaio"
    | "cliente"
    | "utilizzatore"
    | "anno"
    | "km"
    | "note"
    | "numero_scuderia"
  >,
): boolean {
  if (row.marca_telaio?.trim()) return true;
  if (row.modello_telaio?.trim()) return true;
  if (row.tipo_telaio?.trim()) return true;
  if (row.cliente?.trim()) return true;
  if (row.utilizzatore?.trim()) return true;
  if (row.anno != null) return true;
  if (row.km != null) return true;
  if (row.note?.trim()) return true;
  if (normScuderiaIdentity(row.numero_scuderia)) return true;
  return false;
}

/** Vero solo senza identificativi forti e senza dati operativi significativi. */
export function isMezzoEmptyShell(row: MezzoRow): boolean {
  if (hasStrongIdentifier(row)) return false;
  return !hasSignificantOperationalData(row);
}

export function countMezzoAnagraficaFields(row: MezzoRow): number {
  let n = 0;
  if (normalizeVinIdentity(row.telaio_num)) n++;
  if (normalizeTarga(row.targa)) n++;
  if (row.marca_telaio?.trim()) n++;
  if (row.modello_telaio?.trim()) n++;
  if (row.tipo_telaio?.trim()) n++;
  if (row.cliente?.trim()) n++;
  if (row.utilizzatore?.trim()) n++;
  if (row.numero_scuderia?.trim()) n++;
  if (row.anno != null) n++;
  if (row.km != null) n++;
  if (row.note?.trim()) n++;
  return n;
}

/** Priorità: VIN > targa > più campi > più vecchio. */
export function pickCanonicalMezzo(rows: readonly MezzoRow[]): MezzoRow {
  if (rows.length === 0) throw new Error("pickCanonicalMezzo: empty");
  if (rows.length === 1) return rows[0]!;
  return [...rows].sort((a, b) => {
    const aVin = normalizeVinIdentity(a.telaio_num) ? 1 : 0;
    const bVin = normalizeVinIdentity(b.telaio_num) ? 1 : 0;
    if (bVin !== aVin) return bVin - aVin;
    const aTarga = normalizeTarga(a.targa) ? 1 : 0;
    const bTarga = normalizeTarga(b.targa) ? 1 : 0;
    if (bTarga !== aTarga) return bTarga - aTarga;
    const aFields = countMezzoAnagraficaFields(a);
    const bFields = countMezzoAnagraficaFields(b);
    if (bFields !== aFields) return bFields - aFields;
    return a.created_at.localeCompare(b.created_at);
  })[0]!;
}

export type MezzoPartialIdentityIncoming = {
  cliente?: string | null;
  tipo_telaio?: string | null;
  numero_scuderia?: string | null;
  targa?: string | null;
  telaio_num?: string | null;
};

function partialIdentityCompatible(candidate: MezzoRow, incoming: MezzoPartialIdentityIncoming): boolean {
  const incCliente = normCliente(incoming.cliente);
  const candCliente = normCliente(candidate.cliente);
  if (incCliente && candCliente && incCliente !== candCliente) return false;

  const incTipo = incoming.tipo_telaio?.trim() || null;
  const candTipo = candidate.tipo_telaio?.trim() || null;
  if (incTipo && candTipo && incTipo.toLowerCase() !== candTipo.toLowerCase()) return false;

  const incScud = normScuderiaIdentity(incoming.numero_scuderia);
  const candScud = normScuderiaIdentity(candidate.numero_scuderia);
  if (incScud && candScud && incScud !== candScud) return false;

  return isMezzoEmptyShell(candidate) || !hasStrongIdentifier(candidate);
}

export type UpgradeCandidateResult =
  | { kind: "candidate"; row: MezzoRow }
  | { kind: "none" }
  | { kind: "ambiguous"; reason: string };

/** Fallback upgrade quando identificativi forti assenti ma identità parziale compatibile. */
export function findUpgradeCandidateByPartialIdentity(
  rows: readonly MezzoRow[],
  incoming: MezzoPartialIdentityIncoming,
): UpgradeCandidateResult {
  const incScud = normScuderiaIdentity(incoming.numero_scuderia);
  const incCliente = normCliente(incoming.cliente);
  if (!incScud && !incCliente) return { kind: "none" };

  const hits = rows.filter((r) => partialIdentityCompatible(r, incoming));
  if (hits.length === 0) return { kind: "none" };
  if (hits.length === 1) return { kind: "candidate", row: hits[0]! };

  const shells = hits.filter(isMezzoEmptyShell);
  if (shells.length === 1) return { kind: "candidate", row: shells[0]! };

  return {
    kind: "ambiguous",
    reason: "multiple_partial_identity_candidates",
  };
}

export function clienteConflict(
  existing: MezzoRow,
  incomingCliente: string | null | undefined,
): boolean {
  const ex = normCliente(existing.cliente);
  const inc = normCliente(incomingCliente);
  return Boolean(ex && inc && ex !== inc);
}

export function targaConflict(
  existing: MezzoRow,
  incomingTarga: string | null | undefined,
): boolean {
  const ex = normalizeTarga(existing.targa);
  const inc = normalizeTarga(incomingTarga);
  return Boolean(ex && inc && ex !== inc);
}
