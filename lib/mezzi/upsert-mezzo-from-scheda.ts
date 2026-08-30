import { buildBrowserAttrezzaturaResolveDeps } from "@/lib/domain/mezzo-attrezzatura/build-browser-attrezzatura-resolve-deps";
import { buildBrowserMezzoResolveDeps } from "@/lib/domain/mezzo/build-browser-mezzo-resolve-deps";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import {
  resolveOrCreateAttrezzatura,
  type ResolveOrCreateAttrezzaturaDeps,
} from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import {
  resolveOrCreateMezzo,
  type ResolveOrCreateMezzoDeps,
} from "@/lib/domain/mezzo/resolve-or-create-mezzo";
import { upsertFromSchedaV2 } from "@/lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoInsert, MezzoUpdate, ApplyAssociationChangeInput } from "@/src/services/mezzi.service";
import { schedaFieldsToAnagraficaSnapshot, mezzoGestitoToAnagraficaSnapshot } from "@/lib/domain/mezzo/mezzo-anagrafica-snapshot";
import {
  anagraficaHistoryOrigineFromWriteContext,
  resolveInterventoWriteContext,
  resolveMezzoUpdatePlanFromContext,
} from "@/lib/domain/intervento-context/intervento-write-context";
import { recordMezzoAnagraficaDiff } from "@/src/services/mezzo-anagrafica-history.service";
import type { MezzoRow, InterventoTargetType } from "@/src/types/supabase-tables";
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
  updatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
  lavorazioneId?: string | null;
  writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
  userId?: string | null;
  create: (data: MezzoInsert) => Promise<MezzoRow>;
  update: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
  applyAssociationChange?: (input: ApplyAssociationChangeInput) => Promise<MezzoRow>;
  attrezzaturaResolveDeps?: ResolveOrCreateAttrezzaturaDeps;
  mezzoResolveDeps?: ResolveOrCreateMezzoDeps;
  recordHistory?: (input: {
    mezzoId: string;
    origine: import("@/lib/domain/mezzo/record-mezzo-anagrafica-change").MezzoAnagraficaHistoryOrigine;
    oldValues: Record<string, string>;
    newValues: Record<string, string>;
    lavorazioneId?: string | null;
    userId?: string | null;
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
  const {
    fields,
    mezziCatalog,
    
    update,
    applyAssociationChange,
    preferredMezzoId,
    attrezzaturaResolveDeps,
    mezzoResolveDeps,
    updatePlan,
    lavorazioneId,
    writeContext,
    recordHistory,
    userId,
  } = params;
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

  const resolveDeps = attrezzaturaResolveDeps ?? (await buildBrowserAttrezzaturaResolveDeps());
  const mezzoDeps = mezzoResolveDeps ?? (await buildBrowserMezzoResolveDeps());

  const v2 = await upsertFromSchedaV2(
    { fields, mezziCatalog, preferredMezzoId, updatePlan: effectivePlan, lavorazioneId },
    {
      resolveMezzo: (input) => resolveOrCreateMezzo(input, mezzoDeps),
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
            userId,
          });
        }
        return row;
      },
      applyAssociationChange: applyAssociationChange
        ? async (input) => {
            const row = await applyAssociationChange(input);
            return row;
          }
        : undefined,
      resolveAttrezzatura: (input) => resolveOrCreateAttrezzatura(input, resolveDeps),
    },
  );
  return {
    mezzoId: v2.mezzoId,
    created: v2.createdMezzo,
    targetType: v2.targetType,
    attrezzaturaId: v2.attrezzaturaId,
  };
}
