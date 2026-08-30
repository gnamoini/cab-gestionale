import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import {
  auditInterventoContext,
  buildIdentDeltaFromContext,
} from "@/lib/domain/intervento-context/intervento-audit";
import { composeInterventoContext } from "@/lib/domain/intervento-context/build-intervento-context";
import { appendMileageFromScheda } from "@/lib/domain/asset-lifecycle/append-mileage-from-scheda";
import { isInterventoWriteRpcEnabled } from "@/lib/domain/intervento-context/intervento-write-flags";
import {
  clearInterventoWriteLedger,
  getInterventoWriteLedgerEntry,
  shouldSkipInterventoWriteStage,
  upsertInterventoWriteLedger,
} from "@/lib/domain/intervento-context/intervento-write-ledger";
import { logInterventoTelemetry } from "@/lib/domain/intervento-context/intervento-telemetry";
import type {
  InterventoWriteCreateMeta,
  InterventoWriteDeps,
  InterventoWriteEditMeta,
  InterventoWritePlan,
  InterventoWriteResult,
} from "@/lib/domain/intervento-context/intervento-write-types";
import {
  recordTraceStep,
  setTraceMode,
  type WriteExecutionTrace,
} from "@/lib/domain/intervento-context/write-execution-trace";
import { canUpsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import { buildEditLavorazionePatchFromUpsert } from "@/lib/domain/intervento-context/build-edit-lavorazione-patch";
import type { LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import { interventoWriteService } from "@/src/services/intervento-write.service";
import {
  resolveInterventoWriteContext,
  resolveMezzoUpdatePlanFromContext,
  splitMezzoUpdatePlanForCreate,
} from "@/lib/domain/intervento-context/intervento-write-context";

function isCreateMeta(meta: InterventoWritePlan["meta"]): meta is InterventoWriteCreateMeta {
  return "createdBy" in meta;
}

function runFinalizeStage(idempotencyKey: string, lavorazioneId: string, mezzoId: string): void {
  if (idempotencyKey) {
    if (!shouldSkipInterventoWriteStage(idempotencyKey, "finalize", true)) {
      upsertInterventoWriteLedger(idempotencyKey, {
        lavorazioneId,
        mezzoId,
        completedStage: "finalize",
      });
    }
    clearInterventoWriteLedger(idempotencyKey);
  }
  logInterventoTelemetry("intervento_write_finalized", { lavorazioneId, stage: "finalize" });
}

function wrapShadowDeps(_deps: InterventoWriteDeps): InterventoWriteDeps {
  void _deps;
  return {
    upsertMezzo: async () => ({ mezzoId: "shadow-noop", created: false, updated: false }),
    createLavorazione: async () => ({ id: "shadow-lav" } as never),
    updateLavorazione: async () => {},
    persistScheda: async () => ({ ok: true as const }),
  };
}

function finishSagaTrace(trace: WriteExecutionTrace | undefined, result: InterventoWriteResult): InterventoWriteResult {
  if (result.ok) {
    recordTraceStep(trace, "v2_saga_start", "completed");
    recordTraceStep(trace, "finalize", "completed");
  } else {
    recordTraceStep(trace, "v2_saga_start", "failed");
    recordTraceStep(trace, "finalize", "failed");
  }
  return result;
}

/** Shadow dry-run: saga con deps no-op, confronto vs risultato v1 authoritative. */
export async function runInterventoWriteShadow(
  plan: InterventoWritePlan,
  deps: InterventoWriteDeps,
  authoritative: InterventoWriteResult,
  trace?: WriteExecutionTrace,
): Promise<void> {
  if (trace?.isFinal) return;

  const shadowKey = `${plan.idempotencyKey}-shadow`;
  const shadowPlan = { ...plan, idempotencyKey: shadowKey };
  const shadowResult = await runInterventoWriteSaga(shadowPlan, wrapShadowDeps(deps));
  clearInterventoWriteLedger(shadowKey);

  if (authoritative.ok !== shadowResult.ok) {
    const lavId = authoritative.ok ? authoritative.lavorazioneId : authoritative.lavorazioneId;
    logInterventoTelemetry("intervento_v2_shadow_mismatch", {
      lavorazioneId: lavId,
      mismatch: true,
      stage: "ok-flag",
    });
    return;
  }
  if (
    authoritative.ok &&
    shadowResult.ok &&
    (authoritative.lavorazioneId !== shadowResult.lavorazioneId ||
      authoritative.mezzoId !== shadowResult.mezzoId)
  ) {
    logInterventoTelemetry("intervento_v2_shadow_mismatch", {
      lavorazioneId: authoritative.lavorazioneId,
      mismatch: true,
      stage: "ids",
      extra: {
        authLav: authoritative.lavorazioneId,
        shadowLav: shadowResult.lavorazioneId,
        authMezzo: authoritative.mezzoId,
        shadowMezzo: shadowResult.mezzoId,
      },
    });
  }
}

export async function runInterventoWriteSaga(
  plan: InterventoWritePlan,
  deps: InterventoWriteDeps,
  trace?: WriteExecutionTrace,
): Promise<InterventoWriteResult> {
  recordTraceStep(trace, "v2_saga_start", "started");
  const { fields, mezziCatalog, idempotencyKey } = plan;
  const createMode = plan.mode === "create";
  let lavorazioneId =
    plan.lavorazioneId?.trim() || getInterventoWriteLedgerEntry(idempotencyKey)?.lavorazioneId?.trim() || null;
  let mezzoId: string | null = getInterventoWriteLedgerEntry(idempotencyKey)?.mezzoId?.trim() || null;
  let attrezzaturaId: string | null = null;
  let targetType: import("@/src/types/supabase-tables").InterventoTargetType = "attrezzatura";

  const resolved = resolveMezzoFromScheda({
    scheda: fields,
    existingMezzi: mezziCatalog,
    preferredMezzoId: createMode
      ? isCreateMeta(plan.meta)
        ? plan.meta.mezzoIdHint
        : null
      : !isCreateMeta(plan.meta)
        ? plan.meta.row.mezzo_id
        : null,
  });

  auditInterventoContext(null, "write-mezzo", {
    stage: "resolve",
    preferredMezzoId: createMode && isCreateMeta(plan.meta) ? plan.meta.mezzoIdHint : !isCreateMeta(plan.meta) ? plan.meta.row.mezzo_id : null,
    resolvedMezzoId: resolved.mezzoId,
    matchKind: resolved.matchKind,
    extra: { phase: "v2-resolve" },
  });

  if (createMode && !lavorazioneId && isInterventoWriteRpcEnabled() && idempotencyKey) {
    recordTraceStep(trace, "rpc_atomic_call", "started");
    const meta = plan.meta as InterventoWriteCreateMeta;
    const rpc = await interventoWriteService.createInterventoAtomic({
      idempotencyKey,
      fields,
      meta,
      existingLavorazioneId: plan.lavorazioneId,
    });
    if (rpc.success && rpc.data?.ok) {
      setTraceMode(trace, "rpc_atomic");
      recordTraceStep(trace, "rpc_atomic_call", "completed");
      recordTraceStep(trace, "v1_create", "skipped");
      recordTraceStep(trace, "v1_persist", "skipped");
      runFinalizeStage(idempotencyKey, rpc.data.lavorazioneId, rpc.data.mezzoId);
      logInterventoTelemetry("intervento_create_completed", { lavorazioneId: rpc.data.lavorazioneId });
      return finishSagaTrace(trace, {
        ok: true,
        lavorazioneId: rpc.data.lavorazioneId,
        mezzoId: rpc.data.mezzoId,
      });
    }
    recordTraceStep(trace, "rpc_atomic_call", "failed");
    if (rpc.error) {
      logInterventoTelemetry("intervento_sync_drift_detected", {
        stage: "rpc-fallback-saga",
        mismatch: true,
      });
    }
  }

  if (createMode && !lavorazioneId) {
    const createMeta = isCreateMeta(plan.meta) ? plan.meta : null;
    const writeCtx = createMeta
      ? resolveInterventoWriteContext(createMeta.writeContext, createMeta.mezzoUpdatePlan)
      : { source: "manual" as const };
    const { anagraficaPlan, meteringPlan } = splitMezzoUpdatePlanForCreate(
      resolveMezzoUpdatePlanFromContext(writeCtx),
    );

    if (!shouldSkipInterventoWriteStage(idempotencyKey, "prepare-mezzo", true)) {
      try {
        const upsert = await deps.upsertMezzo({
          fields,
          preferredMezzoId: createMeta?.mezzoIdHint ?? null,
          updatePlan: anagraficaPlan,
          writeContext: writeCtx,
        });
        mezzoId = upsert.mezzoId?.trim() || null;
        if (upsert.skipped) {
          targetType = "telaio";
          attrezzaturaId = null;
        } else {
          attrezzaturaId = upsert.attrezzaturaId ?? null;
          targetType = upsert.targetType ?? "telaio";
        }
        auditInterventoContext(null, "write-mezzo", {
          preferredMezzoId: createMeta?.mezzoIdHint ?? null,
          resolvedMezzoId: resolved.mezzoId,
          matchKind: resolved.matchKind,
          extra: { phase: "v2-create-pre-upsert" },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore upsert mezzo.";
        return finishSagaTrace(trace, { ok: false, stage: "prepare-mezzo", error: message });
      }
    }

    if (!shouldSkipInterventoWriteStage(idempotencyKey, "prepare-lavorazione", true) && deps.createLavorazione) {
      try {
        const meta = plan.meta as InterventoWriteCreateMeta;
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
        upsertInterventoWriteLedger(idempotencyKey, { lavorazioneId, mezzoId: mezzoId ?? "" });
        if (meteringPlan && mezzoId) {
          await deps.upsertMezzo({
            fields,
            preferredMezzoId: mezzoId,
            updatePlan: meteringPlan,
            lavorazioneId,
            writeContext: writeCtx,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore creazione lavorazione.";
        return finishSagaTrace(trace, { ok: false, stage: "prepare-lavorazione", error: message });
      }
    }
  } else if (createMode && lavorazioneId) {
    const createMeta = isCreateMeta(plan.meta) ? plan.meta : null;
    const writeCtx = createMeta
      ? resolveInterventoWriteContext(createMeta.writeContext, createMeta.mezzoUpdatePlan)
      : { source: "manual" as const };
    const { meteringPlan } = splitMezzoUpdatePlanForCreate(resolveMezzoUpdatePlanFromContext(writeCtx));
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
        return finishSagaTrace(trace, { ok: false, stage: "prepare-mezzo", error: message, lavorazioneId });
      }
    }
  }

  let editLavorazionePatch: LavorazioneUpdate | undefined;

  if (!createMode && !isCreateMeta(plan.meta) && deps.upsertMezzo) {
    recordTraceStep(trace, "v1_create", "skipped");
    const editMeta = plan.meta as InterventoWriteEditMeta;
    const row = editMeta.row;
    lavorazioneId = row.id;

    if (!canUpsertMezzoFromSchedaIngresso(fields, plan.mezziCatalog, row.mezzo_id)) {
      recordTraceStep(trace, "v1_persist", "skipped");
      runFinalizeStage(idempotencyKey, row.id, row.mezzo_id ?? "");
      return finishSagaTrace(trace, { ok: true, lavorazioneId: row.id, mezzoId: row.mezzo_id ?? "" });
    }

    const ctx = composeInterventoContext({
      lavorazioneId: row.id,
      lavorazioneRow: row,
      mezzoRow: row.mezzo,
      ingressoCampi: fields,
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

    recordTraceStep(trace, "v1_persist", "started");
    try {
      const editWriteCtx = resolveInterventoWriteContext(
        editMeta.writeContext,
        editMeta.mezzoUpdatePlan,
      );
      const upsert = await deps.upsertMezzo({
        fields,
        preferredMezzoId: row.mezzo_id,
        updatePlan: resolveMezzoUpdatePlanFromContext(editWriteCtx),
        lavorazioneId: row.id,
        writeContext: editWriteCtx,
      });
      mezzoId = upsert.mezzoId?.trim() || null;
      attrezzaturaId = upsert.attrezzaturaId ?? null;
      targetType = upsert.targetType ?? targetType;

      const lavPatch = buildEditLavorazionePatchFromUpsert(row, fields, {
        mezzoId,
        targetType,
        attrezzaturaId,
      });
      if (Object.keys(lavPatch).length > 0) {
        editLavorazionePatch = lavPatch;
      }
      recordTraceStep(trace, "v1_persist", "completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sync mezzo/lavorazione.";
      recordTraceStep(trace, "v1_persist", "failed");
      return finishSagaTrace(trace, { ok: false, stage: "prepare-lavorazione", error: message });
    }
  }

  if (createMode && deps.persistScheda && lavorazioneId) {
    if (!shouldSkipInterventoWriteStage(idempotencyKey, "persist-scheda", true)) {
      recordTraceStep(trace, "v1_persist", "started");
      try {
        const meta = plan.meta as InterventoWriteCreateMeta;
        const persist = await deps.persistScheda({
          lavorazioneId,
          fields,
          createdBy: meta.createdBy,
        });
        if (!persist.ok) {
          upsertInterventoWriteLedger(idempotencyKey, { lavorazioneId, mezzoId: mezzoId ?? undefined });
          const error =
            persist.kind === "concurrency" ? persist.error : persist.error;
          recordTraceStep(trace, "v1_persist", "failed");
          return finishSagaTrace(trace, {
            ok: false,
            stage: "persist-scheda",
            error,
            lavorazioneId,
          });
        }
        upsertInterventoWriteLedger(idempotencyKey, {
          lavorazioneId,
          mezzoId: mezzoId ?? undefined,
          completedStage: "persist-scheda",
        });
        recordTraceStep(trace, "v1_persist", "completed");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore persist scheda.";
        recordTraceStep(trace, "v1_persist", "failed");
        return finishSagaTrace(trace, { ok: false, stage: "persist-scheda", error: message, lavorazioneId });
      }
    } else {
      recordTraceStep(trace, "v1_persist", "skipped");
    }
  }

  if (!lavorazioneId) {
    return finishSagaTrace(trace, { ok: false, stage: "prepare-lavorazione", error: "Lavorazione non disponibile." });
  }

  const finalMezzoId = mezzoId ?? resolved.mezzoId ?? "";
  if (finalMezzoId) {
    try {
      await appendMileageFromScheda({
        mezzoId: finalMezzoId,
        kmText: fields.km,
        lavorazioneId,
      });
    } catch {
      // ponytail: mileage storico non blocca write intervento
    }
  }
  runFinalizeStage(idempotencyKey, lavorazioneId, finalMezzoId);
  return finishSagaTrace(trace, {
    ok: true,
    lavorazioneId,
    mezzoId: finalMezzoId,
    ...(editLavorazionePatch && Object.keys(editLavorazionePatch).length > 0
      ? { lavorazionePatch: editLavorazionePatch }
      : {}),
  });
}
