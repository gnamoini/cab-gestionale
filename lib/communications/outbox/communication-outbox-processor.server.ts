import "server-only";

import {
  createCommunicationAdminClient,
  processCommunicationOutboxRow,
  type CommunicationOutboxRow,
} from "@/lib/communications/application/communication-dispatcher.server";

const MAX_ATTEMPTS = 5;

export type CommunicationOutboxProcessorResult = {
  ok: boolean;
  processed: number;
  completed: number;
  failed: number;
  error?: string;
};

export async function runCommunicationOutboxProcessor(input?: {
  limit?: number;
}): Promise<CommunicationOutboxProcessorResult> {
  const client = createCommunicationAdminClient();
  const limit = input?.limit ?? 20;

  const { data: claimed, error: claimError } = await client.rpc("cab_claim_communication_outbox_batch", {
    p_limit: limit,
  });

  if (claimError) {
    return { ok: false, processed: 0, completed: 0, failed: 0, error: claimError.message };
  }

  const rows = (claimed ?? []) as CommunicationOutboxRow[];
  if (!rows.length) {
    return { ok: true, processed: 0, completed: 0, failed: 0 };
  }

  let completed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await processCommunicationOutboxRow(client, row);
      if (!result.ok) {
        throw new Error(result.error ?? "dispatch_failed");
      }
      await client.rpc("cab_complete_communication_outbox", {
        p_outbox_id: row.id,
        p_status: "completed",
        p_error: null,
      });
      completed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "outbox_process_failed";
      const attempts = row.attempt_count ?? 1;
      if (attempts >= MAX_ATTEMPTS) {
        await client.rpc("cab_complete_communication_outbox", {
          p_outbox_id: row.id,
          p_status: "failed",
          p_error: message,
        });
      } else {
        await client.rpc("cab_release_communication_outbox", {
          p_outbox_id: row.id,
          p_error: message,
        });
      }
      failed += 1;
    }
  }

  return { ok: true, processed: rows.length, completed, failed };
}
