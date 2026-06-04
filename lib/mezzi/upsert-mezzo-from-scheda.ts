import { findMezzoByIngressoIdent } from "@/lib/mezzi/find-mezzo-by-ident";
import {
  mezzoGestitoToMergeExisting,
  mergeMezzoUpdateFromScheda,
} from "@/lib/mezzi/merge-mezzo-update-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { schedaIngressoFieldsToMezzoPayload } from "@/lib/schede/scheda-ingresso-mezzo-payload";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";

export class MezzoSchedaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MezzoSchedaValidationError";
  }
}

export type UpsertMezzoFromSchedaParams = {
  fields: SchedaIngressoFields;
  mezziCatalog: readonly MezzoGestito[];
  preferredMezzoId?: string | null;
  create: (data: MezzoInsert) => Promise<MezzoRow>;
  update: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
};

export type UpsertMezzoFromSchedaResult = {
  mezzoId: string;
  created: boolean;
};

function assertSchedaMezzoRequired(fields: SchedaIngressoFields): void {
  if (!fields.cliente.trim() || !fields.marcaAttrezzatura.trim()) {
    throw new MezzoSchedaValidationError("Cliente e marca attrezzatura sono obbligatori per l’anagrafica mezzo.");
  }
}

function resolveTargetMezzo(
  catalog: readonly MezzoGestito[],
  preferredMezzoId: string | undefined,
  fields: SchedaIngressoFields,
): MezzoGestito | null {
  const byIdent = findMezzoByIngressoIdent(catalog, {
    targa: fields.targa,
    matricola: fields.matricola,
    nScuderia: fields.nScuderia,
  });
  if (byIdent) return byIdent;

  const preferred = preferredMezzoId?.trim();
  if (preferred) {
    return catalog.find((m) => m.id === preferred) ?? null;
  }
  return null;
}

/**
 * UPSERT anagrafica mezzo da scheda ingresso: match per id preferito o ident (targa/matricola/scuderia),
 * UPDATE con merge selettivo o INSERT.
 */
export async function upsertMezzoFromSchedaIngresso(
  params: UpsertMezzoFromSchedaParams,
): Promise<UpsertMezzoFromSchedaResult> {
  const { fields, mezziCatalog, create, update } = params;
  assertSchedaMezzoRequired(fields);

  const preferredId = params.preferredMezzoId?.trim() || undefined;
  const target = resolveTargetMezzo(mezziCatalog, preferredId, fields);
  const annoSource = target ?? (preferredId ? mezziCatalog.find((m) => m.id === preferredId) : undefined);
  const incoming = schedaIngressoFieldsToMezzoPayload(fields, { anno: annoSource?.anno });

  if (target) {
    const existing = mezzoGestitoToMergeExisting(target);
    const patch = mergeMezzoUpdateFromScheda(existing, incoming);
    if (Object.keys(patch).length === 0) {
      return { mezzoId: target.id, created: false };
    }
    const row = await update(target.id, patch);
    return { mezzoId: row.id, created: false };
  }

  const row = await create(incoming);
  return { mezzoId: row.id, created: true };
}
