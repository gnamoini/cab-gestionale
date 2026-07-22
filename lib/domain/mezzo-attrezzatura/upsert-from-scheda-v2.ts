import { parseDecimalInput } from "@/lib/core/decimal-input";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { resolveTargetTypeFromScheda } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { trimOrNull } from "@/lib/domain/mezzo-attrezzatura/backfill-rules";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import { mezzoFormToMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { AttrezzaturaInsert, AttrezzaturaUpdate } from "@/src/services/attrezzature.service";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import { logAttrezzatureV2WritePath } from "@/lib/observability/attrezzature-v2-telemetry";
import type { UpsertFromSchedaV2Result } from "@/lib/attrezzature/types";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { MEZZO_UPDATE_SCHEDA_ONLY, mezzoUpdatePlanAllowsMezzoWrite } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import {
  buildMezzoUpdatePatchFromSchedaPlan,
  schedaFieldsToAttrezzaturaPatch,
} from "@/lib/domain/mezzo/apply-mezzo-patch-from-scheda-fields";
import { isMezzoUpdatedAtStale } from "@/lib/domain/mezzo/mezzo-occ";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import { MezzoSchedaValidationError } from "@/lib/mezzi/upsert-mezzo-from-scheda";

export type UpsertFromSchedaV2Deps = {
  createMezzo: (data: MezzoInsert) => Promise<MezzoRow>;
  updateMezzo: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
  createAttrezzatura: (data: AttrezzaturaInsert) => Promise<AttrezzaturaRow>;
  updateAttrezzatura: (id: string, data: AttrezzaturaUpdate) => Promise<AttrezzaturaRow>;
  findAttrezzaturaByMatricola: (mezzoId: string, matricola: string) => Promise<AttrezzaturaRow | null>;
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

function schedaToAttrezzaturaPayload(fields: SchedaIngressoFields, mezzoId: string): AttrezzaturaInsert {
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

function mergeMezzoPatch(existing: MezzoRow, incoming: MezzoInsert): MezzoUpdate {
  const patch: MezzoUpdate = {};
  if (incoming.cliente.trim()) patch.cliente = incoming.cliente.trim();
  if (incoming.utilizzatore?.trim()) patch.utilizzatore = incoming.utilizzatore.trim();
  if (incoming.targa?.trim()) patch.targa = incoming.targa.trim();
  if (incoming.numero_scuderia?.trim()) patch.numero_scuderia = incoming.numero_scuderia.trim();
  if (incoming.marca_telaio) patch.marca_telaio = incoming.marca_telaio;
  if (incoming.modello_telaio) patch.modello_telaio = incoming.modello_telaio;
  if (incoming.tipo_telaio) patch.tipo_telaio = incoming.tipo_telaio;
  // ponytail: scheda merge — VIN vuoto/whitespace preserva telaio_num; mai patch.telaio_num = null
  if (incoming.telaio_num) patch.telaio_num = incoming.telaio_num;
  if (incoming.km != null) patch.km = incoming.km;
  if (incoming.meta) patch.meta = incoming.meta;
  return patch;
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
  });

  const resolved = resolveMezzoFromScheda({
    scheda: fields,
    existingMezzi: mezziCatalog,
    preferredMezzoId,
  });

  const incomingMezzo = schedaToMezzoPayload(fields, resolved.mezzo?.anno);
  let mezzoId: string;
  let createdMezzo = false;

  if (resolved.mezzoId) {
    mezzoId = resolved.mezzoId;
    if (updatePlan.updateAnagrafica || updatePlan.updateMetering) {
      if (
        mezzoUpdatePlanAllowsMezzoWrite(updatePlan) &&
        updatePlan.mezzoOCC?.updatedAtAtLinkTime &&
        resolved.mezzo?.ultimaModifica &&
        isMezzoUpdatedAtStale(updatePlan.mezzoOCC.updatedAtAtLinkTime, resolved.mezzo.ultimaModifica) &&
        !updatePlan.forceDespiteStale
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
        updatePlan,
        lavorazioneId,
      );
      if (Object.keys(patch).length > 0) {
        await deps.updateMezzo(mezzoId, patch);
      }
    }
  } else {
    const row = await deps.createMezzo(incomingMezzo);
    mezzoId = row.id;
    createdMezzo = true;
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

  const matricola = trimOrNull(fields.matricola);
  let attrezzaturaId = trimOrNull(fields.attrezzaturaId ?? attrezzaturaIdHint ?? "");
  let createdAttrezzatura = false;

  if (attrezzaturaId) {
    const attPatch = schedaFieldsToAttrezzaturaPatch(fields, updatePlan.fieldsToUpdate);
    await deps.updateAttrezzatura(attrezzaturaId, {
      marca: attPatch.marca ?? (fields.marcaAttrezzatura.trim() || undefined),
      modello: attPatch.modello ?? (fields.modelloAttrezzatura.trim() || undefined),
      tipo_attrezzatura: attPatch.tipo_attrezzatura ?? trimOrNull(fields.tipoAttrezzatura),
      matricola: attPatch.matricola ?? matricola,
    });
  } else if (matricola) {
    const existing = await deps.findAttrezzaturaByMatricola(mezzoId, matricola);
    if (existing) {
      attrezzaturaId = existing.id;
      await deps.updateAttrezzatura(existing.id, schedaToAttrezzaturaPayload(fields, mezzoId));
    }
  }

  if (!attrezzaturaId) {
    const row = await deps.createAttrezzatura(schedaToAttrezzaturaPayload(fields, mezzoId));
    attrezzaturaId = row.id;
    createdAttrezzatura = true;
  }

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
