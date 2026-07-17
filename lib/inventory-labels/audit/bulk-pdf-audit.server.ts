import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { writeInventoryLabelEvent } from "@/lib/inventory-labels/audit/events.server";

export type BulkPdfPipelineMode = "primary" | "fallback" | "emergency";

export async function auditBulkPdfStarted(
  sb: SupabaseClient,
  input: { userId: string | null; count: number; mode: "sync" | "async"; jobId?: string },
): Promise<void> {
  await writeInventoryLabelEvent(sb, {
    eventType: "LABEL_PDF_BULK_STARTED",
    entityType: "bulk",
    entityId: input.jobId ?? "sync",
    userId: input.userId,
    payload: { count: input.count, mode: input.mode },
  });
}

export async function auditBulkPdfCompleted(
  sb: SupabaseClient,
  input: {
    userId: string | null;
    count: number;
    mode: "sync" | "async";
    durationMs: number;
    pdfBytes: number;
    pipeline: BulkPdfPipelineMode;
    jobId?: string;
  },
): Promise<void> {
  await writeInventoryLabelEvent(sb, {
    eventType: "LABEL_PDF_BULK_COMPLETED",
    entityType: "bulk",
    entityId: input.jobId ?? "sync",
    userId: input.userId,
    payload: {
      count: input.count,
      mode: input.mode,
      durationMs: input.durationMs,
      pdfBytes: input.pdfBytes,
      pipeline: input.pipeline,
    },
  });
}

export async function auditBulkPdfFailed(
  sb: SupabaseClient,
  input: {
    userId: string | null;
    count: number;
    mode: "sync" | "async";
    durationMs: number;
    errorCode: string;
    message: string;
    jobId?: string;
  },
): Promise<void> {
  await writeInventoryLabelEvent(sb, {
    eventType: "LABEL_PDF_BULK_FAILED",
    entityType: "bulk",
    entityId: input.jobId ?? "sync",
    userId: input.userId,
    payload: {
      count: input.count,
      mode: input.mode,
      durationMs: input.durationMs,
      errorCode: input.errorCode,
      message: input.message,
    },
  });
}
