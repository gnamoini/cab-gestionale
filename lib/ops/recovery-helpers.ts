"use client";

import type { QueryClient } from "@tanstack/react-query";
import { classifyDocumentoUrlRow } from "@/lib/ops/documenti-url-inventory";
import { removeDocumentoStoragePathsBestEffort } from "@/lib/documenti/delete-documento-fully";
import { gestionaleLogger } from "@/lib/observability/logger";
import {
  refetchActiveOperationalSnapshot,
  type RefetchOperationalSnapshotOptions,
} from "@/lib/sync/gestionale-snapshot-recovery";
import type { DocumentoRow } from "@/src/types/supabase-tables";

export type DocumentoDiagnostic = {
  id?: string;
  hasResolvablePath: boolean;
  isLegacyHttpUrl: boolean;
  storagePath: string | null;
};

/** Refetch snapshot operativo con log ops. */
export function recoverOperationalSnapshot(
  qc: QueryClient,
  opts?: RefetchOperationalSnapshotOptions,
): void {
  gestionaleLogger.info("ops.recovery.snapshot", { operation: "cache" });
  refetchActiveOperationalSnapshot(qc, opts);
}

/** Retry best-effort rimozione path storage. */
export async function retryStorageRemove(paths: string[]): Promise<{ attempted: number }> {
  const normalized = paths.map((p) => p.trim()).filter(Boolean);
  if (normalized.length === 0) return { attempted: 0 };
  await removeDocumentoStoragePathsBestEffort(normalized);
  gestionaleLogger.info("ops.recovery.storage_remove", {
    operation: "documenti",
    meta: { count: normalized.length },
  });
  return { attempted: normalized.length };
}

/** Diagnostica riga documento (path vs legacy URL). */
export function diagnoseDocumentoRow(row: Pick<DocumentoRow, "id" | "url_file">): DocumentoDiagnostic {
  const c = classifyDocumentoUrlRow({ id: row.id, url_file: row.url_file ?? "" });
  return {
    id: c.id,
    hasResolvablePath: c.hasResolvablePath,
    isLegacyHttpUrl: c.isLegacyHttpUrl,
    storagePath: c.storagePath,
  };
}
