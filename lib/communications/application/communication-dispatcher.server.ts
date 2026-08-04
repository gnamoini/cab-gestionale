import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import {
  attachmentRefsWithoutContent,
  buildAttachmentsForTypes,
} from "@/lib/communications/attachments/attachment-builder.server";
import { emailChannelProvider } from "@/lib/communications/channels/email-channel-provider";
import type { CommunicationLogStatus } from "@/lib/communications/domain/communication-types";
import { resolveCommunicationSend } from "@/lib/communications/guards/send-guard.server";
import { traceCommunicationEvent } from "@/lib/communications/logging/communication-trace.server";
import {
  loadClienteCommunicationPreferences,
  resolveActivePolicies,
} from "@/lib/communications/recipients/customer-preferences-resolver.server";
import { resolveRecipientForPolicy } from "@/lib/communications/recipients/recipient-resolver.server";
import { readCommunicationSettingsFromRows } from "@/lib/communications/settings/communication-settings";
import {
  getDefaultTemplates,
  renderCommunicationTemplate,
} from "@/lib/communications/template/template-engine.server";
import {
  buildTemplateVariables,
  resolveClienteIdForEntity,
} from "@/lib/communications/template/template-variables.server";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export type CommunicationOutboxRow = {
  id: string;
  domain_event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  trace_id: string;
  attempt_count?: number;
};

export function createCommunicationAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function loadSettingsRows(client: SupabaseClient): Promise<AppSettingRow[]> {
  const { data } = await client.from("app_settings").select(APP_SETTINGS_COLUMNS);
  return (data ?? []) as AppSettingRow[];
}

async function loadTemplate(
  client: SupabaseClient,
  templateKey: string,
): Promise<{ subject: string; body: string; version: number }> {
  const { data } = await client
    .from("communication_templates")
    .select("subject_template, body_template, version")
    .eq("template_key", templateKey)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      subject: String(data.subject_template ?? ""),
      body: String(data.body_template ?? ""),
      version: Number(data.version ?? 1),
    };
  }

  const def = getDefaultTemplates(templateKey as import("@/lib/communications/domain/communication-template-keys").CommunicationTemplateKey);
  return def;
}

export async function processCommunicationOutboxRow(
  client: SupabaseClient,
  row: CommunicationOutboxRow,
): Promise<{ ok: boolean; error?: string }> {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const settingsRows = await loadSettingsRows(client);
  const settings = readCommunicationSettingsFromRows(settingsRows);

  const clienteId = await resolveClienteIdForEntity(client, row.entity_type, row.entity_id, payload);
  const prefs = await loadClienteCommunicationPreferences(client, clienteId);
  const policies = resolveActivePolicies(row.domain_event_type, payload, prefs);

  if (!policies.length) {
    return { ok: true };
  }

  let lavorazioneId: string | null = null;
  if (row.entity_type === "lavorazioni") lavorazioneId = row.entity_id;
  if (row.entity_type === "preventivi") {
    const { data: pv } = await client.from("preventivi").select("lavorazione_id").eq("id", row.entity_id).maybeSingle();
    lavorazioneId = pv?.lavorazione_id ?? null;
  }

  for (const policy of policies) {
    if (!policy.allowedChannels.includes("email")) continue;

    const recipient = await resolveRecipientForPolicy(
      client,
      policy,
      row.entity_type,
      row.entity_id,
      payload,
      settingsRows,
    );

    const policyIdempotency = `${row.idempotency_key}:${policy.templateKey}`;
    const { data: existing } = await client
      .from("communication_log")
      .select("id")
      .eq("idempotency_key", policyIdempotency)
      .maybeSingle();
    if (existing) continue;

    const templateVars = await buildTemplateVariables(
      client,
      row.entity_type,
      row.entity_id,
      payload,
      settingsRows,
    );
    const template = await loadTemplate(client, policy.templateKey);
    const rendered = renderCommunicationTemplate(template.subject, template.body, templateVars);

    const intendedEmail = recipient?.email ?? "";
    const intendedName = recipient?.name ?? "";

    if (policy.conditions.email_exists && !intendedEmail.trim()) {
      await insertLog(client, {
        domainEvent: row.domain_event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        clienteId: recipient?.clienteId ?? clienteId,
        targetType: policy.recipientType,
        templateKey: policy.templateKey,
        templateVersion: template.version,
        renderedPayload: templateVars,
        subject: rendered.subject,
        intendedEmail,
        intendedName,
        actualEmail: "",
        settings,
        attachmentRefs: [],
        status: "skipped",
        errorMessage: "email_missing",
        idempotencyKey: policyIdempotency,
      });
      continue;
    }

    const resolution = resolveCommunicationSend(settings, intendedEmail, intendedName);
    let status: CommunicationLogStatus = "pending";
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
        ? resolution.prependBody + rendered.body
        : rendered.body;

    const attachments =
      status === "skipped"
        ? []
        : await buildAttachmentsForTypes(
            policy.attachmentTypes,
            row.entity_type,
            row.entity_id,
            lavorazioneId,
          );

    const logId = await insertLog(client, {
      domainEvent: row.domain_event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      clienteId: recipient?.clienteId ?? clienteId,
      targetType: policy.recipientType,
      templateKey: policy.templateKey,
      templateVersion: template.version,
      renderedPayload: templateVars,
      subject: rendered.subject,
      intendedEmail,
      intendedName,
      actualEmail,
      settings,
      attachmentRefs: attachmentRefsWithoutContent(attachments),
      status,
      errorMessage,
      idempotencyKey: policyIdempotency,
    });

    if (!logId) continue;

    traceCommunicationEvent({
      event: row.domain_event_type,
      templateKey: policy.templateKey,
      recipient: intendedEmail,
      actualRecipient: actualEmail,
      mode: status,
      attachments: attachments.length,
      status,
    });

    if (status === "pending" || status === "simulated") {
      await client.from("communication_send_queue").insert({
        log_id: logId,
        payload: {
          to: actualEmail,
          subject: rendered.subject,
          text: bodyText,
          attachments: attachments.map((a) => ({
            filename: a.fileName,
            contentBase64: Buffer.from(a.content).toString("base64"),
          })),
          simulated: status === "simulated",
        },
        status: "pending",
      });
    }
  }

  return { ok: true };
}

async function insertLog(
  client: SupabaseClient,
  input: {
    domainEvent: string;
    entityType: string;
    entityId: string;
    clienteId: string | null;
    targetType: string;
    templateKey: string;
    templateVersion: number;
    renderedPayload: Record<string, unknown>;
    subject: string;
    intendedEmail: string;
    intendedName: string;
    actualEmail: string;
    settings: ReturnType<typeof readCommunicationSettingsFromRows>;
    attachmentRefs: unknown[];
    status: CommunicationLogStatus;
    errorMessage: string | null;
    idempotencyKey: string;
  },
): Promise<string | null> {
  const { data, error } = await client
    .from("communication_log")
    .insert({
      domain_event_type: input.domainEvent,
      entity_type: input.entityType,
      entity_id: input.entityId,
      cliente_id: input.clienteId,
      communication_target_type: input.targetType,
      template_key: input.templateKey,
      template_version: input.templateVersion,
      rendered_payload: input.renderedPayload,
      subject: input.subject,
      intended_recipient_email: input.intendedEmail,
      intended_recipient_name: input.intendedName,
      actual_recipient_email: input.actualEmail,
      test_mode_active: input.settings.testMode,
      client_send_enabled: input.settings.clientEmailEnabled,
      dry_run: input.settings.dryRunEnabled || input.status === "simulated",
      attachment_refs: input.attachmentRefs,
      status: input.status,
      error_message: input.errorMessage,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}
