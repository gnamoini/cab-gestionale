import "server-only";

import { randomUUID } from "node:crypto";
import type { CabDocumentType, UnoerpJobOperation } from "@/lib/integrations/unoerp/types";
import { createUnoerpAdminClient } from "@/lib/integrations/unoerp/admin-client.server";

export async function enqueueUnoerpSyncJob(input: {
  cabDocumentType: CabDocumentType;
  cabDocumentId: string;
  sourceVersion: number;
  payloadHash: string;
  operation: UnoerpJobOperation;
  payloadSnapshot: Record<string, unknown>;
  actorId?: string | null;
}): Promise<{ ok: true; jobId: string; syncRunId: string } | { ok: false; error: string }> {
  const client = createUnoerpAdminClient();
  const syncRunId = randomUUID();
  const { data, error } = await client
    .from("unoerp_sync_jobs")
    .insert({
      cab_document_type: input.cabDocumentType,
      cab_document_id: input.cabDocumentId,
      source_version: input.sourceVersion,
      payload_hash: input.payloadHash,
      operation: input.operation,
      sync_run_id: syncRunId,
      payload_snapshot: input.payloadSnapshot,
      status: "PENDING",
      attempts: 0,
      max_attempts: 8,
      actor_id: input.actorId ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return { ok: true, jobId: "duplicate", syncRunId };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, jobId: (data as { id: string } | null)?.id ?? "", syncRunId };
}

export async function markLocalUnoerpEvent(input: {
  cabDocumentType: CabDocumentType;
  cabDocumentId: string;
  status: "CAB_DDT_CANCELLED_AFTER_SYNC" | "CAB_DOCUMENT_REMOVED";
}): Promise<void> {
  const client = createUnoerpAdminClient();
  await client
    .from("unoerp_document_links")
    .update({ sync_status: input.status, updated_at: new Date().toISOString() })
    .eq("cab_document_type", input.cabDocumentType)
    .eq("cab_document_id", input.cabDocumentId);
}
