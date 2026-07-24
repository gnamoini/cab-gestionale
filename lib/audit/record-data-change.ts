import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { recordAuditEvent } from "@/lib/audit/record";
import type { AuditEventInput } from "@/lib/audit/types";
import { buildAuditSnapshot } from "@/lib/audit/build-message";

export async function recordDataChange(
  client: SupabaseClient,
  input: Omit<AuditEventInput, "eventType"> & {
    before?: unknown;
    after?: unknown;
    snapshotFields?: readonly string[];
  },
): Promise<void> {
  const snapshot =
    input.snapshot ??
    (input.after != null ? buildAuditSnapshot(input.after, input.snapshotFields) : undefined);

  await recordAuditEvent(client, {
    ...input,
    eventType: "DATA_CHANGE",
    snapshot,
  });
}
