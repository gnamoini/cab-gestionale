import "server-only";

import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import type { PipelineExecution, PipelinePhase } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

type PipelineEventPayload = {
  phase: PipelinePhase;
  status: PipelineExecution["status"];
  resultRef?: string;
};

export async function findPipelineExecution(idempotencyKey: string): Promise<PipelineExecution | null> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture_events")
    .select("id, document_capture_id, payload, created_at")
    .eq("idempotency_key", idempotencyKey)
    .eq("event_type", "pipeline_phase_completed")
    .maybeSingle();

  if (!data?.payload) return null;
  const payload = data.payload as PipelineEventPayload;
  return {
    id: data.id,
    captureId: data.document_capture_id,
    phase: payload.phase,
    idempotencyKey,
    status: payload.status,
    completedAt: data.created_at,
    resultRef: payload.resultRef,
  };
}

export async function savePipelineExecution(execution: PipelineExecution): Promise<void> {
  await mutateCaptureWithEvent({
    captureId: execution.captureId,
    eventType: "pipeline_phase_completed",
    idempotencyKey: execution.idempotencyKey,
    payload: {
      phase: execution.phase,
      status: execution.status,
      resultRef: execution.resultRef,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
    },
  });
}
