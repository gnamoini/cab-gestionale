import type { CaptureStatus } from "@/lib/document-capture/capture-status";

export type CaptureEventType =
  | "policy_created"
  | "storage_uploaded"
  | "finalized"
  | "duplicate_detected"
  | "expiration"
  | "status_changed"
  | "category_changed"
  | "linked"
  | "archived"
  | "soft_deleted"
  | "analyze_started"
  | "analyze_completed"
  | "analyze_failed"
  | "fields_confirmed"
  | "dry_run"
  | "apply_started"
  | "apply_committed"
  | "apply_failed"
  | "apply_partial";

export function captureEventIdempotencyKey(
  eventType: CaptureEventType,
  input: {
    captureId?: string;
    sha256Prefix?: string;
    fromStatus?: CaptureStatus | string;
    toStatus?: CaptureStatus | string;
    captureVersion?: number;
    applicationId?: string;
    linkField?: string;
    entityId?: string;
  } = {},
): string {
  switch (eventType) {
    case "policy_created":
    case "finalized":
      return eventType;
    case "duplicate_detected":
      return `duplicate_detected:${input.sha256Prefix ?? "unknown"}`;
    case "expiration":
      return `expiration:${input.captureId ?? "unknown"}`;
    case "status_changed":
      return `status:${input.fromStatus ?? "?"}:${input.toStatus ?? "?"}:${input.captureVersion ?? 0}`;
    case "soft_deleted":
      return `soft_deleted:${input.captureVersion ?? 0}`;
    case "linked":
      return `linked:${input.linkField ?? "entity"}:${input.entityId ?? "none"}:${input.captureVersion ?? 0}`;
    case "category_changed":
      return `category:${input.captureVersion ?? 0}`;
    case "dry_run":
      return `dry_run:${input.applicationId ?? "unknown"}`;
    case "apply_committed":
      return `apply_committed:${input.applicationId ?? "unknown"}`;
    case "apply_started":
      return `apply_started:${input.applicationId ?? "unknown"}`;
    case "fields_confirmed":
      return `fields_confirmed:${input.captureVersion ?? 0}`;
    default:
      return `${eventType}:${input.captureVersion ?? 0}`;
  }
}
