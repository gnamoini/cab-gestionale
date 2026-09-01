import type { FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { TagliandoLavorazioneFields } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import {
  bindIngressoSaveCorrelation,
  createIngressoSaveCorrelationId,
  logIngressoSavePipeline,
  nextIngressoSaveRunId,
} from "@/lib/schede/scheda-ingresso-save-pipeline-log";
import { beginIngressoSaveGeneration } from "@/lib/schede/ingresso-save-generation";
import {
  clearExplicitSaveAttempts,
  recordExplicitSaveAttempt,
  SaveOperationLoopError,
  SAVE_OPERATION_LOOP_MESSAGE,
} from "@/lib/sync/save-operation-loop-guard";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoSaveGateResult } from "@/src/hooks/use-scheda-ingresso-save-gate";
import type { SchedaIngressoMezzoLinkGateResult } from "@/src/hooks/use-scheda-ingresso-mezzo-link-gate";

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
  correlationId: string;
  lavorazioneGestione?: IngressoLavorazioneGestionePatch;
  mezzoLinkMeta?: import("@/lib/schede/scheda-ingresso-mezzo-match").SchedaIngressoMezzoLinkMeta;
};

export type IngressoSaveCommitResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; error?: string };

export type IngressoSaveResult =
  | { ok: true; runId: number; correlationId: string }
  | { ok: false; runId: number; correlationId: string; reason?: "SAVE_IN_PROGRESS" | "SAVE_CANCELLED"; error?: unknown };

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
  gateMezzoLink?: (fields: SchedaIngressoFields) => Promise<SchedaIngressoMezzoLinkGateResult>;
  commit: (input: IngressoSaveCommitInput) => Promise<IngressoSaveCommitResult>;
  onPendingChange?: (pending: boolean) => void;
  /** Entity id per loop guard — solo save espliciti utente. */
  loopGuardEntityId?: string;
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
    return { ok: false, runId: 0, correlationId: "", reason: "SAVE_IN_PROGRESS" };
  }

  const runId = nextIngressoSaveRunId();
  const correlationId = createIngressoSaveCorrelationId();
  bindIngressoSaveCorrelation(runId, correlationId);
  beginIngressoSaveGeneration(runId);
  ctx.onPendingChange?.(true);
  logIngressoSavePipeline("save_start", { runId, correlationId });

  const loopGuardId = ctx.loopGuardEntityId?.trim() ?? "";
  if (loopGuardId) {
    try {
      recordExplicitSaveAttempt("scheda_ingresso", loopGuardId);
    } catch (err) {
      if (err instanceof SaveOperationLoopError) {
        ctx.lock.release();
        ctx.onPendingChange?.(false);
        return { ok: false, runId, correlationId, error: SAVE_OPERATION_LOOP_MESSAGE };
      }
      throw err;
    }
  }

  try {
    const mezziCatalogFrozen = [...ctx.mezziCatalog];
    let outcome: IngressoSaveCommitResult = { ok: false };

    await ctx.gateSubmit(ctx.fields, async (gatedFields) => {
      let mezzoUpdatePlan: MezzoUpdateFromSchedaPlan;
      let mezzoLinkMeta: IngressoSaveCommitInput["mezzoLinkMeta"];
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

      if (ctx.gateMezzoLink) {
        try {
          const linkGate = await ctx.gateMezzoLink(gatedFields);
          mezzoLinkMeta = linkGate.mezzoLinkMeta;
        } catch (err) {
          if (err instanceof Error && err.message === "MEZZO_LINK_CANCELLED") {
            outcome = { ok: false, cancelled: true };
            return;
          }
          throw err;
        }
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
        correlationId,
        mezzoLinkMeta,
      });
      logIngressoSavePipeline("commit_end", { runId, ok: outcome.ok });
    });

    if (outcome.cancelled) {
      logIngressoSavePipeline("save_cancelled", { runId, correlationId });
      return { ok: false, runId, correlationId, reason: "SAVE_CANCELLED" };
    }

    if (!outcome.ok) {
      return { ok: false, runId, correlationId, error: outcome.error };
    }

    logIngressoSavePipeline("save_end", { runId, correlationId, ok: true });
    return { ok: true, runId, correlationId };
  } catch (err) {
    logIngressoSavePipeline("save_error", { runId, correlationId, error: String(err) });
    return { ok: false, runId, correlationId, error: err };
  } finally {
    if (loopGuardId) clearExplicitSaveAttempts("scheda_ingresso", loopGuardId);
    ctx.lock.release();
    ctx.onPendingChange?.(false);
    logIngressoSavePipeline("save_finally", { runId, correlationId });
  }
}
