import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { upsertFromSchedaV2 } from "@/lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { attrezzatureService } from "@/src/services/attrezzature.service";
import type { AttrezzaturaInsert } from "@/src/services/attrezzature.service";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import { schedaFieldsToAnagraficaSnapshot, mezzoGestitoToAnagraficaSnapshot } from "@/lib/domain/mezzo/mezzo-anagrafica-snapshot";
import {
  anagraficaHistoryOrigineFromWriteContext,
  resolveInterventoWriteContext,
  resolveMezzoUpdatePlanFromContext,
} from "@/lib/domain/intervento-context/intervento-write-context";
import { recordMezzoAnagraficaDiff } from "@/src/services/mezzo-anagrafica-history.service";
import type { MezzoRow, AttrezzaturaRow, InterventoTargetType } from "@/src/types/supabase-tables";
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
  updatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
  lavorazioneId?: string | null;
  writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
  create: (data: MezzoInsert) => Promise<MezzoRow>;
  update: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
  attrezzaturaPort?: UpsertMezzoAttrezzaturaPort;
  recordHistory?: (input: {
    mezzoId: string;
    origine: import("@/lib/domain/mezzo/record-mezzo-anagrafica-change").MezzoAnagraficaHistoryOrigine;
    oldValues: Record<string, string>;
    newValues: Record<string, string>;
    lavorazioneId?: string | null;
  }) => void | Promise<void>;
};

export type UpsertMezzoFromSchedaResult = {
  mezzoId: string | null;
  created: boolean;
  targetType?: InterventoTargetType;
  attrezzaturaId?: string | null;
  /** ponytail: nessun mezzo da creare/aggiornare (es. cliente assente e nessun match ident). */
  skipped?: boolean;
};

/** True se possiamo upsertare o aggiornare un mezzo da scheda (match esistente o cliente per insert DB). */
export function canUpsertMezzoFromSchedaIngresso(
  fields: SchedaIngressoFields,
  mezziCatalog: readonly MezzoGestito[],
  preferredMezzoId?: string | null,
): boolean {
  const resolved = resolveMezzoFromScheda({
    scheda: fields,
    existingMezzi: mezziCatalog,
    preferredMezzoId,
  });
  if (resolved.mezzoId) return true;
  return Boolean(fields.cliente.trim());
}

/**
 * UPSERT anagrafica mezzo da scheda ingresso (V2 SSOT).
 */
export async function upsertMezzoFromSchedaIngresso(
  params: UpsertMezzoFromSchedaParams,
): Promise<UpsertMezzoFromSchedaResult> {
  const { fields, mezziCatalog, create, update, preferredMezzoId, attrezzaturaPort, updatePlan, lavorazioneId, writeContext, recordHistory } =
    params;
  const resolvedCtx = resolveInterventoWriteContext(writeContext);
  const effectivePlan = updatePlan ?? resolveMezzoUpdatePlanFromContext(resolvedCtx);
  const historyOrigine = anagraficaHistoryOrigineFromWriteContext(resolvedCtx.source, "scheda");
  if (!canUpsertMezzoFromSchedaIngresso(fields, mezziCatalog, preferredMezzoId)) {
    const preferred = preferredMezzoId?.trim();
    const hit = preferred ? mezziCatalog.find((m) => m.id === preferred) ?? null : null;
    return {
      mezzoId: hit?.id ?? null,
      created: false,
      skipped: true,
      targetType: "telaio",
      attrezzaturaId: null,
    };
  }

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
    { fields, mezziCatalog, preferredMezzoId, updatePlan: effectivePlan, lavorazioneId },
    {
      createMezzo: create,
      updateMezzo: async (id, data) => {
        const before = mezziCatalog.find((m) => m.id === id);
        const row = await update(id, data);
        if (effectivePlan.updateAnagrafica && effectivePlan.fieldsToUpdate.length > 0 && before) {
          const oldSnap = mezzoGestitoToAnagraficaSnapshot(before);
          const newSnap = schedaFieldsToAnagraficaSnapshot(fields);
          const oldValues: Record<string, string> = {};
          const newValues: Record<string, string> = {};
          for (const key of effectivePlan.fieldsToUpdate) {
            oldValues[key] = oldSnap[key] ?? "";
            newValues[key] = newSnap[key] ?? "";
          }
          const record = recordHistory ?? ((input) => {
            void recordMezzoAnagraficaDiff(input);
          });
          void record({
            mezzoId: id,
            origine: historyOrigine,
            oldValues,
            newValues,
            lavorazioneId,
          });
        }
        return row;
      },
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
