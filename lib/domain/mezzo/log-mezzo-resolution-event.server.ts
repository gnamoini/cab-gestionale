import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MezzoResolutionResult } from "@/lib/domain/mezzo/mezzo-resolution";

export type MezzoResolutionEventSource =
  | "import"
  | "capture"
  | "scheda_ingresso"
  | "preventivo"
  | "reconciliation";

export type LogMezzoResolutionEventInput = {
  source: MezzoResolutionEventSource;
  identUsed?: Record<string, string | undefined>;
  candidateCount: number;
  resolvedMezzoId?: string | null;
  status: MezzoResolutionResult["status"] | "error";
  context?: Record<string, unknown>;
  createdBy?: string | null;
};

export async function logMezzoResolutionEvent(
  sb: SupabaseClient,
  input: LogMezzoResolutionEventInput,
): Promise<void> {
  const { error } = await sb.from("mezzo_resolution_events").insert({
    source: input.source,
    ident_used: input.identUsed ?? null,
    candidate_count: input.candidateCount,
    resolved_mezzo_id: input.resolvedMezzoId ?? null,
    status: input.status,
    context: input.context ?? null,
    created_by: input.createdBy ?? null,
  });
  if (error) {
    console.warn("[mezzo_resolution_events] insert failed:", error.message);
  }
}

export function resolutionEventFromResult(
  source: MezzoResolutionEventSource,
  result: MezzoResolutionResult,
  identUsed?: Record<string, string | undefined>,
  context?: Record<string, unknown>,
): LogMezzoResolutionEventInput {
  const candidateCount =
    result.status === "ambiguous" ? result.candidates.length : result.status === "resolved" ? 1 : 0;
  return {
    source,
    identUsed,
    candidateCount,
    resolvedMezzoId: result.status === "resolved" ? result.mezzoId : null,
    status: result.status,
    context,
  };
}
