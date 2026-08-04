import "server-only";

import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { emailChannelProvider } from "@/lib/communications/channels/email-channel-provider";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import {
  buildCommunicationSendEmailInput,
  loadCommunicationSendBatchContext,
  resolveCommunicationEmailEnvelope,
} from "@/lib/communications/email/communication-email-envelope.server";
import { traceCommunicationEvent } from "@/lib/communications/logging/communication-trace.server";
import { createResendEmailTransport } from "@/lib/communications/providers/resend-email-provider.server";
import type { AppSettingRow } from "@/src/types/supabase-tables";

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [60_000, 120_000, 300_000, 600_000, 900_000];

type SendQueueRow = {
  id: string;
  log_id: string;
  payload: {
    to?: string;
    subject?: string;
    text?: string;
    simulated?: boolean;
    attachments?: Array<{ filename: string; contentBase64: string }>;
  };
  attempts: number;
};

export type CommunicationSendWorkerResult = {
  ok: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
};

export async function runCommunicationSendWorker(input?: { limit?: number }): Promise<CommunicationSendWorkerResult> {
  const client = createCommunicationAdminClient();
  const limit = input?.limit ?? 20;
  const transport = createResendEmailTransport();

  const { data: claimed, error: claimError } = await client.rpc("cab_claim_communication_send_batch", {
    p_limit: limit,
  });

  if (claimError) {
    return { ok: false, processed: 0, sent: 0, failed: 0, skipped: 0, error: claimError.message };
  }

  const rows = (claimed ?? []) as SendQueueRow[];
  if (!rows.length) {
    return { ok: true, processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const { data: settingsRowsData } = await client.from("app_settings").select(APP_SETTINGS_COLUMNS);
  const settingsRows = (settingsRowsData ?? []) as AppSettingRow[];
  const sendContext = await loadCommunicationSendBatchContext(settingsRows);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const payload = row.payload ?? {};
    const start = Date.now();

    if (payload.simulated) {
      await client
        .from("communication_log")
        .update({ status: "simulated", duration_ms: Date.now() - start })
        .eq("id", row.log_id);
      await client.rpc("cab_complete_communication_send", {
        p_queue_id: row.id,
        p_status: "sent",
        p_error: null,
        p_next_attempt_at: null,
      });
      skipped += 1;
      continue;
    }

    if (!transport || !payload.to?.trim()) {
      await client
        .from("communication_log")
        .update({ status: "failed", error_message: "transport_or_recipient_missing" })
        .eq("id", row.log_id);
      await client.rpc("cab_complete_communication_send", {
        p_queue_id: row.id,
        p_status: "dead_letter",
        p_error: "transport_or_recipient_missing",
        p_next_attempt_at: null,
      });
      failed += 1;
      continue;
    }

    const attachments = (payload.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.contentBase64, "base64"),
    }));

    const envelope = resolveCommunicationEmailEnvelope(sendContext.commSettings, settingsRows);
    if (!envelope) {
      await client
        .from("communication_log")
        .update({ status: "failed", error_message: "resend_from_missing" })
        .eq("id", row.log_id);
      await client.rpc("cab_complete_communication_send", {
        p_queue_id: row.id,
        p_status: "dead_letter",
        p_error: "resend_from_missing",
        p_next_attempt_at: null,
      });
      failed += 1;
      continue;
    }

    const sendInput = buildCommunicationSendEmailInput({
      to: payload.to!,
      subject: payload.subject ?? "",
      text: payload.text ?? "",
      commSettings: sendContext.commSettings,
      branding: sendContext.branding,
      envelope,
      attachments,
    });

    const result = await emailChannelProvider.deliver({
      transport,
      input: sendInput,
    });

    const durationMs = Date.now() - start;

    if (result.ok) {
      await client
        .from("communication_log")
        .update({
          status: "sent",
          message_id: result.messageId ?? null,
          duration_ms: durationMs,
          retry_count: row.attempts,
        })
        .eq("id", row.log_id);
      await client.rpc("cab_complete_communication_send", {
        p_queue_id: row.id,
        p_status: "sent",
        p_error: null,
        p_next_attempt_at: null,
      });
      traceCommunicationEvent({
        event: "send",
        templateKey: "",
        recipient: payload.to!,
        actualRecipient: payload.to!,
        mode: "sent",
        attachments: attachments.length,
        durationMs,
        status: "sent",
        retryCount: row.attempts,
        messageId: result.messageId,
      });
      sent += 1;
    } else {
      const attempts = row.attempts;
      const nextBackoff = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)] ?? 300_000;
      const nextAt = new Date(Date.now() + nextBackoff).toISOString();

      if (attempts >= MAX_ATTEMPTS) {
        await client
          .from("communication_log")
          .update({
            status: "failed",
            error_message: result.error ?? "send_failed",
            duration_ms: durationMs,
            retry_count: attempts,
          })
          .eq("id", row.log_id);
        await client.rpc("cab_complete_communication_send", {
          p_queue_id: row.id,
          p_status: "dead_letter",
          p_error: result.error ?? "send_failed",
          p_next_attempt_at: null,
        });
      } else {
        await client
          .from("communication_log")
          .update({
            error_message: result.error ?? "send_failed",
            retry_count: attempts,
          })
          .eq("id", row.log_id);
        await client.rpc("cab_complete_communication_send", {
          p_queue_id: row.id,
          p_status: "pending",
          p_error: result.error ?? "send_failed",
          p_next_attempt_at: nextAt,
        });
      }
      failed += 1;
    }
  }

  return { ok: true, processed: rows.length, sent, failed, skipped };
}
