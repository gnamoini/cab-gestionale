import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import { recordAuditEvent } from "@/lib/audit/record";
import type { AuditEventInput } from "@/lib/audit/types";

export async function recordImportEvent(
  client: SupabaseClient,
  input: Omit<AuditEventInput, "eventType" | "action"> & {
    title: string;
    description?: string;
    correlationId: string;
    action?: string;
    stats?: Record<string, unknown>;
  },
): Promise<void> {
  const payload =
    input.stats != null
      ? { ...(typeof input.payload === "object" && input.payload ? (input.payload as object) : {}), stats: input.stats }
      : input.payload;

  await recordAuditEvent(client, {
    ...input,
    eventType: "IMPORT_EVENT",
    action: input.action ?? "IMPORT",
    actorType: input.actorType ?? "IMPORT",
    payload,
  });
}
