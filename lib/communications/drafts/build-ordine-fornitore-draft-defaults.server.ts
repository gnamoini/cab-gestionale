import "server-only";

import { readCommunicationSettingsFromRows } from "@/lib/communications/settings/communication-settings";
import type { CommunicationDraftPayload } from "@/lib/communications/drafts/communication-draft-types";
import {
  resolveSupplierOrderAllowedSenders,
  resolveSupplierOrderDefaultSender,
} from "@/lib/communications/senders/allowed-senders";
import {
  getDefaultTemplates,
  renderCommunicationTemplate,
} from "@/lib/communications/template/template-engine.server";
import { buildTemplateVariables } from "@/lib/communications/template/template-variables.server";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import { parseOrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";
import { ordineFornitorePdfFileName } from "@/lib/ordini-fornitori/ordine-fornitore-pdf-generate";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { AppSettingRow } from "@/src/types/supabase-tables";

function buildOrdineFornitoreEmailSubject(templateVars: Record<string, string | number | null>): string {
  const ordine = String(templateVars.ordine ?? "").trim();
  const azienda = String(templateVars.azienda ?? "").trim();
  if (ordine && azienda) return `Ordine fornitore n. ${ordine} – ${azienda}`;
  if (ordine) return `Ordine fornitore n. ${ordine}`;
  return "Ordine fornitore";
}

export async function buildOrdineFornitoreDraftDefaultsServer(
  ordineId: string,
  record: OrdineFornitoreRecord,
  settingsRows: AppSettingRow[],
): Promise<CommunicationDraftPayload> {
  const client = createCommunicationAdminClient();
  const commSettings = readCommunicationSettingsFromRows(settingsRows);
  const allowedSenders = resolveSupplierOrderAllowedSenders(commSettings, settingsRows);
  const defaultSender = resolveSupplierOrderDefaultSender(commSettings, settingsRows) ?? {
    email: "",
    displayName: "",
  };

  const snapshot = parseOrdineFornitoreFornitoreSnapshot(record.fornitoreSnapshot, record.fornitoreLabel);
  const templateVars = await buildTemplateVariables(client, "ordini_fornitori", ordineId, {}, settingsRows);
  const def = getDefaultTemplates("supplier_order.sent");
  const rendered = renderCommunicationTemplate(def.subject, def.body, templateVars);

  const toEmails = snapshot.email.trim() ? [snapshot.email.trim()] : [];
  const suggestedSupplierEmails = snapshot.emailAggiuntive.filter(Boolean);

  return {
    sender: defaultSender,
    toEmails,
    ccEmails: [],
    bccEmails: [],
    subject: buildOrdineFornitoreEmailSubject(templateVars as Record<string, string | number | null>) || rendered.subject,
    bodyText: rendered.body,
    attachmentRefs: [{ type: "ordine-fornitore", entityId: ordineId }],
    suggestedSupplierEmails,
    attachmentFileName: ordineFornitorePdfFileName(record),
    allowedSenders,
  };
}
