import type { FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { TagliandoLavorazioneFields } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import {
  logIngressoSavePipeline,
  nextIngressoSaveRunId,
} from "@/lib/schede/scheda-ingresso-save-pipeline-log";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoSaveGateResult } from "@/src/hooks/use-scheda-ingresso-save-gate";

export type IngressoLavorazioneGestionePatch = {
  stato?: StatoLavorazione;
  priorita?: PrioritaLavorazione;
};

export type IngressoSaveCommitInput = {
  fields: SchedaIngressoFields;
  mezzoUpdatePlan: MezzoUpdateFromSchedaPlan;
  lavorazioneNote: string;
  tagliandoFields: TagliandoLavorazioneFields;
  mezziCatalogFrozen: readonly MezzoGestito[];
  runId: number;
  lavorazioneGestione?: IngressoLavorazioneGestionePatch;
};

export type IngressoSaveCommitResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; error?: string };

export type IngressoSaveResult =
  | { ok: true; runId: number }
  | { ok: false; runId: number; reason?: "SAVE_IN_PROGRESS" | "SAVE_CANCELLED"; error?: unknown };

export type IngressoSavePipelineContext = {
  lock: FormSubmitLock;
  fields: SchedaIngressoFields;
  lavorazioneNote: string;
  tagliandoFields: TagliandoLavorazioneFields;
  lavorazioneGestione?: IngressoLavorazioneGestionePatch;
  mezziCatalog: readonly MezzoGestito[];
  gateSubmit: (
    fields: SchedaIngressoFields,
    proceed: (fields: SchedaIngressoFields) => void | Promise<void>,
  ) => Promise<void>;
  gateSave: (fields: SchedaIngressoFields) => Promise<SchedaIngressoSaveGateResult>;
  commit: (input: IngressoSaveCommitInput) => Promise<IngressoSaveCommitResult>;
  onPendingChange?: (pending: boolean) => void;
};

/**
 * Pipeline lineare SSOT: lock → gate unknown → gate mezzo → commit → finally.
 * Un solo meccanismo di sync: submit lock.
 */
export async function runIngressoSavePipeline(
  ctx: IngressoSavePipelineContext,
): Promise<IngressoSaveResult> {
  if (!ctx.lock.acquire()) {
    logIngressoSavePipeline("save_in_progress", {});
    return { ok: false, runId: 0, reason: "SAVE_IN_PROGRESS" };
  }

  const runId = nextIngressoSaveRunId();
  ctx.onPendingChange?.(true);
  logIngressoSavePipeline("save_start", { runId });

  try {
    const mezziCatalogFrozen = [...ctx.mezziCatalog];
    let outcome: IngressoSaveCommitResult = { ok: false };

    await ctx.gateSubmit(ctx.fields, async (gatedFields) => {
      let mezzoUpdatePlan: MezzoUpdateFromSchedaPlan;
      try {
        logIngressoSavePipeline("mezzo_gate_start", { runId });
        mezzoUpdatePlan = await ctx.gateSave(gatedFields);
        logIngressoSavePipeline("mezzo_gate_end", { runId });
      } catch (err) {
        if (err instanceof Error && err.message === "SAVE_CANCELLED") {
          outcome = { ok: false, cancelled: true };
          return;
        }
        if (err instanceof Error && err.message === "SAVE_IN_PROGRESS") {
          outcome = { ok: false, error: "SAVE_IN_PROGRESS" };
          return;
        }
        throw err;
      }

      logIngressoSavePipeline("commit_start", { runId });
      outcome = await ctx.commit({
        fields: gatedFields,
        mezzoUpdatePlan,
        lavorazioneNote: ctx.lavorazioneNote,
        tagliandoFields: ctx.tagliandoFields,
        lavorazioneGestione: ctx.lavorazioneGestione,
        mezziCatalogFrozen,
        runId,
      });
      logIngressoSavePipeline("commit_end", { runId, ok: outcome.ok });
    });

    if (outcome.cancelled) {
      logIngressoSavePipeline("save_cancelled", { runId });
      return { ok: false, runId, reason: "SAVE_CANCELLED" };
    }

    if (!outcome.ok) {
      return { ok: false, runId, error: outcome.error };
    }

    logIngressoSavePipeline("save_end", { runId, ok: true });
    return { ok: true, runId };
  } catch (err) {
    logIngressoSavePipeline("save_error", { runId, error: String(err) });
    return { ok: false, runId, error: err };
  } finally {
    ctx.lock.release();
    ctx.onPendingChange?.(false);
    logIngressoSavePipeline("save_finally", { runId });
  }
}
