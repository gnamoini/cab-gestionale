/**
 * WRITE CONTRACT (dominio intervento)
 *
 * 1. scheda save → PUÒ aggiornare mezzo (forward write-through)
 * 2. mezzo save → NON aggiorna scheda
 * 3. lavorazione è solo reference FK (mezzo_id, note, data_ingresso)
 *
 * Orchestrazione logica — nessuna transazione DB atomica.
 * Entry point UI: executeInterventoWrite — syncIngressoAfterSave è interno (non esportato).
 */

import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import {
  auditInterventoContext,
  buildIdentDeltaFromContext,
} from "@/lib/domain/intervento-context/intervento-audit";
import { composeInterventoContext } from "@/lib/domain/intervento-context/build-intervento-context";
import {
  clearInterventoWriteLedger,
  getInterventoWriteLedgerEntry,
  shouldSkipInterventoWriteStage,
  upsertInterventoWriteLedger,
} from "@/lib/domain/intervento-context/intervento-write-ledger";
import {
  isInterventoWriteRpcEnabled,
  isInterventoWriteV2Enabled,
  isInterventoWriteV2ShadowEnabled,
} from "@/lib/domain/intervento-context/intervento-write-flags";
import { runInterventoWriteSaga, runInterventoWriteShadow } from "@/lib/domain/intervento-context/intervento-write-saga";
import type {
  InterventoWriteDeps,
  InterventoWritePlan,
  InterventoWriteResult,
} from "@/lib/domain/intervento-context/intervento-write-types";
import {
  createWriteExecutionTrace,
  finalizeTrace,
  recordTraceStep,
  setTraceMode,
  type InterventoWriteExecutionOutcome,
  type WriteExecutionTrace,
} from "@/lib/domain/intervento-context/write-execution-trace";
import { logInterventoTelemetry } from "@/lib/domain/intervento-context/intervento-telemetry";
import { resolveInterventoCanonical } from "@/lib/domain/intervento-context/resolve-intervento-canonical";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import { interventoWriteService } from "@/src/services/intervento-write.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { canUpsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { UpsertMezzoFromSchedaResult } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import type { LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { SchedaIngressoFields } from "@/types/schede";
import type { PrioritaLavorazione, StatoLavorazione, InterventoTargetType } from "@/src/types/supabase-tables";
import {
  resolveInterventoWriteContext,
  resolveMezzoUpdatePlanFromContext,
  splitMezzoUpdatePlanForCreate,
} from "@/lib/domain/intervento-context/intervento-write-context";
import { MEZZO_UPDATE_SCHEDA_ONLY } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";

export type CreateInterventoStage = "upsert-mezzo" | "create-lavorazione" | "persist-scheda";

export type CreateInterventoTransactionPlan = {
  fields: SchedaIngressoFields;
  meta: {
    statoId: StatoLavorazione;
    priorita: PrioritaLavorazione;
    mezzoIdHint?: string | null;
    mezzoUpdatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
    writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
    dataIngressoIso: string;
    note: string | null;
    createdBy: string;
  };
  existingLavorazioneId?: string | null;
  idempotencyKey?: string;
  mezziCatalog: readonly MezzoGestito[];
  deps: {
    upsertMezzo: (input: {
      fields: SchedaIngressoFields;
      preferredMezzoId?: string | null;
      updatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
      lavorazioneId?: string | null;
      writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
    }) => Promise<UpsertMezzoFromSchedaResult>;
    createLavorazione: (input: {
      mezzo_id: string | null;
      stato: StatoLavorazione;
      priorita: PrioritaLavorazione;
      data_ingresso: string;
      note: string | null;
      created_by: string;
      target_type: import("@/src/types/supabase-tables").InterventoTargetType;
      attrezzatura_id: string | null;
    }) => Promise<LavorazioneRow>;
    persistScheda: (input: {
      lavorazioneId: string;
      fields: SchedaIngressoFields;
      createdBy: string;
    }) => Promise<{ ok: true } | { ok: false; error: string }>;
  };
};

export type CreateInterventoTransactionResult =
  | { ok: true; lavorazioneId: string; mezzoId: string }
  | { ok: false; stage: CreateInterventoStage; error: string; lavorazioneId?: string };

export async function createInterventoTransaction(
  plan: CreateInterventoTransactionPlan,
  trace?: WriteExecutionTrace,
): Promise<CreateInterventoTransactionResult> {
  const { fields, meta, deps, mezziCatalog } = plan;
  const writeCtx = resolveInterventoWriteContext(meta.writeContext, meta.mezzoUpdatePlan);
  const fullPlan = resolveMezzoUpdatePlanFromContext(writeCtx);
  const { anagraficaPlan, meteringPlan } = splitMezzoUpdatePlanForCreate(fullPlan);
  const idempotencyKey = plan.idempotencyKey?.trim() || "";
  const ledgerEntry = idempotencyKey ? getInterventoWriteLedgerEntry(idempotencyKey) : undefined;
  let lavorazioneId =
    plan.existingLavorazioneId?.trim() || ledgerEntry?.lavorazioneId?.trim() || null;
  let mezzoId: string | null = ledgerEntry?.mezzoId?.trim() || null;
  let targetType: InterventoTargetType | null = null;
  let attrezzaturaId: string | null = null;

  if (idempotencyKey) {
    logInterventoTelemetry("intervento_create_started", { lavorazioneId: lavorazioneId ?? undefined });
  }

  if (isInterventoWriteRpcEnabled() && idempotencyKey && !lavorazioneId) {
    recordTraceStep(trace, "rpc_atomic_call", "started");
    const rpc = await interventoWriteService.createInterventoAtomic({
      idempotencyKey,
      fields,
      meta,
      existingLavorazioneId: plan.existingLavorazioneId,
    });
    if (rpc.success && rpc.data?.ok) {
      setTraceMode(trace, "rpc_atomic");
      recordTraceStep(trace, "rpc_atomic_call", "completed");
      recordTraceStep(trace, "v1_create", "skipped");
      recordTraceStep(trace, "v1_persist", "skipped");
      upsertInterventoWriteLedger(idempotencyKey, {
        lavorazioneId: rpc.data.lavorazioneId,
        mezzoId: rpc.data.mezzoId,
        completedStage: "persist-scheda",
      });
      logInterventoTelemetry("intervento_create_completed", { lavorazioneId: rpc.data.lavorazioneId });
      clearInterventoWriteLedger(idempotencyKey);
      return rpc.data;
    }
    recordTraceStep(trace, "rpc_atomic_call", "failed");
    if (rpc.error) {
      logInterventoTelemetry("intervento_sync_drift_detected", {
        lavorazioneId: lavorazioneId ?? undefined,
        stage: "rpc-fallback",
        mismatch: true,
      });
    }
  }

  if (!lavorazioneId) {
    const resolved = resolveMezzoFromScheda({
      scheda: fields,
      existingMezzi: mezziCatalog,
      preferredMezzoId: meta.mezzoIdHint,
    });
    auditInterventoContext(null, "write-mezzo", {
      preferredMezzoId: meta.mezzoIdHint,
      resolvedMezzoId: resolved.mezzoId,
      matchKind: resolved.matchKind,
      extra: { phase: "create-pre-upsert" },
    });

    if (
      idempotencyKey &&
      shouldSkipInterventoWriteStage(idempotencyKey, "prepare-mezzo", true)
    ) {
      mezzoId = ledgerEntry?.mezzoId?.trim() || mezzoId;
    } else {
    try {
      const upsert = await deps.upsertMezzo({
        fields,
        preferredMezzoId: meta.mezzoIdHint,
        updatePlan: anagraficaPlan,
        lavorazioneId: lavorazioneId ?? undefined,
        writeContext: writeCtx,
      });
      mezzoId = upsert.mezzoId?.trim() || null;
      if (upsert.skipped) {
        targetType = "telaio";
        attrezzaturaId = null;
      } else {
        targetType = upsert.targetType ?? null;
        attrezzaturaId = upsert.attrezzaturaId ?? null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore upsert mezzo.";
      auditInterventoContext(null, "write-mezzo", { stage: "upsert-mezzo", extra: { error: message } });
      recordTraceStep(trace, "v1_create", "failed");
      return { ok: false, stage: "upsert-mezzo", error: message };
    }
    }

    if (
      !idempotencyKey ||
      !shouldSkipInterventoWriteStage(idempotencyKey, "prepare-lavorazione", true)
    ) {
    try {
      if (!targetType) targetType = "telaio";
      if (targetType === "attrezzatura" && !attrezzaturaId) targetType = "telaio";
      const row = await deps.createLavorazione({
        mezzo_id: mezzoId,
        stato: meta.statoId,
        priorita: meta.priorita,
        data_ingresso: meta.dataIngressoIso,
        note: meta.note,
        created_by: meta.createdBy,
        target_type: targetType,
        attrezzatura_id: targetType === "attrezzatura" ? attrezzaturaId : null,
      });
      lavorazioneId = row.id;
      if (idempotencyKey) {
        upsertInterventoWriteLedger(idempotencyKey, { lavorazioneId, mezzoId: mezzoId ?? "" });
      }
      if (meteringPlan && mezzoId) {
        try {
          await deps.upsertMezzo({
            fields,
            preferredMezzoId: mezzoId,
            updatePlan: meteringPlan,
            lavorazioneId,
            writeContext: writeCtx,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Errore aggiornamento metering mezzo.";
          return { ok: false, stage: "upsert-mezzo", error: message, lavorazioneId };
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore creazione lavorazione.";
      recordTraceStep(trace, "v1_create", "failed");
      return { ok: false, stage: "create-lavorazione", error: message };
    }
    }
    recordTraceStep(trace, "v1_create", "completed");
  } else {
    recordTraceStep(trace, "v1_create", "skipped");
    if (meteringPlan && mezzoId && lavorazioneId) {
      try {
        await deps.upsertMezzo({
          fields,
          preferredMezzoId: mezzoId,
          updatePlan: meteringPlan,
          lavorazioneId,
          writeContext: writeCtx,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore aggiornamento metering mezzo.";
        return { ok: false, stage: "upsert-mezzo", error: message, lavorazioneId: lavorazioneId ?? undefined };
      }
    }
  }

  if (
    idempotencyKey &&
    shouldSkipInterventoWriteStage(idempotencyKey, "persist-scheda", true)
  ) {
    recordTraceStep(trace, "v1_persist", "skipped");
    if (idempotencyKey) {
      logInterventoTelemetry("intervento_create_completed", { lavorazioneId: lavorazioneId! });
      clearInterventoWriteLedger(idempotencyKey);
    }
    return {
      ok: true,
      lavorazioneId: lavorazioneId!,
      mezzoId: mezzoId ?? meta.mezzoIdHint?.trim() ?? "",
    };
  }

  recordTraceStep(trace, "v1_persist", "started");
  try {
    const persist = await deps.persistScheda({
      lavorazioneId: lavorazioneId!,
      fields,
      createdBy: meta.createdBy,
    });
    if (!persist.ok) {
      auditInterventoContext(null, "write-scheda", {
        contextId: lavorazioneId!,
        stage: "persist-scheda",
        extra: { error: persist.error },
      });
      recordTraceStep(trace, "v1_persist", "failed");
      return {
        ok: false,
        stage: "persist-scheda",
        error: persist.error,
        lavorazioneId: lavorazioneId!,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore persist scheda.";
    recordTraceStep(trace, "v1_persist", "failed");
    return {
      ok: false,
      stage: "persist-scheda",
      error: message,
      lavorazioneId: lavorazioneId ?? undefined,
    };
  }

  recordTraceStep(trace, "v1_persist", "completed");
  auditInterventoContext(null, "write-scheda", { contextId: lavorazioneId!, stage: "ok" });

  if (idempotencyKey) {
    upsertInterventoWriteLedger(idempotencyKey, {
      lavorazioneId: lavorazioneId!,
      mezzoId: mezzoId ?? undefined,
      completedStage: "persist-scheda",
    });
    logInterventoTelemetry("intervento_create_completed", { lavorazioneId: lavorazioneId! });
    clearInterventoWriteLedger(idempotencyKey);
  }

  return {
    ok: true,
    lavorazioneId: lavorazioneId!,
    mezzoId: mezzoId ?? meta.mezzoIdHint?.trim() ?? "",
  };
}

type SyncIngressoAfterSavePlan = {
  row: LavorazioneListRow;
  campi: SchedaIngressoFields;
  mezziCatalog: readonly MezzoGestito[];
  mezzoUpdatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
  writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
  deps: {
    upsertMezzo: (input: {
      fields: SchedaIngressoFields;
      preferredMezzoId?: string | null;
      updatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan;
      lavorazioneId?: string | null;
      writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
    }) => Promise<UpsertMezzoFromSchedaResult>;
    updateLavorazione: (id: string, patch: LavorazioneUpdate) => Promise<void>;
  };
};

/** Interno a write-contract — non esportato; usare executeInterventoWrite. */
async function syncIngressoAfterSave(plan: SyncIngressoAfterSavePlan): Promise<void> {
  const { row, campi, mezziCatalog, deps } = plan;
  if (!canUpsertMezzoFromSchedaIngresso(campi, mezziCatalog, row.mezzo_id)) return;

  const resolved = resolveMezzoFromScheda({
    scheda: campi,
    existingMezzi: mezziCatalog,
    preferredMezzoId: row.mezzo_id,
  });

  const ctx = composeInterventoContext({
    lavorazioneId: row.id,
    lavorazioneRow: row,
    mezzoRow: row.mezzo,
    ingressoCampi: campi,
    ingressoSorgente: "generata",
  });

  auditInterventoContext(ctx, "write-mezzo", {
    contextId: row.id,
    mismatch: ctx.meta.hasIdentMismatch,
    preferredMezzoId: row.mezzo_id,
    resolvedMezzoId: resolved.mezzoId,
    matchKind: resolved.matchKind,
    identDelta: buildIdentDeltaFromContext(ctx),
  });

  const writeCtx = resolveInterventoWriteContext(plan.writeContext, plan.mezzoUpdatePlan);
  const { mezzoId } = await deps.upsertMezzo({
    fields: campi,
    preferredMezzoId: row.mezzo_id,
    updatePlan: resolveMezzoUpdatePlanFromContext(writeCtx),
    lavorazioneId: row.id,
    writeContext: writeCtx,
  });

  const note = campi.noteIntervento?.trim() || null;
  const parsedIngresso = parseItalianDayDisplayToIso(campi.dataIngresso.trim());
  const lavPatch: LavorazioneUpdate = {};
  if (note !== (row.note ?? "").trim()) lavPatch.note = note;
  if (parsedIngresso.ok) lavPatch.data_ingresso = parsedIngresso.iso;
  const currentFk = row.mezzo_id?.trim() || "";
  if (mezzoId && mezzoId !== currentFk) lavPatch.mezzo_id = mezzoId;
  if (Object.keys(lavPatch).length) {
    await deps.updateLavorazione(row.id, lavPatch);
  }

  auditInterventoContext(ctx, "write-scheda", { contextId: row.id, extra: { lavPatchKeys: Object.keys(lavPatch) } });
}

export { isInterventoWriteV2Enabled, isInterventoWriteV2ShadowEnabled };

export type { InterventoWriteExecutionOutcome, WriteExecutionTrace } from "@/lib/domain/intervento-context/write-execution-trace";

/**
 * Entry point unico orchestrazione write.
 * v1 authoritative default; v2 saga se INTERVENTO_WRITE_V2=1; shadow dry-run se V2_SHADOW=1.
 * Debug: INTERVENTO_WRITE_DEBUG=1 logga trace JSON in console.
 */
export async function executeInterventoWrite(
  plan: InterventoWritePlan,
  deps: InterventoWriteDeps,
): Promise<InterventoWriteExecutionOutcome> {
  if (isInterventoWriteV2Enabled()) {
    const trace = createWriteExecutionTrace("v2_saga");
    const result = await runInterventoWriteSaga(plan, deps, trace);
    finalizeTrace(trace, result);
    return { result, trace };
  }

  const trace = createWriteExecutionTrace("v1");
  let v1Result: InterventoWriteResult;

  if (plan.mode === "create" && deps.createLavorazione && deps.persistScheda && "createdBy" in plan.meta) {
    recordTraceStep(trace, "v1_create", "started");
    const v1 = await createInterventoTransaction(
      {
        fields: plan.fields,
        meta: plan.meta,
        existingLavorazioneId: plan.lavorazioneId,
        idempotencyKey: plan.idempotencyKey,
        mezziCatalog: plan.mezziCatalog,
        deps: {
          upsertMezzo: deps.upsertMezzo,
          createLavorazione: deps.createLavorazione,
          persistScheda: async (input) => {
            const res = await deps.persistScheda!(input);
            if (res.ok) return { ok: true as const };
            return { ok: false as const, error: res.error };
          },
        },
      },
      trace,
    );
    v1Result = mapCreateV1Result(v1);
  } else if (plan.mode === "edit" && !("createdBy" in plan.meta) && deps.updateLavorazione) {
    recordTraceStep(trace, "v1_create", "skipped");
    const canonical = resolveInterventoCanonical("write", {
      lavorazioneRow: plan.meta.row,
      ingressoCampi: plan.fields,
    });
    auditInterventoContext(canonical.context, "write-scheda", {
      contextId: plan.meta.row.id,
      mismatch: canonical.context.meta.hasIdentMismatch,
      stage: "resolve",
    });
    let resolvedMezzoId = plan.meta.row.mezzo_id ?? "";
    recordTraceStep(trace, "v1_persist", "started");
    try {
      await syncIngressoAfterSave({
        row: plan.meta.row,
        campi: plan.fields,
        mezziCatalog: plan.mezziCatalog,
        mezzoUpdatePlan: plan.meta.mezzoUpdatePlan,
        writeContext: plan.meta.writeContext,
        deps: {
          upsertMezzo: async (input) => {
            const res = await deps.upsertMezzo(input);
            resolvedMezzoId = res.mezzoId ?? resolvedMezzoId;
            return res;
          },
          updateLavorazione: deps.updateLavorazione,
        },
      });
      recordTraceStep(trace, "v1_persist", "completed");
      v1Result = { ok: true, lavorazioneId: plan.meta.row.id, mezzoId: resolvedMezzoId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sync ingresso.";
      recordTraceStep(trace, "v1_persist", "failed");
      v1Result = { ok: false, stage: "prepare-lavorazione", error: message, lavorazioneId: plan.meta.row.id };
    }
  } else {
    const unsupported: InterventoWriteResult = {
      ok: false,
      stage: "resolve",
      error: "Piano write non supportato.",
    };
    recordTraceStep(trace, "finalize", "failed");
    finalizeTrace(trace, unsupported);
    return { result: unsupported, trace };
  }

  recordTraceStep(trace, "finalize", "completed");
  if (isInterventoWriteV2ShadowEnabled()) {
    recordTraceStep(trace, "v2_shadow_start", "started");
  }
  finalizeTrace(trace, v1Result);

  if (isInterventoWriteV2ShadowEnabled()) {
    void runInterventoWriteShadow(plan, deps, v1Result, trace);
  }

  return { result: v1Result, trace };
}

function mapCreateV1Result(v1: CreateInterventoTransactionResult): InterventoWriteResult {
  if (v1.ok) return { ok: true, lavorazioneId: v1.lavorazioneId, mezzoId: v1.mezzoId };
  const stageMap = {
    "upsert-mezzo": "prepare-mezzo",
    "create-lavorazione": "prepare-lavorazione",
    "persist-scheda": "persist-scheda",
  } as const;
  return {
    ok: false,
    stage: stageMap[v1.stage],
    error: v1.error,
    lavorazioneId: v1.lavorazioneId,
  };
}
