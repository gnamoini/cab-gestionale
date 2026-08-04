import "server-only";

import { findPoliciesForDomainEvent } from "@/lib/communications/policy/communication-policy-catalog";
import { resolveRecipientForPolicy } from "@/lib/communications/recipients/recipient-resolver.server";
import { readCommunicationSettingsFromRows } from "@/lib/communications/settings/communication-settings";
import {
  getDefaultTemplates,
  renderCommunicationTemplate,
} from "@/lib/communications/template/template-engine.server";
import { buildTemplateVariables } from "@/lib/communications/template/template-variables.server";
import { ordineFornitorePdfFileName } from "@/lib/ordini-fornitori/ordine-fornitore-pdf-generate";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import { createCommunicationAdminClient } from "@/lib/communications/application/communication-dispatcher.server";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export type OrdineSendPreview = {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  attachmentFileName: string;
};

export async function buildOrdineFornitoreSendPreviewServer(
  ordineId: string,
): Promise<ServiceResult<OrdineSendPreview>> {
  if (!(await verifyServerModuleCan("ordini_fornitori", "read"))) {
    return err("Permesso richiesto.");
  }

  const record = await fetchOrdineFornitoreRecordServer(ordineId);
  if (!record) return err("Ordine non trovato.");

  const client = createCommunicationAdminClient();
  const { data: settingsData } = await client.from("app_settings").select(APP_SETTINGS_COLUMNS);
  const settingsRows = (settingsData ?? []) as AppSettingRow[];
  const settings = readCommunicationSettingsFromRows(settingsRows);

  const policies = findPoliciesForDomainEvent("supplier_order.send_requested", {});
  const policy = policies.find((p) => p.templateKey === "supplier_order.sent");
  if (!policy) return err("Policy comunicazione non configurata.");

  const recipient = await resolveRecipientForPolicy(
    client,
    policy,
    "ordini_fornitori",
    ordineId,
    {},
    settingsRows,
  );

  const templateVars = await buildTemplateVariables(client, "ordini_fornitori", ordineId, {}, settingsRows);
  const def = getDefaultTemplates("supplier_order.sent");
  const rendered = renderCommunicationTemplate(def.subject, def.body, templateVars);

  return success({
    recipientEmail: recipient?.email ?? "",
    recipientName: recipient?.name ?? record.fornitoreLabel,
    subject: rendered.subject,
    attachmentFileName: ordineFornitorePdfFileName(record),
  });
}
