/** Stati document_capture — SSOT con PostgreSQL CHECK. */

export const CAPTURE_STATUSES = [
  "pending_upload",
  "expired_upload",
  "uploaded",
  "review_required",
  "analyzing",
  "review",
  "dry_run",
  "applying",
  "applied",
  "archived",
  "failed",
] as const;

export type CaptureStatus = (typeof CAPTURE_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<CaptureStatus, readonly CaptureStatus[]> = {
  pending_upload: ["uploaded", "failed", "expired_upload"],
  expired_upload: ["archived"],
  uploaded: ["archived", "failed", "analyzing", "review_required"],
  analyzing: ["review", "failed"],
  review: ["dry_run", "archived", "failed", "analyzing"],
  review_required: ["analyzing", "archived", "failed"],
  dry_run: ["applying", "applied", "failed", "review", "analyzing"],
  applying: ["applied", "failed"],
  applied: ["archived"],
  failed: ["archived", "applying", "analyzing"],
  archived: [],
};

export class InvalidCaptureStatusTransitionError extends Error {
  readonly code = "invalid_status_transition" as const;

  constructor(from: string, to: string) {
    super(`Transizione non consentita: ${from} → ${to}`);
    this.name = "InvalidCaptureStatusTransitionError";
  }
}

export function assertCaptureStatusTransition(from: CaptureStatus, to: CaptureStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidCaptureStatusTransitionError(from, to);
  }
}

export function isCaptureStatus(value: string): value is CaptureStatus {
  return (CAPTURE_STATUSES as readonly string[]).includes(value);
}

/** Stati attivi in Fase 1A. */
export const PHASE_1A_STATUSES: readonly CaptureStatus[] = [
  "pending_upload",
  "expired_upload",
  "uploaded",
  "archived",
  "failed",
];
