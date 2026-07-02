import "server-only";

import type { DocumentCaptureErrorCode } from "@/lib/document-capture/document-capture-error-codes";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type DocumentCaptureRateLimitOperation = "upload_policy" | "analyze" | "apply" | "dry_run";

const LIMITS: Record<DocumentCaptureRateLimitOperation, { max: number; windowSeconds: number }> = {
  upload_policy: { max: 30, windowSeconds: 600 },
  analyze: { max: 10, windowSeconds: 600 },
  apply: { max: 10, windowSeconds: 600 },
  dry_run: { max: 20, windowSeconds: 600 },
};

export type DocumentCaptureRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; errorCode: DocumentCaptureErrorCode };

export async function checkDocumentCaptureRateLimit(
  userId: string,
  operation: DocumentCaptureRateLimitOperation,
): Promise<DocumentCaptureRateLimitResult> {
  const cfg = LIMITS[operation];
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.rpc("document_capture_rate_limit_check", {
    p_operation: operation,
    p_max: cfg.max,
    p_window_seconds: cfg.windowSeconds,
  });

  if (error) {
    return { ok: true };
  }

  const row = (data ?? {}) as { allowed?: boolean; retryAfterSec?: number };
  if (row.allowed === false) {
    return {
      ok: false,
      retryAfterSec: typeof row.retryAfterSec === "number" ? row.retryAfterSec : cfg.windowSeconds,
      errorCode: "RATE_LIMITED",
    };
  }

  return { ok: true };
}
