import "server-only";

import type { ImportCommitAdapter } from "@/lib/import-core/import-commit-adapter";
import type { CommitResult, ImportCommitContext } from "@/lib/import-core/types";

export type OrdineFornitoreCommitPayload = {
  ordineId: string;
};

export const ordineFornitoreCommitAdapter: ImportCommitAdapter<OrdineFornitoreCommitPayload> = {
  async canCommit() {
    return true;
  },
  getIdempotencyKey(ctx, payload) {
    return `ordine_fornitore:${ctx.executionId}:${payload.ordineId}`;
  },
  async commit(ctx, payload): Promise<CommitResult> {
    return { entityType: "ordine_fornitore", entityId: payload.ordineId };
  },
  async canCompensate() {
    return false;
  },
  async compensate() {
    // ponytail: compensation = annullamento manuale ordine (fuori scope rollback automatico)
  },
};
