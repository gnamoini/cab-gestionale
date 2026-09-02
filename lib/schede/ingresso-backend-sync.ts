import { executeInterventoWriteEntry } from "@/lib/domain/intervento-entry";
import {
  applyMezzoIdImmutabilityGuard,
  buildDataIngressoPatchFromFields,
  mergeLavorazionePatches,
} from "@/lib/domain/intervento-context/build-edit-lavorazione-patch";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import { isMezzoUpdateSchedaOnly } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { logInterventoTelemetry } from "@/lib/domain/intervento-context/intervento-telemetry";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { assignTagliandoPresetToMezzoOnSave } from "@/lib/maintenance-plans/assign-tagliando-preset-to-mezzo.client";
import {
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { UpsertMezzoFromSchedaResult } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  buildConsolidatedIngressoLavorazionePatch,
  ingressoTagliandoFieldsChanged,
} from "@/lib/schede/ingresso-lavorazione-patch";
import {
  logIngressoSavePipeline,
  logIngressoSaveStageEnd,
  logIngressoSaveStageStart,
  nextIngressoSaveRequestId,
  resolveIngressoSaveCorrelationId,
} from "@/lib/schede/scheda-ingresso-save-pipeline-log";
import { dedupeIngressoDataIngressoWrite } from "@/lib/schede/ingresso-data-ingresso-write-dedup";
import { assertIngressoSaveGenerationCurrent } from "@/lib/schede/ingresso-save-generation";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import type { QueryClient } from "@tanstack/react-query";
import { lavorazioniDomainQueryKeys } from "@/src/services/domain/lavorazioni-domain.queries";
import {
  invalidateAfterLavorazioneMutations,
  invalidateAfterMezzoMutations,
} from "@/src/lib/react-query/invalidate-related";

export type IngressoBackendSyncDeps = {
  upsertMezzo: (input: {
    fields: SchedaIngressoFields;
    preferredMezzoId?: string | null;
    updatePlan?: MezzoUpdateFromSchedaPlan;
    lavorazioneId?: string | null;
  }) => Promise<UpsertMezzoFromSchedaResult>;
  updateLavorazione: (
    id: string,
    patch: Record<string, unknown>,
  ) => Promise<void>;
  onTagliandoPresetAssigned?: (lavorazioneId: string) => void;
  onTagliandoPresetWarning?: (message: string) => void;
};

export type SyncIngressoBackendInput = {
  row: LavorazioneListRow;
  campi: SchedaIngressoFields;
  mezziCatalogFrozen: readonly MezzoGestito[];
  mezzoUpdatePlan?: MezzoUpdateFromSchedaPlan;
  lavorazioneNote?: string;
  tagliandoFields?: TagliandoLavorazioneFields;
  runId?: number;
  correlationId?: string;
  explicitMezzoChange?: boolean;
  lavorazioneGestione?: {
    stato?: StatoLavorazione;
    priorita?: PrioritaLavorazione;
  };
};

export type SyncIngressoBackendResult = {
  attrezzaturaId: string | null;
};

/**
 * Sync backend scheda ingresso edit — catalogo congelato, zero refetch/invalidate qui.
 * Unico punto autorizzato per updateLavorazione in edit ingresso.
 */
export async function syncIngressoBackendFromFrozenCatalog(
  input: SyncIngressoBackendInput,
  deps: IngressoBackendSyncDeps,
): Promise<SyncIngressoBackendResult> {
  const {
    row,
    campi,
    mezziCatalogFrozen,
    mezzoUpdatePlan,
    lavorazioneNote,
    tagliandoFields,
    runId,
    correlationId,
    explicitMezzoChange,
    lavorazioneGestione,
  } = input;

  const corr = resolveIngressoSaveCorrelationId(runId, correlationId);
  const stageCtx = { runId, correlationId: corr, lavorazioneId: row.id };
  logIngressoSaveStageStart("backend_sync", stageCtx);

  if (!assertIngressoSaveGenerationCurrent(runId, "backend_sync_start")) {
    logIngressoSaveStageEnd("backend_sync", { ...stageCtx, stale: true });
    return {
      attrezzaturaId: campi.attrezzaturaId?.trim() || row.attrezzatura_id?.trim() || null,
    };
  }

  const consolidatedPatch = buildConsolidatedIngressoLavorazionePatch({
    row,
    lavorazioneNote,
    tagliandoFields,
    lavorazioneGestione,
  });

  const skipMezzoUpsert = isMezzoUpdateSchedaOnly(mezzoUpdatePlan);
  let sagaPatch: Record<string, unknown> = {};
  let upsertAttrezzaturaId: string | null =
    campi.attrezzaturaId?.trim() || row.attrezzatura_id?.trim() || null;

  if (skipMezzoUpsert) {
    sagaPatch = buildDataIngressoPatchFromFields(row, campi);
    logIngressoSavePipeline("backend_sync_fast_path", {
      ...stageCtx,
      skipMezzoUpsert: true,
      requestId: nextIngressoSaveRequestId(),
    });
  } else {
    const { result } = await executeInterventoWriteEntry(
      {
        mode: "edit",
        idempotencyKey: `edit-${row.id}`,
        fields: campi,
        mezziCatalog: mezziCatalogFrozen,
        meta: {
          row,
          writeContext: { source: "manual", mezzoUpdatePlan },
        },
      },
      {
        upsertMezzo: deps.upsertMezzo,
      },
    );

    if (!result.ok) {
      if (result.error === "MEZZO_STALE_CONFLICT") {
        logMezzoSchedaConflictTelemetry({
          event: "MEZZO_STALE_CONFLICT",
          mezzoId: row.mezzo_id,
          lavorazioneId: row.id,
        });
      }
      logInterventoTelemetry("intervento_sync_drift_detected", {
        lavorazioneId: row.id,
        stage: result.stage,
        mismatch: true,
      });
      throw new Error(result.error);
    }

    sagaPatch = result.lavorazionePatch ?? {};
    upsertAttrezzaturaId = result.attrezzaturaId?.trim() || upsertAttrezzaturaId;
  }

  const mergedPatch = applyMezzoIdImmutabilityGuard(
    row,
    mergeLavorazionePatches(sagaPatch, consolidatedPatch),
    explicitMezzoChange,
  );
  const patchKeys = Object.keys(mergedPatch);

  if (patchKeys.length > 0) {
    if (!assertIngressoSaveGenerationCurrent(runId, "update_lavorazione")) {
      logIngressoSaveStageEnd("backend_sync", { ...stageCtx, stale: true });
      return {
        attrezzaturaId: upsertAttrezzaturaId,
      };
    }
    const requestId = nextIngressoSaveRequestId();
    logIngressoSavePipeline("save_db", {
      ...stageCtx,
      requestId,
      patchKeys,
      updateCount: 1,
    });
    await dedupeIngressoDataIngressoWrite(row.id, mergedPatch, () =>
      deps.updateLavorazione(row.id, mergedPatch),
    );
    logIngressoSavePipeline("save_response", { ...stageCtx, requestId, patchKeys });
  }

  if (ingressoTagliandoFieldsChanged(row, tagliandoFields) && tagliandoFields) {
    const assignRes = await assignTagliandoPresetToMezzoOnSave({
      mezzoId: row.mezzo_id,
      tagliandoFields,
    });
    if (!assignRes.ok) {
      deps.onTagliandoPresetWarning?.(assignRes.error);
    } else if (assignRes.assigned) {
      deps.onTagliandoPresetAssigned?.(row.id);
    }
  }

  logIngressoSaveStageEnd("backend_sync", { ...stageCtx, patchKeys });

  const patchAttId =
    typeof mergedPatch.attrezzatura_id === "string" ? mergedPatch.attrezzatura_id.trim() : "";
  return {
    attrezzaturaId:
      patchAttId ||
      upsertAttrezzaturaId ||
      campi.attrezzaturaId?.trim() ||
      row.attrezzatura_id?.trim() ||
      null,
  };
}

/** Invalidazione batch unica — MIC non bloccante; refetch lista in background. */
export async function invalidateAfterIngressoEditSave(
  qc: QueryClient,
  lavorazioneId: string,
  mezzoId?: string | null,
): Promise<void> {
  const id = lavorazioneId.trim();
  if (!id) return;

  if (mezzoId?.trim()) {
    await invalidateAfterMezzoMutations(qc, mezzoId.trim(), undefined, { refetchType: "none" });
  }
  await invalidateAfterLavorazioneMutations(qc, undefined, id, undefined, { refetchType: "none" });
  await qc.invalidateQueries({ queryKey: lavorazioniDomainQueryKeys.base(id), refetchType: "none" });

  void qc.invalidateQueries({ queryKey: lavorazioniDomainQueryKeys.base(id), refetchType: "active" });
}
