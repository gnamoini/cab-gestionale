import "server-only";

import { createHash } from "node:crypto";
import { parseSdiEvent } from "@/lib/fatturazione/fe-sdi/sdi-event-parser";

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function applySdiEventFromOutcome(
  client: RpcClient,
  params: {
    invoiceId: string;
    transmissionId?: string | null;
    outcome: string;
    rawCode?: string | null;
    providerEventId?: string | null;
    sdiIdentifier?: string | null;
    message?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const parsed = parseSdiEvent(params.outcome, params.rawCode, params.message);

  if (parsed.canonicalEventType === "TECHNICAL_RECEIPT") {
    return { ok: true, skipped: true };
  }

  const idempotencyKey =
    params.providerEventId ??
    `event:${params.invoiceId}:${parsed.canonicalEventType}:${parsed.rawSdiEventCode ?? "na"}`;

  const payloadHash = createHash("sha256")
    .update(JSON.stringify(params.payload ?? {}) + idempotencyKey)
    .digest("hex");

  const { error } = await client.rpc("apply_sdi_event", {
    p_payload: {
      invoice_id: params.invoiceId,
      transmission_id: params.transmissionId ?? null,
      canonical_event_type: parsed.canonicalEventType,
      raw_sdi_event_code: parsed.rawSdiEventCode,
      idempotency_key: idempotencyKey,
      payload_hash: payloadHash,
      provider_event_id: params.providerEventId,
      sdi_identifier: params.sdiIdentifier,
      parsed_code: parsed.parsedCode,
      parsed_message: parsed.parsedMessage,
      event_payload: params.payload ?? {},
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
