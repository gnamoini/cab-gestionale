export const LABEL_JOB_STUCK_THRESHOLD_MS_DEFAULT = 10 * 60 * 1000;

const STUCK_STATUSES = ["pending", "running"] as const;

export function resolveLabelJobStuckThresholdMs(): number {
  const raw = Number(process.env.LABEL_JOB_STUCK_THRESHOLD_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : LABEL_JOB_STUCK_THRESHOLD_MS_DEFAULT;
}

export function isLabelJobStuck(
  job: { status: string; heartbeat_at: string | null },
  thresholdMs = resolveLabelJobStuckThresholdMs(),
): boolean {
  if (!STUCK_STATUSES.includes(job.status as (typeof STUCK_STATUSES)[number])) return false;
  if (!job.heartbeat_at) return true;
  return Date.now() - new Date(job.heartbeat_at).getTime() > thresholdMs;
}

export const LABEL_JOB_STUCK_STATUSES = STUCK_STATUSES;
