import "server-only";

import {
  EPHEMERAL_CAPTURE_DELETION_REASON,
  isEphemeralCaptureSource,
} from "@/lib/document-capture/ephemeral-capture";
import { patchDocumentCaptureInTransaction } from "@/lib/document-capture/patch-capture-transaction.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function discardEphemeralDocumentCapture(
  captureId: string,
  reason: string = EPHEMERAL_CAPTURE_DELETION_REASON,
): Promise<{ ok: true; discarded: boolean }> {
  const sb = await createSupabaseServerUserClient();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    throw new Error("Sessione assente");
  }

  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, source, status, uploaded_by, deleted_at")
    .eq("id", captureId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!capture || capture.deleted_at) {
    return { ok: true, discarded: false };
  }
  if (capture.uploaded_by !== userId) {
    throw new Error("Permesso negato");
  }
  if (!isEphemeralCaptureSource(capture.source)) {
    throw new Error("Solo acquisizioni temporanee possono essere eliminate");
  }
  if (capture.status === "applied") {
    return { ok: true, discarded: false };
  }

  await patchDocumentCaptureInTransaction({
    captureId,
    softDelete: true,
    deletionReason: reason,
  });

  return { ok: true, discarded: true };
}

export async function purgeUserEphemeralCaptures(input: {
  userId: string;
  exceptCaptureId?: string | null;
}): Promise<number> {
  const sb = await createSupabaseServerUserClient();
  let query = sb
    .from("document_capture")
    .select("id")
    .eq("uploaded_by", input.userId)
    .eq("source", "lavorazioni_drop")
    .neq("status", "applied")
    .is("deleted_at", null);

  if (input.exceptCaptureId) {
    query = query.neq("id", input.exceptCaptureId);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let count = 0;
  for (const row of rows ?? []) {
    try {
      const result = await discardEphemeralDocumentCapture(row.id, "ephemeral_replace");
      if (result.discarded) count += 1;
    } catch {
      // ponytail: best-effort purge — one failure must not block a new upload
    }
  }
  return count;
}

export async function releaseEphemeralSha256Slot(input: {
  userId: string;
  sha256: string;
  keepCaptureId: string;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { data: rows, error } = await sb
    .from("document_capture")
    .select("id")
    .eq("uploaded_by", input.userId)
    .eq("source", "lavorazioni_drop")
    .eq("sha256", input.sha256)
    .neq("status", "applied")
    .is("deleted_at", null)
    .neq("id", input.keepCaptureId);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of rows ?? []) {
    try {
      await discardEphemeralDocumentCapture(row.id, "ephemeral_sha256_release");
    } catch {
      // ponytail: best-effort — finalize may still succeed after RPC duplicate fix
    }
  }
}
