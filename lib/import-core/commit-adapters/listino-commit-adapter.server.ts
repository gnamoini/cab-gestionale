import "server-only";

import type { ImportCommitAdapter } from "@/lib/import-core/import-commit-adapter";
import type { CommitResult, ImportCommitContext } from "@/lib/import-core/types";

export type ListinoCommitPayload = {
  batchId: string;
  createdRicambioIds: string[];
};

export const listinoCommitAdapter: ImportCommitAdapter<ListinoCommitPayload> = {
  async canCommit() {
    return true;
  },
  getIdempotencyKey(ctx, payload) {
    return `listino:${ctx.executionId}:${payload.batchId}`;
  },
  async commit(ctx, payload): Promise<CommitResult> {
    return {
      entityType: "magazzino_ricambi",
      entityId: payload.createdRicambioIds[0] ?? ctx.executionId,
    };
  },
  async canCompensate(ctx, payload) {
    return payload.createdRicambioIds.length > 0;
  },
  async compensate(_ctx, payload) {
    // ponytail: compensation = delete generated ricambi via listino-import-delete-generated (opt-in UI)
    void payload;
  },
};
