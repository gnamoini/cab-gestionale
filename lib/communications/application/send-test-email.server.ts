import "server-only";

import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import { emailChannelProvider } from "@/lib/communications/channels/email-channel-provider";
import {
  loadAppSettingsRowsForCommunicationSend,
  prepareCommunicationEmailSendInput,
} from "@/lib/communications/email/communication-email-envelope.server";
import { resolveCommunicationEmailEnvelope, readCommunicationPrefsFromRows } from "@/lib/communications/email/communication-email-envelope";
import { createResendEmailTransport } from "@/lib/communications/providers/resend-email-provider.server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { isValidEmail } from "@/lib/validation/email";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export async function sendCommunicationTestEmailServer(
  testEmailAddress: string,
): Promise<ServiceResult<{ messageId?: string }>> {
  const allowed = await verifyServerPageWrite("impostazioni");
  if (!allowed) return err("Permesso richiesto.");

  const to = testEmailAddress.trim();
  if (!isValidEmail(to)) return err("Inserisci un indirizzo email di test valido.");

  const transport = createResendEmailTransport();
  if (!transport) {
    return err(
      "Errore invio email: Resend non configurato. Imposta RESEND_API_KEY e RESEND_FROM nell'ambiente server.",
    );
  }

  const settingsRows = await loadAppSettingsRowsForCommunicationSend();
  const commSettings = readCommunicationPrefsFromRows(settingsRows);
  const envelope = resolveCommunicationEmailEnvelope(commSettings, settingsRows);
  const displayName = envelope?.displayName?.trim() || "Gestionale CAB";

  const subject = `Email di prova — ${displayName}`;
  const text = [
    "Gentile utente,",
    "",
    "questa è un'email di prova dal sistema di comunicazioni del gestionale.",
    "",
    "Se ricevi questo messaggio, Resend e il dominio mittente sono configurati correttamente.",
    "",
    `Destinatario test: ${to}`,
    "",
    "Cordiali saluti,",
    displayName,
  ].join("\n");

  const sendInput = await prepareCommunicationEmailSendInput({
    to,
    subject,
    text,
    settingsRows,
  });
  if (!sendInput) {
    return err("Errore invio email: mittente Resend non valido (RESEND_FROM).");
  }

  const start = Date.now();
  const result = await emailChannelProvider.deliver({
    transport,
    input: sendInput,
  });

  if (!result.ok) {
    const detail = result.error?.trim() || "errore sconosciuto";
    return err(`Errore invio email: ${detail}`);
  }

  if (readSupabaseServiceRoleKey()) {
    try {
      const client = createCommunicationAdminClient();
      const idempotencyKey = `comm:manual.test:${to}:${Date.now()}`;
      const { error: logError } = await client.from("communication_log").insert({
        domain_event_type: "manual.test",
        entity_type: "system",
        entity_id: "00000000-0000-0000-0000-000000000000",
        communication_target_type: "system",
        template_key: "manual.test",
        template_version: 1,
        rendered_payload: { destinatario_test: to },
        subject,
        intended_recipient_email: to,
        intended_recipient_name: "Test",
        actual_recipient_email: to,
        test_mode_active: true,
        client_send_enabled: false,
        dry_run: false,
        attachment_refs: [],
        status: "sent",
        message_id: result.messageId ?? null,
        duration_ms: Date.now() - start,
        idempotency_key: idempotencyKey,
      });
      if (logError) {
        console.warn("[communication] test-send log insert failed:", logError.message);
      }
    } catch (e) {
      console.warn("[communication] test-send log skipped:", e);
    }
  }

  return success({ messageId: result.messageId });
}
