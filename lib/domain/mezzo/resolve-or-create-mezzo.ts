import {
  clienteConflict,
  findUpgradeCandidateByPartialIdentity,
  normalizeTarga,
  normalizeVinIdentity,
  pickCanonicalMezzo,
  targaConflict,
} from "@/lib/domain/mezzo/mezzo-identity";
import {
  mergeMezzoPatch,
  type MezzoIncomingPatch,
  type MezzoMergeConflict,
} from "@/lib/domain/mezzo/merge-mezzo-patch";
import { findMezziByTarga, findMezziByVin } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoInsert } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

export type MezzoResolveInsert = MezzoInsert;

export type MezzoMatchedBy =
  | "hint_id"
  | "vin_norm"
  | "targa_norm"
  | "partial_upgrade"
  | "race_recovery";

export type ResolveOrCreateMezzoDeps = {
  getById: (id: string) => Promise<MezzoRow | null>;
  findByVinNorm: (vinNorm: string) => Promise<MezzoRow[]>;
  findByTargaNorm: (targaNorm: string) => Promise<MezzoRow[]>;
  listPartialIdentityCandidates: (input: {
    cliente?: string | null;
    numero_scuderia?: string | null;
    tipo_telaio?: string | null;
  }) => Promise<MezzoRow[]>;
  createRaw: (data: MezzoResolveInsert) => Promise<MezzoRow>;
  updateRaw: (id: string, patch: MezzoIncomingPatch) => Promise<MezzoRow>;
  logResolvedExisting?: (input: {
    mezzoId: string;
    matchedBy: MezzoMatchedBy;
    incomingIdent: { vin?: string | null; targa?: string | null };
    conflicts: MezzoMergeConflict[];
  }) => void | Promise<void>;
  logConflictKept?: (input: {
    mezzoId: string;
    conflict: MezzoMergeConflict;
  }) => void | Promise<void>;
  logDuplicatePrevented?: (input: {
    mezzoId: string;
    matchedBy: MezzoMatchedBy;
  }) => void | Promise<void>;
  logUpgradeAmbiguous?: (input: { reason: string }) => void | Promise<void>;
};

export type ResolveOrCreateMezzoResult = {
  row: MezzoRow;
  created: boolean;
  matchedBy: MezzoMatchedBy | "created";
  conflicts: MezzoMergeConflict[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMezzoUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "23505") return true;
  const msg = e.message?.toLowerCase() ?? "";
  return msg.includes("unique") || msg.includes("duplicate");
}

function gestitoToRow(m: MezzoGestito): MezzoRow {
  return {
    id: m.id,
    cliente: m.cliente === "—" ? "" : m.cliente,
    utilizzatore: m.utilizzatore === "—" ? null : m.utilizzatore,
    targa: m.targa === "—" ? null : m.targa,
    numero_scuderia: m.numeroScuderia ?? null,
    anno: m.anno ?? null,
    meta: null,
    marca_telaio: m.marcaTelaio ?? null,
    modello_telaio: m.modelloTelaio ?? null,
    tipo_telaio: m.tipoTelaio ?? null,
    telaio_num: m.vin ?? null,
    km: m.km ?? null,
    note: m.note || null,
    created_at: m.ultimaModifica ?? "",
    updated_at: m.ultimaModifica ?? "",
  };
}

async function findByVin(
  deps: ResolveOrCreateMezzoDeps,
  catalog: readonly MezzoGestito[] | undefined,
  vinNorm: string,
): Promise<MezzoRow | null> {
  const fromCatalog = findMezziByVin(catalog ?? [], vinNorm);
  if (fromCatalog.length > 0) return pickCanonicalMezzo(fromCatalog.map(gestitoToRow));
  const fromDb = await deps.findByVinNorm(vinNorm);
  if (fromDb.length === 0) return null;
  return pickCanonicalMezzo(fromDb);
}

async function findByTarga(
  deps: ResolveOrCreateMezzoDeps,
  catalog: readonly MezzoGestito[] | undefined,
  targaNorm: string,
): Promise<MezzoRow | null> {
  const fromCatalog = findMezziByTarga(catalog ?? [], targaNorm);
  if (fromCatalog.length > 0) return pickCanonicalMezzo(fromCatalog.map(gestitoToRow));
  const fromDb = await deps.findByTargaNorm(targaNorm);
  if (fromDb.length === 0) return null;
  return pickCanonicalMezzo(fromDb);
}

async function applyMergeUpdate(
  deps: ResolveOrCreateMezzoDeps,
  existing: MezzoRow,
  incoming: MezzoResolveInsert,
  matchedBy: MezzoMatchedBy,
): Promise<ResolveOrCreateMezzoResult> {
  const { patch, conflicts } = mergeMezzoPatch(existing, incoming);
  let row = existing;
  if (Object.keys(patch).length > 0) {
    row = await deps.updateRaw(existing.id, patch);
  }
  for (const conflict of conflicts) {
    await deps.logConflictKept?.({ mezzoId: existing.id, conflict });
  }
  await deps.logResolvedExisting?.({
    mezzoId: existing.id,
    matchedBy,
    incomingIdent: {
      vin: incoming.telaio_num ?? null,
      targa: incoming.targa ?? null,
    },
    conflicts,
  });
  return { row, created: false, matchedBy, conflicts };
}

export async function resolveOrCreateMezzo(
  params: {
    incoming: MezzoResolveInsert;
    hintId?: string | null;
    catalog?: readonly MezzoGestito[];
  },
  deps: ResolveOrCreateMezzoDeps,
): Promise<ResolveOrCreateMezzoResult> {
  const { incoming, hintId, catalog } = params;
  const vinNorm = normalizeVinIdentity(incoming.telaio_num);
  const targaNorm = normalizeTarga(incoming.targa);

  const hint = hintId?.trim();
  if (hint && UUID_RE.test(hint)) {
    const byHint = await deps.getById(hint);
    if (byHint) {
      return applyMergeUpdate(deps, byHint, incoming, "hint_id");
    }
  }

  if (vinNorm) {
    const byVin = await findByVin(deps, catalog, vinNorm);
    if (byVin) {
      if (clienteConflict(byVin, incoming.cliente) || targaConflict(byVin, incoming.targa)) {
        const result = await applyMergeUpdate(deps, byVin, incoming, "vin_norm");
        return result;
      }
      return applyMergeUpdate(deps, byVin, incoming, "vin_norm");
    }
  }

  if (targaNorm) {
    const byTarga = await findByTarga(deps, catalog, targaNorm);
    if (byTarga) {
      return applyMergeUpdate(deps, byTarga, incoming, "targa_norm");
    }
  }

  const partialCandidates = await deps.listPartialIdentityCandidates({
    cliente: incoming.cliente,
    numero_scuderia: incoming.numero_scuderia,
    tipo_telaio: incoming.tipo_telaio,
  });
  const catalogRows = (catalog ?? []).map(gestitoToRow);
  const mergedCandidates = [
    ...partialCandidates,
    ...catalogRows.filter(
      (r) => !partialCandidates.some((p) => p.id === r.id),
    ),
  ];
  const upgrade = findUpgradeCandidateByPartialIdentity(mergedCandidates, incoming);
  if (upgrade.kind === "candidate") {
    return applyMergeUpdate(deps, upgrade.row, incoming, "partial_upgrade");
  }
  if (upgrade.kind === "ambiguous") {
    await deps.logUpgradeAmbiguous?.({ reason: upgrade.reason });
  }

  try {
    const row = await deps.createRaw(incoming);
    return { row, created: true, matchedBy: "created", conflicts: [] };
  } catch (error) {
    if (!isMezzoUniqueViolation(error)) throw error;

    if (vinNorm) {
      const recovered = await findByVin(deps, catalog, vinNorm);
      if (recovered) {
        await deps.logDuplicatePrevented?.({ mezzoId: recovered.id, matchedBy: "race_recovery" });
        return applyMergeUpdate(deps, recovered, incoming, "race_recovery");
      }
    }
    if (targaNorm) {
      const recovered = await findByTarga(deps, catalog, targaNorm);
      if (recovered) {
        await deps.logDuplicatePrevented?.({ mezzoId: recovered.id, matchedBy: "race_recovery" });
        return applyMergeUpdate(deps, recovered, incoming, "race_recovery");
      }
    }
    throw error;
  }
}
