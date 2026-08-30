import "server-only";

import {
  attachmentRefsWithoutContent,
  buildAttachmentsForTypes,
} from "@/lib/communications/attachments/attachment-builder.server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import {
  assertOrdineFornitoreDraftSemantics,
  loadCommunicationDraftByIdServer,
} from "@/lib/communications/drafts/communication-draft.server";
import { dedupeEmails } from "@/lib/communications/drafts/communication-draft-types";
import { resolveCommunicationSend } from "@/lib/communications/guards/send-guard.server";
import { readCommunicationSettingsFromRows } from "@/lib/communications/settings/communication-settings";
import { assertAllowedSender, allowedSenderToFromHeader, resolveSupplierOrderAllowedSenders } from "@/lib/communications/senders/allowed-senders";
import { runCommunicationSendWorker } from "@/lib/communications/queue/communication-send-worker.server";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import { isValidEmail } from "@/lib/validation/email";
import { err, success, type ServiceResult } from "@/src/services/service-result";

function validateRecipientLists(input: {
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
}): string | null {
  const all = [...input.toEmails, ...input.ccEmails, ...input.bccEmails];
  if (!input.toEmails.length) return "Destinatario obbligatorio.";
  for (const email of all) {
    if (!isValidEmail(email)) return `Email non valida: ${email}`;
  }
  if (dedupeEmails(all).length !== all.map((e) => e.trim().toLowerCase()).filter(Boolean).length) {
    return "Destinatari duplicati.";
  }
  return null;
}

export async function sendComposedCommunicationDraftServer(
  draftId: string,
  ordineId: string,
): Promise<ServiceResult<{ logId: string | null }>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "write"))) {
    return err("Permesso richiesto.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return err("Utente non autenticato.");

  const draft = await loadCommunicationDraftByIdServer(draftId);
  if (!draft) return err("Bozza non trovata.");
  if (draft.author_id !== user.id) return err("Bozza non autorizzata.");
  if (!assertOrdineFornitoreDraftSemantics(draft, ordineId)) return err("Bozza non valida per questo ordine.");
  if (draft.status !== "draft") return err("Invio già in corso o bozza non disponibile.");

  const recipientError = validateRecipientLists({
    toEmails: draft.to_emails,
    ccEmails: draft.cc_emails,
    bccEmails: draft.bcc_emails,
  });
  if (recipientError) return err(recipientError);

  const admin = createCommunicationAdminClient();
  const { data: settingsData } = await admin.from("app_settings").select(APP_SETTINGS_COLUMNS);
  const settingsRows = (settingsData ?? []) as AppSettingRow[];
  const commSettings = readCommunicationSettingsFromRows(settingsRows);
  const allowedSenders = resolveSupplierOrderAllowedSenders(commSettings, settingsRows);

  let sender;
  try {
    sender = assertAllowedSender(
      { email: draft.sender_email, displayName: draft.sender_display_name },
      allowedSenders,
    );
  } catch (e) {
    return err(e instanceof Error ? e.message : "Mittente non autorizzato.");
  }

  const attachmentRef = draft.attachment_refs.find((r) => r.type === "ordine-fornitore");
  if (!attachmentRef || attachmentRef.entityId !== ordineId) {
    return err("Allegato ordine non valido.");
  }

  const { data: claimed, error: claimError } = await admin.rpc("cab_claim_communication_draft_send", {
    p_draft_id: draftId,
  });
  if (claimError || claimed !== true) {
    return err("Invio già in corso.");
  }

  const primaryTo = draft.to_emails[0]!.trim();
  const resolution = resolveCommunicationSend(commSettings, primaryTo, record.fornitoreLabel);
  const idempotencyKey = `comm:composed:ordini_fornitori:${ordineId}:${draftId}:${Date.now()}`;

  let status: "pending" | "simulated" | "skipped" | "failed" = "pending";
  let actualEmail = "";
  let errorMessage: string | null = null;

  if (resolution.action === "skip") {
    status = "skipped";
    errorMessage = resolution.reason;
  } else if (resolution.action === "simulate") {
    status = "simulated";
  } else {
    actualEmail = resolution.actualEmail;
  }

  const bodyText =
    resolution.action === "send" && resolution.prependBody
      ? resolution.prependBody + draft.body_text
      : draft.body_text;

  const attachments =
    status === "skipped"
      ? []
      : await buildAttachmentsForTypes(["ordine-fornitore"], "ordini_fornitori", ordineId, null);

  const renderedPayload = {
    to: draft.to_emails,
    cc: draft.cc_emails,
    bcc: draft.bcc_emails,
    from: sender.email,
    fromDisplayName: sender.displayName,
    bodyText: draft.body_text,
    composed: true,
  };

  const { data: logRow, error: logError } = await admin
    .from("communication_log")
    .insert({
      domain_event_type: "supplier_order.composed_send",
      entity_type: "ordini_fornitori",
      entity_id: ordineId,
      cliente_id: null,
      communication_target_type: "supplier",
      template_key: "supplier_order.sent",
      template_version: 1,
      rendered_payload: renderedPayload,
      subject: draft.subject,
      intended_recipient_email: primaryTo,
      intended_recipient_name: record.fornitoreLabel,
      actual_recipient_email: actualEmail,
      test_mode_active: commSettings.testMode,
      client_send_enabled: commSettings.clientEmailEnabled,
      dry_run: commSettings.dryRunEnabled || status === "simulated",
      attachment_refs: attachmentRefsWithoutContent(attachments),
      status,
      error_message: errorMessage,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .maybeSingle();

  if (logError || !logRow?.id) {
    await admin.rpc("cab_release_communication_draft", { p_draft_id: draftId });
    return err(logError?.message ?? "Creazione log non riuscita.");
  }

  const logId = logRow.id as string;

  if (status === "pending" || status === "simulated") {
    const sendTo = resolution.action === "send" ? draft.to_emails : [actualEmail];
    await admin.from("communication_send_queue").insert({
      log_id: logId,
      payload: {
        to: sendTo,
        cc: draft.cc_emails,
        bcc: draft.bcc_emails,
        subject: draft.subject,
        text: bodyText,
        from: allowedSenderToFromHeader(sender),
        simulated: status === "simulated",
        attachments: attachments.map((a) => ({
          filename: a.fileName,
          contentBase64: Buffer.from(a.content).toString("base64"),
        })),
      },
      status: "pending",
    });

    await runCommunicationSendWorker({ limit: 5 });
  }

  await admin.rpc("cab_release_communication_draft", { p_draft_id: draftId });

  return success({ logId });
}
