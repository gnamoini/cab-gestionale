import "server-only";

import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import {
  COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI,
  COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE,
} from "@/lib/communications/drafts/communication-draft-types";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export type OrdineFornitoreEmailLogItem = {
  id: string;
  createdAt: string;
  subject: string;
  status: string;
  intendedRecipientEmail: string | null;
  actualRecipientEmail: string | null;
  errorMessage: string | null;
  renderedPayload: Record<string, unknown>;
};

export type OrdineFornitoreEmailStatus = {
  hasDraft: boolean;
  draftStatus: "draft" | "sending" | null;
  logs: OrdineFornitoreEmailLogItem[];
};

export async function getOrdineFornitoreEmailStatusServer(
  ordineId: string,
): Promise<ServiceResult<OrdineFornitoreEmailStatus>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "read"))) {
    return err("Permesso richiesto.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const admin = createCommunicationAdminClient();

  let hasDraft = false;
  let draftStatus: "draft" | "sending" | null = null;

  if (user?.id) {
    const { data: draft } = await admin.rpc("cab_get_communication_draft", {
      p_use_case: COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE,
      p_entity_type: COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI,
      p_entity_id: ordineId,
      p_author_id: user.id,
    });
    if (draft && typeof draft === "object") {
      const status = (draft as { status?: string }).status;
      if (status === "draft" || status === "sending") {
        hasDraft = true;
        draftStatus = status;
      }
    }
  }

  const { data: logs } = await admin
    .from("communication_log")
    .select(
      "id, created_at, subject, status, intended_recipient_email, actual_recipient_email, error_message, rendered_payload",
    )
    .eq("entity_type", "ordini_fornitori")
    .eq("entity_id", ordineId)
    .order("created_at", { ascending: false })
    .limit(20);

  const items: OrdineFornitoreEmailLogItem[] = (logs ?? []).map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    subject: String(row.subject ?? ""),
    status: String(row.status ?? ""),
    intendedRecipientEmail: row.intended_recipient_email ?? null,
    actualRecipientEmail: row.actual_recipient_email ?? null,
    errorMessage: row.error_message ?? null,
    renderedPayload: (row.rendered_payload as Record<string, unknown>) ?? {},
  }));

  return success({ hasDraft, draftStatus, logs: items });
}
