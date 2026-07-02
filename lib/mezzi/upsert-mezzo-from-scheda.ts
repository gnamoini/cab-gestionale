import { upsertFromSchedaV2 } from "@/lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2";
import { resolveTargetTypeFromScheda } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { attrezzatureService } from "@/src/services/attrezzature.service";
import type { AttrezzaturaInsert } from "@/src/services/attrezzature.service";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { AttrezzaturaRow, InterventoTargetType, MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";

export class MezzoSchedaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MezzoSchedaValidationError";
  }
}

export type UpsertMezzoAttrezzaturaPort = {
  createAttrezzatura: (data: AttrezzaturaInsert) => Promise<AttrezzaturaRow>;
  updateAttrezzatura: (id: string, patch: Partial<AttrezzaturaInsert>) => Promise<AttrezzaturaRow>;
  findAttrezzaturaByMatricola: (mezzoId: string, matricola: string) => Promise<AttrezzaturaRow | null>;
};

export type UpsertMezzoFromSchedaParams = {
  fields: SchedaIngressoFields;
  mezziCatalog: readonly MezzoGestito[];
  preferredMezzoId?: string | null;
  create: (data: MezzoInsert) => Promise<MezzoRow>;
  update: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
  attrezzaturaPort?: UpsertMezzoAttrezzaturaPort;
};

export type UpsertMezzoFromSchedaResult = {
  mezzoId: string;
  created: boolean;
  targetType?: InterventoTargetType;
  attrezzaturaId?: string | null;
};

function assertSchedaMezzoRequired(fields: SchedaIngressoFields): void {
  if (!fields.cliente.trim()) {
    throw new MezzoSchedaValidationError("Cliente obbligatorio per l'anagrafica mezzo.");
  }
  const target = resolveTargetTypeFromScheda({
    targetType: fields.targetType,
    marcaAttrezzatura: fields.marcaAttrezzatura,
    attrezzaturaId: fields.attrezzaturaId,
  });
  if (target === "attrezzatura" && !fields.marcaAttrezzatura.trim()) {
    throw new MezzoSchedaValidationError("Marca attrezzatura obbligatoria per intervento su attrezzatura.");
  }
}

/**
 * UPSERT anagrafica mezzo da scheda ingresso (V2 SSOT).
 */
export async function upsertMezzoFromSchedaIngresso(
  params: UpsertMezzoFromSchedaParams,
): Promise<UpsertMezzoFromSchedaResult> {
  const { fields, mezziCatalog, create, update, preferredMezzoId, attrezzaturaPort } = params;
  assertSchedaMezzoRequired(fields);

  const attPort =
    attrezzaturaPort ??
    ({
      createAttrezzatura: async (data) => {
        const res = await attrezzatureService.create(data);
        if (!res.success || !res.data) throw new MezzoSchedaValidationError(res.error ?? "Errore attrezzatura");
        return res.data;
      },
      updateAttrezzatura: async (id, patch) => {
        const res = await attrezzatureService.update(id, patch);
        if (!res.success || !res.data) throw new MezzoSchedaValidationError(res.error ?? "Errore attrezzatura");
        return res.data;
      },
      findAttrezzaturaByMatricola: async (mezzoId, matricola) => {
        const res = await attrezzatureService.findByMatricola(mezzoId, matricola);
        if (!res.success) throw new MezzoSchedaValidationError(res.error ?? "Errore attrezzatura");
        return res.data;
      },
    } satisfies UpsertMezzoAttrezzaturaPort);

  const v2 = await upsertFromSchedaV2(
    { fields, mezziCatalog, preferredMezzoId },
    {
      createMezzo: create,
      updateMezzo: update,
      createAttrezzatura: attPort.createAttrezzatura,
      updateAttrezzatura: attPort.updateAttrezzatura,
      findAttrezzaturaByMatricola: attPort.findAttrezzaturaByMatricola,
    },
  );
  return {
    mezzoId: v2.mezzoId,
    created: v2.createdMezzo,
    targetType: v2.targetType,
    attrezzaturaId: v2.attrezzaturaId,
  };
}
