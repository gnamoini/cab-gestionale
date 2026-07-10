/** SHA-first key for legacy vs control-pr run correlation (cutover audit). */
export type ShadowCorrelationKey = {
  sha: string;
  legacyRunId: number;
  controlRunId: number;
};

export type ShadowCutoverRecord = ShadowCorrelationKey & {
  pr: number | null;
  legacy: string;
  control: string;
  legacyJobDurationMs: number | null;
  controlJobDurationMs: number | null;
  durationDeltaMs: number | null;
  mismatch: number;
  unexpectedNewFailures: number;
  blockerMismatchRate: number;
  green: boolean;
};

export function isGreenRecord(r: Pick<ShadowCutoverRecord, "legacy" | "control" | "mismatch" | "unexpectedNewFailures">): boolean {
  const ok = (c: string) => c === "success" || c === "neutral";
  return ok(r.legacy) && ok(r.control) && r.mismatch === 0 && r.unexpectedNewFailures === 0;
}

export function countConsecutiveGreenFromNewest(records: ShadowCutoverRecord[]): number {
  let streak = 0;
  for (const r of records) {
    if (!isGreenRecord(r)) break;
    streak += 1;
  }
  return streak;
}
