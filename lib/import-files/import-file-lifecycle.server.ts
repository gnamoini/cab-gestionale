import "server-only";

import { assertImportFileOwner, assertImportFileProcessAccess } from "@/lib/import-files/import-file-access.server";
import type { ImportFileFailedReasonCode } from "@/lib/import-files/import-file-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function beginImportFileProcessing(fileId: string, userId: string): Promise<void> {
  await assertImportFileProcessAccess(fileId, userId);
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("import_file_begin_processing", { p_file_id: fileId });
  if (error) {
    if (error.message.includes("processing_in_progress")) {
      const err = new Error("Elaborazione già in corso");
      (err as Error & { code?: string }).code = "PROCESSING_IN_PROGRESS";
      throw err;
    }
    if (error.message.includes("invalid_status_transition")) {
      const err = new Error(error.message);
      (err as Error & { code?: string }).code = "invalid_status_transition";
      throw err;
    }
    throw new Error(error.message);
  }
}

export async function completeImportFileProcessing(
  fileId: string,
  userId: string,
  input: {
    outcome: "processed" | "failed";
    failedReasonCode?: ImportFileFailedReasonCode;
    lastError?: Record<string, unknown>;
  },
): Promise<void> {
  await assertImportFileProcessAccess(fileId, userId);
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("import_file_complete_processing", {
    p_file_id: fileId,
    p_outcome: input.outcome,
    p_failed_reason_code: input.failedReasonCode ?? null,
    p_last_error: input.lastError ?? null,
  });
  if (error) {
    if (error.message.includes("invalid_status_transition")) {
      const err = new Error(error.message);
      (err as Error & { code?: string }).code = "invalid_status_transition";
      throw err;
    }
    throw new Error(error.message);
  }
}

export async function cancelImportFile(fileId: string, userId: string): Promise<void> {
  await assertImportFileOwner(fileId, userId);
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("import_file_cancel", { p_file_id: fileId });
  if (error) {
    if (error.message.includes("Permesso negato")) {
      const err = new Error(error.message);
      (err as Error & { code?: string }).code = "FORBIDDEN";
      throw err;
    }
    throw new Error(error.message);
  }
}
