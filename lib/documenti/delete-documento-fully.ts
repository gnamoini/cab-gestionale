"use client";

import { documentoStoragePathFromStored } from "@/lib/documenti/documenti-db-mapper";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import { buildDocumentThumbnailObjectPath } from "@/lib/documents/document-thumbnail-paths";
import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { STORAGE_BUCKETS, storageRemove } from "@/src/services/storage.service";
import { DOCUMENTI_COLUMNS } from "@/lib/db/table-select-columns";
import type { DocumentoRow } from "@/src/types/supabase-tables";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";
import { gestionaleLogger } from "@/lib/observability/logger";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import { isDocumentBlobStoragePath } from "@/src/lib/storage/storage-paths";

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

async function removeDocumentThumbnailBestEffort(contentHash: string): Promise<void> {
  const objectPath = buildDocumentThumbnailObjectPath(contentHash);
  try {
    await storageRemove(STORAGE_BUCKETS.documentiThumbnails, [objectPath]);
  } catch (e) {
    gestionaleLogger.warn("documenti.thumbnail.remove_failed", {
      operation: "documenti",
      meta: { message: e instanceof Error ? e.message : String(e) },
    });
  }
}

async function countDocumentiWithUrlFile(client: SupabaseClient, urlFile: string): Promise<number> {
  const { count, error } = await client
    .from("documenti")
    .select("id", { count: "exact", head: true })
    .eq("url_file", urlFile);
  if (error) return 1;
  return count ?? 0;
}

async function countDocumentiWithContentHash(client: SupabaseClient, contentHash: string): Promise<number> {
  const { count, error } = await client
    .from("documenti")
    .select("id", { count: "exact", head: true })
    .filter("meta->>contentHash", "eq", contentHash);
  if (error) return 1;
  return count ?? 0;
}

/** Elimina un path storage documento (sostituzione file / cleanup orphan). */
export async function deleteDocumentoStoragePath(path: string | null | undefined): Promise<void> {
  const normalized = path?.trim();
  if (!normalized) return;
  await removeDocumentoStoragePathsBestEffort([normalized]);
}

/**
 * Elimina documento da DB e bucket `documenti` (ordine: storage best-effort, poi DB + audit).
 * Blob paths (`blobs/`) e thumbnail rimossi solo con refcount === 1.
 */
export async function deleteDocumentoFully(
  client: SupabaseClient,
  id: string,
  existing?: DocumentoRow | null,
): Promise<ServiceResult<null>> {
  try {
    let row = existing ?? null;
    if (!row) {
      const { data, error: fetchErr } = await client.from("documenti").select(DOCUMENTI_COLUMNS).eq("id", id).maybeSingle();
      if (fetchErr) return err(fetchErr.message);
      row = (data as DocumentoRow | null) ?? null;
    }

    const intelligence = readDocumentIntelligenceMeta(row?.meta as Record<string, unknown> | undefined);
    const storedUrl = row?.url_file?.trim() ?? "";

    if (storedUrl) {
      const path = documentoStoragePathFromStored(storedUrl);
      if (path) {
        const blobPath = isDocumentBlobStoragePath(path);
        if (blobPath) {
          const refs = await countDocumentiWithUrlFile(client, storedUrl);
          if (refs <= 1) await deleteDocumentoStoragePath(path);
        } else {
          await deleteDocumentoStoragePath(path);
        }
      }
    }

    if (intelligence.contentHash) {
      const thumbRefs = await countDocumentiWithContentHash(client, intelligence.contentHash);
      if (thumbRefs <= 1) {
        await removeDocumentThumbnailBestEffort(intelligence.contentHash);
      }
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
