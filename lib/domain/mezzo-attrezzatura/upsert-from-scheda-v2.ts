import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { resolveTargetTypeFromScheda } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { trimOrNull } from "@/lib/domain/mezzo-attrezzatura/backfill-rules";
import { mezzoFormToMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { AttrezzaturaInsert, AttrezzaturaUpdate } from "@/src/services/attrezzature.service";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import { logAttrezzatureV2WritePath } from "@/lib/observability/attrezzature-v2-telemetry";
import type { UpsertFromSchedaV2Result } from "@/lib/attrezzature/types";

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
    telaio_num: null,
    km: trimOrNull(fields.km) ? Number(fields.km) : null,
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
  },
  deps: UpsertFromSchedaV2Deps,
): Promise<UpsertFromSchedaV2Result> {
  const { fields, mezziCatalog, preferredMezzoId, attrezzaturaIdHint } = params;
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
    const patch = mergeMezzoPatch(
      {
        id: mezzoId,
        cliente: resolved.mezzo!.cliente,
        utilizzatore: resolved.mezzo!.utilizzatore === "—" ? null : resolved.mezzo!.utilizzatore,
        marca: resolved.mezzo!.marca,
        modello: resolved.mezzo!.modello,
        targa: resolved.mezzo!.targa === "—" ? null : resolved.mezzo!.targa,
        matricola: resolved.mezzo!.matricola === "Non assegnata" ? null : resolved.mezzo!.matricola,
        numero_scuderia: resolved.mezzo!.numeroScuderia ?? null,
        tipo_attrezzatura: resolved.mezzo!.tipoAttrezzatura === "—" ? null : resolved.mezzo!.tipoAttrezzatura,
        anno: resolved.mezzo!.anno,
        meta: {},
        created_at: "",
        updated_at: "",
      },
      incomingMezzo,
    );
    if (Object.keys(patch).length > 0) {
      await deps.updateMezzo(mezzoId, patch);
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
    await deps.updateAttrezzatura(attrezzaturaId, {
      marca: fields.marcaAttrezzatura.trim() || undefined,
      modello: fields.modelloAttrezzatura.trim() || undefined,
      tipo_attrezzatura: trimOrNull(fields.tipoAttrezzatura),
      matricola,
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
