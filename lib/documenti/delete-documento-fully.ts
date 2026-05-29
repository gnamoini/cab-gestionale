"use client";

import { documentoStoragePathFromStored } from "@/lib/documenti/documenti-db-mapper";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { STORAGE_BUCKETS, storageRemove } from "@/src/services/storage.service";
import type { DocumentoRow } from "@/src/types/supabase-tables";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { gestionaleLogger } from "@/lib/observability/logger";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "documenti";

/** Rimuove oggetti storage best-effort (non blocca delete DB). */
export async function removeDocumentoStoragePathsBestEffort(paths: string[]): Promise<void> {
  const normalized = paths.map((p) => p.trim()).filter(Boolean);
  if (normalized.length === 0) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await storageRemove(STORAGE_BUCKETS.documenti, normalized);
      return;
    } catch (e) {
      if (attempt === 0) continue;
      gestionaleLogger.warn("documenti.storage.remove_failed", {
        operation: "documenti",
        meta: { count: normalized.length, message: e instanceof Error ? e.message : String(e) },
      });
    }
  }
}

/** Elimina un path storage documento (sostituzione file / cleanup orphan). */
export async function deleteDocumentoStoragePath(path: string | null | undefined): Promise<void> {
  const normalized = path?.trim();
  if (!normalized) return;
  await removeDocumentoStoragePathsBestEffort([normalized]);
}

/**
 * Elimina documento da DB e bucket `documenti` (ordine: storage best-effort, poi DB + audit).
 */
export async function deleteDocumentoFully(
  client: SupabaseClient,
  id: string,
  existing?: DocumentoRow | null,
): Promise<ServiceResult<null>> {
  try {
    let row = existing ?? null;
    if (!row) {
      const { data, error: fetchErr } = await client.from("documenti").select("*").eq("id", id).maybeSingle();
      if (fetchErr) return err(fetchErr.message);
      row = (data as DocumentoRow | null) ?? null;
    }

    if (row?.url_file) {
      const path = documentoStoragePathFromStored(row.url_file);
      if (path) await deleteDocumentoStoragePath(path);
    }

    if (row) {
      await writeModificaLog(client, {
        entita: ENTITA,
        entita_id: id,
        azione: "DELETE",
        payload: auditSnapshot(row),
      });
    }

    const { error } = await client.from("documenti").delete().eq("id", id);
    if (error) {
      trackRuntimeEvent(RuntimeEvents.documentiDeleteFailed, { entityId: id, reason: error.message.slice(0, 200) });
      trackRuntimeEvent(RuntimeEvents.storageDeleteFailure, { entityId: id, reason: error.message.slice(0, 200) });
      return err(error.message);
    }
    trackRuntimeEvent(RuntimeEvents.documentiDeleteSuccess, { entityId: id });
    return success(null);
  } catch (e) {
    trackRuntimeEvent(RuntimeEvents.documentiDeleteFailed, {
      entityId: id,
      reason: e instanceof Error ? e.message.slice(0, 200) : "unknown",
    });
    trackRuntimeEvent(RuntimeEvents.storageDeleteFailure, {
      entityId: id,
      reason: e instanceof Error ? e.message.slice(0, 200) : "unknown",
    });
    return serviceFailFromError(e);
  }
}
