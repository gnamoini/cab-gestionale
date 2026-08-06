import { executeInterventoWriteEntry } from "@/lib/domain/intervento-entry";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
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
import { logIngressoSavePipeline } from "@/lib/schede/scheda-ingresso-save-pipeline-log";
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
  lavorazioneGestione?: {
    stato?: StatoLavorazione;
    priorita?: PrioritaLavorazione;
  };
};

/**
 * Sync backend scheda ingresso edit — catalogo congelato, zero refetch/invalidate qui.
 * L'invalidazione batch va eseguita dal chiamante dopo tutti i commit.
 */
export async function syncIngressoBackendFromFrozenCatalog(
  input: SyncIngressoBackendInput,
  deps: IngressoBackendSyncDeps,
): Promise<void> {
  const {
    row,
    campi,
    mezziCatalogFrozen,
    mezzoUpdatePlan,
    lavorazioneNote,
    tagliandoFields,
    runId,
    lavorazioneGestione,
  } = input;

  logIngressoSavePipeline("backend_sync_start", { runId, lavorazioneId: row.id });

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
      updateLavorazione: deps.updateLavorazione,
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

  const lavPatch = buildConsolidatedIngressoLavorazionePatch({
    row,
    lavorazioneNote,
    tagliandoFields,
    lavorazioneGestione,
  });
  const patchKeys = Object.keys(lavPatch);

  if (patchKeys.length > 0) {
    logIngressoSavePipeline("SAVE_REQUEST", {
      runId,
      lavorazioneId: row.id,
      patchKeys,
      updateCount: 1,
    });
    await deps.updateLavorazione(row.id, lavPatch);
    logIngressoSavePipeline("SAVE_RESPONSE", { runId, lavorazioneId: row.id, patchKeys });
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

  logIngressoSavePipeline("backend_sync_end", { runId, lavorazioneId: row.id, patchKeys });
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
