import "server-only";

import { isUnoerpSyncHardStop } from "@/lib/env/unoerp.server";
import { createUnoerpAdminClient } from "@/lib/integrations/unoerp/admin-client.server";
import { planSync } from "@/lib/integrations/unoerp/services/synchronization.service";
import type { CabDocumentType, UnoerpJobOperation } from "@/lib/integrations/unoerp/types";

const BATCH = 20;

type JobRow = {
  id: string;
  cab_document_type: CabDocumentType;
  cab_document_id: string;
  source_version: number;
  payload_hash: string;
  operation: UnoerpJobOperation;
  sync_run_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  next_attempt_at?: string | null;
};

export async function runUnoerpSyncWorker(): Promise<{ processed: number; blocked: number; stale: number }> {
  const client = createUnoerpAdminClient();
  const { data: jobs } = await client
    .from("unoerp_sync_jobs")
    .select(
      "id, cab_document_type, cab_document_id, source_version, payload_hash, operation, sync_run_id, status, attempts, max_attempts, next_attempt_at",
    )
    .in("status", ["PENDING", "RETRYABLE_ERROR"])
    .order("created_at", { ascending: true })
    .limit(BATCH);

  let processed = 0;
  let blocked = 0;
  let stale = 0;
  for (const raw of jobs ?? []) {
    const job = raw as JobRow;
    if (job.next_attempt_at && new Date(job.next_attempt_at).getTime() > Date.now()) continue;
    if (isUnoerpSyncHardStop()) {
      await client
        .from("unoerp_sync_jobs")
        .update({ status: "BLOCKED", last_error: "UNOERP_HARD_STOP", last_error_code: "UNOERP_HARD_STOP" })
        .eq("id", job.id);
      blocked += 1;
      continue;
    }

    const { data: link } = await client
      .from("unoerp_document_links")
      .select("cab_document_id, cab_document_type, unoerp_module, unoerp_file, unoerp_record_id, last_synced_source_version")
      .eq("cab_document_id", job.cab_document_id)
      .eq("cab_document_type", job.cab_document_type)
      .maybeSingle();

    const linkRow = link as
      | {
          cab_document_id: string;
          cab_document_type: CabDocumentType;
          unoerp_module: string;
          unoerp_file: string;
          unoerp_record_id: string;
          last_synced_source_version: number | null;
        }
      | null;

    const outcome = planSync({
      operation: job.operation,
      documentType: job.cab_document_type,
      cabDocumentId: job.cab_document_id,
      sourceVersion: Number(job.source_version),
      lastSyncedSourceVersion: linkRow?.last_synced_source_version ?? null,
      link: linkRow
        ? {
            cabDocumentId: linkRow.cab_document_id,
            cabDocumentType: linkRow.cab_document_type,
            unoerpModule: linkRow.unoerp_module,
            unoerpFile: linkRow.unoerp_file,
            unoerpRecordId: linkRow.unoerp_record_id,
          }
        : null,
      customerResolved: false,
      itemsResolved: false,
      vatResolved: false,
      correlationFieldKnown: false,
    });

    processed += 1;
    if (outcome.status === "STALE_JOB") {
      stale += 1;
      await client.from("unoerp_sync_jobs").update({ status: "STALE_JOB" }).eq("id", job.id);
      continue;
    }
    if (outcome.status === "BLOCKED" || outcome.status === "NO_WRITE") {
      blocked += 1;
      const reasons = outcome.status === "BLOCKED" ? outcome.reasons.join(",") : outcome.reason;
      await client
        .from("unoerp_sync_jobs")
        .update({
          status: "BLOCKED",
          attempts: job.attempts + 1,
          last_error: reasons,
          last_error_code: "UNOERP_PREFLIGHT_BLOCKED",
          next_attempt_at: null,
        })
        .eq("id", job.id);
      await client.from("unoerp_sync_audit").insert({
        cab_entity_id: job.cab_document_id,
        cab_entity_type: job.cab_document_type,
        operation: job.operation,
        result: "blocked",
        error_code: "UNOERP_PREFLIGHT_BLOCKED",
        payload_hash: job.payload_hash,
        sync_run_id: job.sync_run_id,
        created_by_cab: true,
      });
    }
  }
  return { processed, blocked, stale };
}
