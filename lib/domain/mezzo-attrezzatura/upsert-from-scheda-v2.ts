import { parseDecimalInput } from "@/lib/core/decimal-input";
import { PreferredMezzoInvalidError } from "@/lib/domain/mezzo/mezzo-resolution";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import {
  associationFromScheda,
  stripAssociationFieldsFromPlan,
} from "@/lib/domain/mezzo/mezzo-association";
import type { ApplyAssociationChangeInput } from "@/lib/domain/mezzo/apply-association-change";
import {
  resolveOrCreateMezzo,
  type ResolveOrCreateMezzoResult,
} from "@/lib/domain/mezzo/resolve-or-create-mezzo";
import { resolveTargetTypeFromScheda } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { trimOrNull } from "@/lib/domain/mezzo-attrezzatura/backfill-rules";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import { mezzoFormToMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type {
  ResolveOrCreateAttrezzaturaResult,
} from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { AttrezzaturaResolveInsert } from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import { logAttrezzatureV2WritePath } from "@/lib/observability/attrezzature-v2-telemetry";
import type { UpsertFromSchedaV2Result } from "@/lib/attrezzature/types";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { MEZZO_UPDATE_SCHEDA_ONLY, mezzoUpdatePlanAllowsMezzoWrite } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { buildMezzoUpdatePatchFromSchedaPlan } from "@/lib/domain/mezzo/apply-mezzo-patch-from-scheda-fields";
import { isMezzoUpdatedAtStale } from "@/lib/domain/mezzo/mezzo-occ";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import { MezzoSchedaValidationError } from "@/lib/mezzi/upsert-mezzo-from-scheda";

export type UpsertFromSchedaV2Deps = {
  resolveMezzo: (input: {
    incoming: MezzoInsert;
    hintId?: string | null;
    catalog: readonly MezzoGestito[];
  }) => Promise<ResolveOrCreateMezzoResult>;
  updateMezzo: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
  applyAssociationChange?: (input: ApplyAssociationChangeInput) => Promise<MezzoRow>;
  resolveAttrezzatura: (input: {
    mezzoId: string;
    incoming: AttrezzaturaResolveInsert;
    hintId?: string | null;
  }) => Promise<ResolveOrCreateAttrezzaturaResult>;
};

function schedaToMezzoPayload(fields: SchedaIngressoFields, anno?: number): MezzoInsert {
  const annoRaw = anno ?? new Date().getFullYear();
  const annoClamped = Math.max(1980, Math.min(2035, Number.isFinite(annoRaw) ? annoRaw : new Date().getFullYear()));
  const meta = mezzoFormToMeta({
    cantiere: fields.cantiere,
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    oreLavoro: fields.oreLavoro,
    km: fields.km,
  });
  return {
    cliente: fields.cliente.trim(),
    utilizzatore: fields.utilizzatore.trim() || null,
    targa: fields.targa.trim() || null,
    numero_scuderia: fields.nScuderia.trim() || null,
    anno: annoClamped,
    meta: meta as Record<string, unknown>,
    entity_key: null,
    marca_telaio: trimOrNull(fields.marcaTelaio),
    modello_telaio: trimOrNull(fields.modelloTelaio),
    tipo_telaio: trimOrNull(fields.tipoTelaio),
    telaio_num: normalizeVin(fields.vin),
    km: trimOrNull(fields.km) ? parseDecimalInput(fields.km) : null,
    note: null,
  };
}

function schedaToAttrezzaturaPayload(fields: SchedaIngressoFields, mezzoId: string): AttrezzaturaResolveInsert {
  const annoParsed = parseInt(fields.oreLavoro, 10);
  return {
    mezzo_id: mezzoId,
    marca: fields.marcaAttrezzatura.trim() || "—",
    modello: fields.modelloAttrezzatura.trim() || "—",
    tipo_attrezzatura: trimOrNull(fields.tipoAttrezzatura),
    matricola: trimOrNull(fields.matricola),
    portata: null,
    anno: Number.isFinite(annoParsed) ? null : null,
    note: null,
  };
}

export async function upsertFromSchedaV2(
  params: {
    fields: SchedaIngressoFields;
    mezziCatalog: readonly MezzoGestito[];
    preferredMezzoId?: string | null;
    attrezzaturaIdHint?: string | null;
    updatePlan?: MezzoUpdateFromSchedaPlan;
    lavorazioneId?: string | null;
  },
  deps: UpsertFromSchedaV2Deps,
): Promise<UpsertFromSchedaV2Result> {
  const {
    fields,
    mezziCatalog,
    preferredMezzoId,
    attrezzaturaIdHint,
    updatePlan = MEZZO_UPDATE_SCHEDA_ONLY,
    lavorazioneId,
  } = params;
  const targetType = resolveTargetTypeFromScheda({
    targetType: fields.targetType,
    marcaAttrezzatura: fields.marcaAttrezzatura,
    attrezzaturaId: fields.attrezzaturaId ?? attrezzaturaIdHint,
    matricola: fields.matricola,
    tipoAttrezzatura: fields.tipoAttrezzatura,
  });

  const resolved = resolveMezzoFromScheda({
    scheda: fields,
    existingMezzi: mezziCatalog,
    preferredMezzoId,
  });

  if (resolved.matchKind === "error") {
    throw new PreferredMezzoInvalidError(
      (resolved.errorCode as "preferred_mezzo_not_found" | "preferred_mezzo_forbidden") ??
        "preferred_mezzo_not_found",
      resolved.errorMessage ?? "Mezzo selezionato non valido.",
    );
  }
  if (resolved.matchKind === "ambiguous") {
    throw new MezzoSchedaValidationError("MEZZO_IDENT_AMBIGUOUS");
  }
  if (resolved.matchKind === "needs_confirm") {
    throw new MezzoSchedaValidationError("MEZZO_IDENT_NEEDS_CONFIRM");
  }

  const incomingMezzo = schedaToMezzoPayload(fields, resolved.mezzo?.anno);
  const hintId = preferredMezzoId?.trim() ?? resolved.mezzoId ?? null;

  const resolvedMezzo = await deps.resolveMezzo({
    incoming: incomingMezzo,
    hintId,
    catalog: mezziCatalog,
  });
  const mezzoId = resolvedMezzo.row.id;
  const createdMezzo = resolvedMezzo.created;

  if (
    !createdMezzo &&
    updatePlan.associationChangeConfirmed &&
    resolved.mezzo &&
    deps.applyAssociationChange
  ) {
    const occAt =
      updatePlan.mezzoOCC?.updatedAtAtLinkTime?.trim() ||
      resolved.mezzo.ultimaModifica?.trim() ||
      "";
    await deps.applyAssociationChange({
      mezzoId,
      existingMezzo: resolved.mezzo,
      newAssociation: associationFromScheda(fields),
      origin: "scheda_ingresso",
      expectedUpdatedAt: occAt,
      lavorazioneId,
    });
  }

  const anagraficaPlan = stripAssociationFieldsFromPlan(updatePlan);

  if (
    !createdMezzo &&
    resolved.mezzoId &&
    (anagraficaPlan.updateAnagrafica || anagraficaPlan.updateMetering)
  ) {
    if (
      mezzoUpdatePlanAllowsMezzoWrite(anagraficaPlan) &&
      anagraficaPlan.mezzoOCC?.updatedAtAtLinkTime &&
      resolved.mezzo?.ultimaModifica &&
      isMezzoUpdatedAtStale(anagraficaPlan.mezzoOCC.updatedAtAtLinkTime, resolved.mezzo.ultimaModifica) &&
      !anagraficaPlan.forceDespiteStale
    ) {
      logMezzoSchedaConflictTelemetry({
        event: "MEZZO_STALE_CONFLICT",
        mezzoId,
      });
      throw new MezzoSchedaValidationError("MEZZO_STALE_CONFLICT");
    }
    const patch = buildMezzoUpdatePatchFromSchedaPlan(
      fields,
      resolved.mezzo,
      anagraficaPlan,
      lavorazioneId,
    );
    if (Object.keys(patch).length > 0) {
      await deps.updateMezzo(mezzoId, patch);
    }
  }

  if (targetType === "telaio") {
    logAttrezzatureV2WritePath({
      path: "v2",
      operation: createdMezzo ? "create" : "update",
      targetType: "telaio",
    });
    return {
      mezzoId,
      attrezzaturaId: null,
      targetType: "telaio",
      createdMezzo,
      createdAttrezzatura: false,
    };
  }

  const resolvedAtt = await deps.resolveAttrezzatura({
    mezzoId,
    incoming: schedaToAttrezzaturaPayload(fields, mezzoId),
    hintId: fields.attrezzaturaId ?? attrezzaturaIdHint,
  });
  const attrezzaturaId = resolvedAtt.row.id;
  const createdAttrezzatura = resolvedAtt.created;

  logAttrezzatureV2WritePath({
    path: "v2",
    operation: createdMezzo ? "create" : "update",
    targetType: "attrezzatura",
  });

  return {
    mezzoId,
    attrezzaturaId,
    targetType: "attrezzatura",
    createdMezzo,
    createdAttrezzatura,
  };
}
