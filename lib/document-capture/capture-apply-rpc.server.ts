import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export class CaptureApplyInProgressError extends Error {
  readonly code = "APPLY_IN_PROGRESS" as const;

  constructor() {
    super("Apply già in corso su questo documento.");
    this.name = "CaptureApplyInProgressError";
  }
}

export async function beginCaptureApplyRpc(input: {
  captureId: string;
  applicationId: string;
  resume?: boolean;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("document_capture_begin_apply", {
    p_capture_id: input.captureId,
    p_application_id: input.applicationId,
    p_resume: input.resume ?? false,
  });
  if (error) {
    if (error.message.includes("apply_in_progress")) {
      throw new CaptureApplyInProgressError();
    }
    throw new Error(error.message);
  }
}

export async function completeCaptureApplyRpc(input: {
  captureId: string;
  applicationId: string;
  success: boolean;
  eventType: "apply_committed" | "apply_failed" | "apply_partial";
  lavorazioneId?: string | null;
  mezzoId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("document_capture_complete_apply", {
    p_capture_id: input.captureId,
    p_application_id: input.applicationId,
    p_success: input.success,
    p_event_type: input.eventType,
    p_lavorazione_id: input.lavorazioneId ?? null,
    p_mezzo_id: input.mezzoId ?? null,
    p_payload: input.payload ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function abortCaptureApplyRpc(input: {
  captureId: string;
  applicationId: string;
  reason?: string;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.rpc("document_capture_abort_apply", {
    p_capture_id: input.captureId,
    p_application_id: input.applicationId,
    p_reason: input.reason ?? null,
  });
  if (error) throw new Error(error.message);
}
