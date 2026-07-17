import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LABEL_JOB_STUCK_STATUSES,
  resolveLabelJobStuckThresholdMs,
} from "@/lib/inventory-labels/jobs/label-job-recovery";

export { resolveLabelJobStuckThresholdMs, isLabelJobStuck } from "@/lib/inventory-labels/jobs/label-job-recovery";

export async function touchLabelJobHeartbeat(
  sb: SupabaseClient,
  jobId: string,
  patch?: { progress?: number; status?: string },
): Promise<void> {
  const now = new Date().toISOString();
  await sb
    .from("label_generation_jobs")
    .update({
      heartbeat_at: now,
      ...(patch?.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch?.status ? { status: patch.status } : {}),
    })
    .eq("id", jobId);
}

export async function recoverStuckLabelJobs(
  sb: SupabaseClient,
  thresholdMs = resolveLabelJobStuckThresholdMs(),
): Promise<number> {
  const cutoff = new Date(Date.now() - thresholdMs).toISOString();
  const { data: stuck, error } = await sb
    .from("label_generation_jobs")
    .select("id")
    .in("status", [...LABEL_JOB_STUCK_STATUSES])
    .lt("heartbeat_at", cutoff);

  if (error) throw new Error(error.message);
  if (!stuck?.length) return 0;

  let recovered = 0;
  for (const row of stuck) {
    const { error: updErr } = await sb
      .from("label_generation_jobs")
      .update({
        status: "failed",
        error: "Job etichette bloccato (timeout heartbeat)",
        error_code: "LABEL_JOB_STUCK",
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("status", [...LABEL_JOB_STUCK_STATUSES]);
    if (!updErr) recovered += 1;
  }
  return recovered;
}
