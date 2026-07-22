import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { MEZZO_UPDATE_SCHEDA_ONLY } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { MezzoAnagraficaHistoryOrigine } from "@/lib/domain/mezzo/record-mezzo-anagrafica-change";
import type { MezzoMeteringFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";

export type InterventoWriteSource = "manual" | "import_ai" | "migration";

export type InterventoWriteContext = {
  source: InterventoWriteSource;
  mezzoUpdatePlan?: MezzoUpdateFromSchedaPlan;
};

export const DEFAULT_INTERVENTO_WRITE_CONTEXT: InterventoWriteContext = { source: "manual" };

export function resolveInterventoWriteContext(
  writeContext?: InterventoWriteContext | null,
  legacyPlan?: MezzoUpdateFromSchedaPlan,
): InterventoWriteContext {
  if (writeContext) {
    return {
      source: writeContext.source,
      mezzoUpdatePlan: writeContext.mezzoUpdatePlan ?? legacyPlan,
    };
  }
  return { source: "manual", mezzoUpdatePlan: legacyPlan };
}

export function resolveMezzoUpdatePlanFromContext(ctx: InterventoWriteContext): MezzoUpdateFromSchedaPlan {
  return ctx.mezzoUpdatePlan ?? MEZZO_UPDATE_SCHEDA_ONLY;
}

export function anagraficaHistoryOrigineFromWriteContext(
  source: InterventoWriteSource,
  path: "scheda" | "manual_edit" = "scheda",
): MezzoAnagraficaHistoryOrigine {
  if (source === "import_ai") return "import_ai";
  if (source === "migration") return "migrazione";
  return path === "manual_edit" ? "modifica_manuale" : "scheda_ingresso";
}

export function splitMezzoUpdatePlanForCreate(plan: MezzoUpdateFromSchedaPlan): {
  anagraficaPlan: MezzoUpdateFromSchedaPlan;
  meteringPlan: MezzoUpdateFromSchedaPlan | null;
} {
  const anagraficaPlan: MezzoUpdateFromSchedaPlan = {
    updateAnagrafica: plan.updateAnagrafica,
    fieldsToUpdate: plan.fieldsToUpdate,
    updateMetering: false,
    meteringFields: [] as MezzoMeteringFieldKey[],
    forceDespiteStale: plan.forceDespiteStale,
    mezzoOCC: plan.mezzoOCC,
  };
  const meteringPlan = plan.updateMetering
    ? ({
        ...MEZZO_UPDATE_SCHEDA_ONLY,
        updateMetering: true,
        meteringFields: plan.meteringFields,
        forceDespiteStale: plan.forceDespiteStale,
        mezzoOCC: plan.mezzoOCC,
      } satisfies MezzoUpdateFromSchedaPlan)
    : null;
  return { anagraficaPlan, meteringPlan };
}
