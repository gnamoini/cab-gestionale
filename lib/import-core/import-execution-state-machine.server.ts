import type { ImportExecutionStatus } from "@/lib/import-core/types";

const ALLOWED: Record<ImportExecutionStatus, readonly ImportExecutionStatus[]> = {
  queued: ["processing", "cancelled"],
  processing: ["ai_processing", "needs_review", "ready_to_commit", "failed", "cancelled"],
  ai_processing: ["needs_review", "ready_to_commit", "failed", "cancelled"],
  needs_review: ["ready_to_commit", "cancelled", "failed"],
  ready_to_commit: ["committing", "cancelled", "failed"],
  committing: ["completed", "failed"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

export function assertImportExecutionTransition(from: ImportExecutionStatus, to: ImportExecutionStatus): void {
  if (!ALLOWED[from].includes(to)) {
    const err = new Error(`Transizione execution non valida: ${from} → ${to}`);
    (err as Error & { code?: string }).code = "invalid_execution_transition";
    throw err;
  }
}

export function canImportExecutionTransition(from: ImportExecutionStatus, to: ImportExecutionStatus): boolean {
  return ALLOWED[from].includes(to);
}

export const IMPORT_EXECUTION_STUCK_STATUSES: ImportExecutionStatus[] = [
  "processing",
  "ai_processing",
  "committing",
];

export const IMPORT_EXECUTION_STUCK_THRESHOLD_MS = 10 * 60 * 1000;
