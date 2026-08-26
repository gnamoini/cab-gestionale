import "server-only";

import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";

export async function tryImportCommitDedup(
  idempotencyKey: string,
  executionId: string,
): Promise<{ idempotent: true } | null> {
  try {
    const client = createCommunicationAdminClient();
    const { data, error } = await client.rpc("import_commit_with_dedup", {
      p_idempotency_key: idempotencyKey,
      p_execution_id: executionId,
    });
    if (error) return null;
    const row = data as { idempotent?: boolean; inserted?: boolean } | null;
    if (row && (row.idempotent === true || row.inserted !== true)) {
      return { idempotent: true };
    }
    return null;
  } catch {
    return null;
  }
}
