import { z } from "zod";
import type { AllowedSender } from "@/lib/communications/senders/allowed-senders";

export const COMMUNICATION_DRAFT_USE_CASE_ORDINE_FORNITORE = "ordine_fornitore" as const;
export const COMMUNICATION_DRAFT_ENTITY_ORDINI_FORNITORI = "ordini_fornitori" as const;

export type CommunicationDraftStatus = "draft" | "sending";

export type CommunicationDraftAttachmentRef = {
  type: "ordine-fornitore";
  entityId: string;
};

export type CommunicationDraftRow = {
  id: string;
  use_case: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  status: CommunicationDraftStatus;
  sender_email: string;
  sender_display_name: string;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string;
  body_text: string;
  attachment_refs: CommunicationDraftAttachmentRef[];
  created_at: string;
  updated_at: string;
};

export type CommunicationDraftPayload = {
  id?: string;
  sender: AllowedSender;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  bodyText: string;
  attachmentRefs: CommunicationDraftAttachmentRef[];
  suggestedSupplierEmails?: string[];
  attachmentFileName?: string;
  allowedSenders?: AllowedSender[];
};

const emailListSchema = z.array(z.string().email()).max(20);

export const communicationDraftUpsertSchema = z.object({
  senderEmail: z.string().email(),
  senderDisplayName: z.string().max(200),
  toEmails: emailListSchema.min(1),
  ccEmails: emailListSchema.optional().default([]),
  bccEmails: emailListSchema.optional().default([]),
  subject: z.string().min(1).max(500),
  bodyText: z.string().max(20000),
});

export function parseEmailListJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
}

export function parseAttachmentRefsJson(raw: unknown): CommunicationDraftAttachmentRef[] {
  if (!Array.isArray(raw)) return [];
  const out: CommunicationDraftAttachmentRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.type === "ordine-fornitore" && typeof o.entityId === "string" && o.entityId.trim()) {
      out.push({ type: "ordine-fornitore", entityId: o.entityId.trim() });
    }
  }
  return out;
}

export function mapCommunicationDraftRow(row: Record<string, unknown>): CommunicationDraftRow {
  return {
    id: String(row.id ?? ""),
    use_case: String(row.use_case ?? ""),
    entity_type: String(row.entity_type ?? ""),
    entity_id: String(row.entity_id ?? ""),
    author_id: String(row.author_id ?? ""),
    status: row.status === "sending" ? "sending" : "draft",
    sender_email: String(row.sender_email ?? ""),
    sender_display_name: String(row.sender_display_name ?? ""),
    to_emails: parseEmailListJson(row.to_emails),
    cc_emails: parseEmailListJson(row.cc_emails),
    bcc_emails: parseEmailListJson(row.bcc_emails),
    subject: String(row.subject ?? ""),
    body_text: String(row.body_text ?? ""),
    attachment_refs: parseAttachmentRefsJson(row.attachment_refs),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function draftRowToPayload(
  row: CommunicationDraftRow,
  extras?: Pick<CommunicationDraftPayload, "suggestedSupplierEmails" | "attachmentFileName" | "allowedSenders">,
): CommunicationDraftPayload {
  return {
    id: row.id,
    sender: { email: row.sender_email, displayName: row.sender_display_name },
    toEmails: row.to_emails,
    ccEmails: row.cc_emails,
    bccEmails: row.bcc_emails,
    subject: row.subject,
    bodyText: row.body_text,
    attachmentRefs: row.attachment_refs,
    ...extras,
  };
}

export function dedupeEmails(emails: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of emails) {
    const e = raw.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push(raw.trim());
  }
  return out;
}
