import {
  findUpgradeCandidateByMissingIdentity,
  filterNullMatricolaRows,
  matricolaRowsForNorm,
  normMatricola,
  pickCanonicalAttrezzatura,
} from "@/lib/domain/mezzo-attrezzatura/attrezzatura-identity";
import {
  mergeAttrezzaturaPatch,
  type AttrezzaturaIncomingPatch,
  type AttrezzaturaMergeConflict,
  type AttrezzaturaMergeField,
} from "@/lib/domain/mezzo-attrezzatura/merge-attrezzatura-patch";
import { logMezzoMutationSaveTrace } from "@/lib/observability/mezzo-mutation-save-trace";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

export type AttrezzaturaResolveInsert = {
  mezzo_id: string;
  marca: string;
  modello: string;
  tipo_attrezzatura?: string | null;
  matricola?: string | null;
  portata?: string | null;
  anno?: number | null;
  note?: string | null;
};

export type AttrezzaturaMatchedBy =
  | "hint_id"
  | "matricola_norm"
  | "null_upgrade"
  | "race_recovery";

export type ResolveOrCreateAttrezzaturaDeps = {
  getById: (id: string) => Promise<AttrezzaturaRow | null>;
  listByMezzo: (mezzoId: string) => Promise<AttrezzaturaRow[]>;
  createRaw: (data: AttrezzaturaResolveInsert) => Promise<AttrezzaturaRow>;
  updateRaw: (id: string, patch: AttrezzaturaIncomingPatch) => Promise<AttrezzaturaRow>;
  logResolvedExisting?: (input: {
    mezzoId: string;
    incomingMatricola: string | null;
    matchedBy: AttrezzaturaMatchedBy;
    existingAttrezzaturaId: string;
    conflicts: AttrezzaturaMergeConflict[];
  }) => void | Promise<void>;
  logConflictKept?: (input: {
    mezzoId: string;
    attrezzaturaId: string;
    conflict: AttrezzaturaMergeConflict;
  }) => void | Promise<void>;
  logUpgradeAmbiguous?: (input: { mezzoId: string; reason: string }) => void | Promise<void>;
};

export type AttrezzaturaMergeMode = "fill_empty" | "user_confirmed_overwrite";

export type ResolveOrCreateAttrezzaturaParams = {
  mezzoId: string;
  incoming: AttrezzaturaResolveInsert;
  hintId?: string | null;
  /** Default fill_empty — anti-duplicati. Overwrite solo su campi in overwriteFields. */
  mergeMode?: AttrezzaturaMergeMode;
  overwriteFields?: ReadonlySet<AttrezzaturaMergeField>;
};

export type ResolveOrCreateAttrezzaturaResult = {
  row: AttrezzaturaRow;
  created: boolean;
  matchedBy: AttrezzaturaMatchedBy | "created";
  conflicts: AttrezzaturaMergeConflict[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAttrezzaturaUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "23505") return true;
  const msg = e.message?.toLowerCase() ?? "";
  return msg.includes("unique") || msg.includes("duplicate");
}

async function applyMergeUpdate(
  deps: ResolveOrCreateAttrezzaturaDeps,
  existing: AttrezzaturaRow,
  incoming: AttrezzaturaResolveInsert,
  matchedBy: AttrezzaturaMatchedBy,
  mergeOptions?: {
    mergeMode?: AttrezzaturaMergeMode;
    overwriteFields?: ReadonlySet<AttrezzaturaMergeField>;
  },
): Promise<ResolveOrCreateAttrezzaturaResult> {
  const overwriteFields =
    mergeOptions?.mergeMode === "user_confirmed_overwrite"
      ? mergeOptions.overwriteFields
      : undefined;
  const { patch, conflicts } = mergeAttrezzaturaPatch(existing, incoming, { overwriteFields });
  let row = existing;
  if (Object.keys(patch).length > 0) {
    row = await deps.updateRaw(existing.id, patch);
    logMezzoMutationSaveTrace("ATTREZZATURA_OVERWRITE_APPLIED", {
      mezzoId: existing.mezzo_id,
      attrezzaturaId: existing.id,
      fields: Object.keys(patch),
      mergeMode: mergeOptions?.mergeMode ?? "fill_empty",
    });
  }
  for (const conflict of conflicts) {
    logMezzoMutationSaveTrace("ATTREZZATURA_CONFLICT_SKIPPED", {
      mezzoId: existing.mezzo_id,
      attrezzaturaId: existing.id,
      field: conflict.field,
      mergeMode: mergeOptions?.mergeMode ?? "fill_empty",
    });
    await deps.logConflictKept?.({
      mezzoId: existing.mezzo_id,
      attrezzaturaId: existing.id,
      conflict,
    });
  }
  await deps.logResolvedExisting?.({
    mezzoId: existing.mezzo_id,
    incomingMatricola: incoming.matricola?.trim() ?? null,
    matchedBy,
    existingAttrezzaturaId: existing.id,
    conflicts,
  });
  return { row, created: false, matchedBy, conflicts };
}

async function findByMatricolaNorm(
  deps: ResolveOrCreateAttrezzaturaDeps,
  mezzoId: string,
  matricola: string,
): Promise<AttrezzaturaRow | null> {
  const norm = normMatricola(matricola);
  if (!norm) return null;
  const rows = await deps.listByMezzo(mezzoId);
  const hits = matricolaRowsForNorm(rows, mezzoId, norm);
  if (hits.length === 0) return null;
  return pickCanonicalAttrezzatura(hits);
}

export async function resolveOrCreateAttrezzatura(
  params: ResolveOrCreateAttrezzaturaParams,
  deps: ResolveOrCreateAttrezzaturaDeps,
): Promise<ResolveOrCreateAttrezzaturaResult> {
  const { mezzoId, incoming, hintId, mergeMode = "fill_empty", overwriteFields } = params;
  const incomingMatricola = incoming.matricola?.trim() ?? null;
  const mergeOpts = { mergeMode, overwriteFields };

  const hint = hintId?.trim();
  if (hint && UUID_RE.test(hint)) {
    const byHint = await deps.getById(hint);
    if (byHint?.mezzo_id === mezzoId) {
      return applyMergeUpdate(deps, byHint, { ...incoming, mezzo_id: mezzoId }, "hint_id", mergeOpts);
    }
  }

  if (incomingMatricola) {
    const byMatricola = await findByMatricolaNorm(deps, mezzoId, incomingMatricola);
    if (byMatricola) {
      return applyMergeUpdate(
        deps,
        byMatricola,
        { ...incoming, mezzo_id: mezzoId },
        "matricola_norm",
        mergeOpts,
      );
    }
  }

  if (incomingMatricola) {
    const allRows = await deps.listByMezzo(mezzoId);
    const upgrade = findUpgradeCandidateByMissingIdentity(
      filterNullMatricolaRows(allRows),
      true,
    );
    if (upgrade.kind === "candidate") {
      return applyMergeUpdate(
        deps,
        upgrade.row,
        { ...incoming, mezzo_id: mezzoId },
        "null_upgrade",
        mergeOpts,
      );
    }
    if (upgrade.kind === "ambiguous") {
      await deps.logUpgradeAmbiguous?.({ mezzoId, reason: upgrade.reason });
    }
  }

  try {
    const row = await deps.createRaw({ ...incoming, mezzo_id: mezzoId });
    return { row, created: true, matchedBy: "created", conflicts: [] };
  } catch (error) {
    if (!incomingMatricola || !isAttrezzaturaUniqueViolation(error)) throw error;
    const recovered = await findByMatricolaNorm(deps, mezzoId, incomingMatricola);
    if (!recovered) throw error;
    return applyMergeUpdate(
      deps,
      recovered,
      { ...incoming, mezzo_id: mezzoId },
      "race_recovery",
      mergeOpts,
    );
  }
}
