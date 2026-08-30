import "server-only";

import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import {
  COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI,
  COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE,
  type CommunicationDraftPayload,
  draftRowToPayload,
  mapCommunicationDraftRow,
} from "@/lib/communications/drafts/communication-draft-types";
import { buildOrdineFornitoreDraftDefaultsServer } from "@/lib/communications/drafts/build-ordine-fornitore-draft-defaults.server";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import { err, success, type ServiceResult } from "@/src/services/service-result";

async function getAuthorId(): Promise<string | null> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user?.id ?? null;
}

export async function getOrdineFornitoreEmailDraftServer(
  ordineId: string,
): Promise<ServiceResult<CommunicationDraftPayload>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "read"))) {
    return err("Permesso richiesto.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const authorId = await getAuthorId();
  if (!authorId) return err("Utente non autenticato.");

  const admin = createCommunicationAdminClient();
  const { data: settingsData } = await admin.from("app_settings").select(APP_SETTINGS_COLUMNS);
  const settingsRows = (settingsData ?? []) as AppSettingRow[];

  const { data: existing } = await admin.rpc("cab_get_communication_draft", {
    p_use_case: COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE,
    p_entity_type: COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI,
    p_entity_id: ordineId,
    p_author_id: authorId,
  });

  const defaults = await buildOrdineFornitoreDraftDefaultsServer(ordineId, record, settingsRows);

  if (existing && typeof existing === "object") {
    const row = mapCommunicationDraftRow(existing as Record<string, unknown>);
    if (row.status === "draft") {
      return success(
        draftRowToPayload(row, {
          suggestedSupplierEmails: defaults.suggestedSupplierEmails,
          attachmentFileName: defaults.attachmentFileName,
          allowedSenders: defaults.allowedSenders,
        }),
      );
    }
  }

  return success(defaults);
}

export async function upsertOrdineFornitoreEmailDraftServer(
  ordineId: string,
  input: {
    senderEmail: string;
    senderDisplayName: string;
    toEmails: string[];
    ccEmails: string[];
    bccEmails: string[];
    subject: string;
    bodyText: string;
  },
): Promise<ServiceResult<{ draftId: string }>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "write"))) {
    return err("Permesso richiesto.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const authorId = await getAuthorId();
  if (!authorId) return err("Utente non autenticato.");

  const admin = createCommunicationAdminClient();
  const attachmentRefs = [{ type: "ordine-fornitore" as const, entityId: ordineId }];

  const { data: draftId, error } = await admin.rpc("cab_upsert_communication_draft", {
    p_use_case: COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE,
    p_entity_type: COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI,
    p_entity_id: ordineId,
    p_author_id: authorId,
    p_sender_email: input.senderEmail,
    p_sender_display_name: input.senderDisplayName,
    p_to_emails: input.toEmails,
    p_cc_emails: input.ccEmails,
    p_bcc_emails: input.bccEmails,
    p_subject: input.subject,
    p_body_text: input.bodyText,
    p_attachment_refs: attachmentRefs,
  });

  if (error || !draftId) return err(error?.message ?? "Salvataggio bozza non riuscito.");
  return success({ draftId: String(draftId) });
}

export async function loadCommunicationDraftByIdServer(draftId: string) {
  const admin = createCommunicationAdminClient();
  const { data } = await admin.rpc("cab_get_communication_draft_by_id", { p_draft_id: draftId });
  if (!data || typeof data !== "object") return null;
  return mapCommunicationDraftRow(data as Record<string, unknown>);
}

export function assertOrdineFornitoreDraftSemantics(
  draft: { use_case: string; entity_type: string; entity_id: string },
  ordineId: string,
): boolean {
  return (
    draft.use_case === COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE &&
    draft.entity_type === COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI &&
    draft.entity_id === ordineId
  );
}
