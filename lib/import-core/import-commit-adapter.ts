import type { CommitResult, ImportCommitContext } from "@/lib/import-core/types";
import { tryImportCommitDedup } from "@/lib/import-core/import-commit-dedup.server";

export interface ImportCommitAdapter<TPayload = unknown> {
  canCommit(ctx: ImportCommitContext, payload: TPayload): Promise<boolean>;
  getIdempotencyKey(ctx: ImportCommitContext, payload: TPayload): string;
  commit(ctx: ImportCommitContext, payload: TPayload): Promise<CommitResult>;
  canCompensate(ctx: ImportCommitContext, payload: TPayload): Promise<boolean>;
  compensate(ctx: ImportCommitContext, payload: TPayload): Promise<void>;
}

const idempotencyCache = new Set<string>();

export async function runIdempotentCommit<TPayload>(
  adapter: ImportCommitAdapter<TPayload>,
  ctx: ImportCommitContext,
  payload: TPayload,
): Promise<CommitResult> {
  const key = adapter.getIdempotencyKey(ctx, payload);

  const dedup = await tryImportCommitDedup(key, ctx.executionId);
  if (dedup?.idempotent) {
    return { entityType: "import", entityId: ctx.executionId, idempotent: true };
  }

  if (idempotencyCache.has(key)) {
    return { entityType: "import", entityId: ctx.executionId, idempotent: true };
  }

  if (!(await adapter.canCommit(ctx, payload))) {
    throw new Error("Commit non consentito");
  }

  const result = await adapter.commit(ctx, payload);
  idempotencyCache.add(key);
  return result;
}
