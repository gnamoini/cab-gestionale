import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const APPLY_JOB_STATUSES = [
  "CREATED",
  "VALIDATING",
  "APPLYING",
  "LAVORAZIONE_CREATED",
  "SCHEDE_CREATED",
  "RICAMBI_CREATED",
  "COMMITTED",
  "FAILED",
  "RECOVERY_REQUIRED",
] as const;

export type ApplyJobStatus = (typeof APPLY_JOB_STATUSES)[number];

export type ApplyJobRow = {
  id: string;
  capture_id: string;
  company_id: string;
  application_id: string | null;
  status: ApplyJobStatus;
  step_current: string | null;
  created_lavorazione_id: string | null;
  created_scheda_ids: unknown;
  error_code: string | null;
  error_message: string | null;
};

export async function createCaptureApplyJob(input: {
  captureId: string;
  companyId: string;
  applicationId?: string | null;
  userId: string;
  status?: ApplyJobStatus;
  stepCurrent?: string;
}): Promise<ApplyJobRow> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_capture_apply_jobs")
    .insert({
      capture_id: input.captureId,
      company_id: input.companyId,
      application_id: input.applicationId ?? null,
      status: input.status ?? "CREATED",
      step_current: input.stepCurrent ?? "CREATED",
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Impossibile creare apply job");
  return data as ApplyJobRow;
}

export async function updateCaptureApplyJob(
  jobId: string,
  patch: Partial<{
    status: ApplyJobStatus;
    stepCurrent: string;
    createdLavorazioneId: string | null;
    createdSchedaIds: string[];
    errorCode: string | null;
    errorMessage: string | null;
    applicationId: string;
    completedAt: string | null;
  }>,
): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) row.status = patch.status;
  if (patch.stepCurrent) row.step_current = patch.stepCurrent;
  if (patch.createdLavorazioneId !== undefined) row.created_lavorazione_id = patch.createdLavorazioneId;
  if (patch.createdSchedaIds) row.created_scheda_ids = patch.createdSchedaIds;
  if (patch.errorCode !== undefined) row.error_code = patch.errorCode;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  if (patch.applicationId) row.application_id = patch.applicationId;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;

  const { error } = await sb.from("document_capture_apply_jobs").update(row).eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function findLatestApplyJobForCapture(captureId: string): Promise<ApplyJobRow | null> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture_apply_jobs")
    .select("*")
    .eq("capture_id", captureId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ApplyJobRow | null) ?? null;
}

export async function findRecoveryApplyJob(captureId: string): Promise<ApplyJobRow | null> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_capture_apply_jobs")
    .select("*")
    .eq("capture_id", captureId)
    .eq("status", "RECOVERY_REQUIRED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ApplyJobRow | null) ?? null;
}
