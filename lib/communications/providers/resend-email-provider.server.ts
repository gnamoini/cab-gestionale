import "server-only";

import { Resend } from "resend";
import { readResendApiKey, readResendFrom } from "@/lib/env/resend";
import { emailAttachmentContentBase64 } from "@/lib/communications/providers/resend-attachment-content";
import type { EmailTransport, SendEmailInput, SendEmailResult } from "@/lib/communications/providers/email-transport";

export function createResendEmailTransport(): EmailTransport | null {
  const apiKey = readResendApiKey();
  const defaultFrom = readResendFrom();
  if (!apiKey || !defaultFrom) return null;

  const resend = new Resend(apiKey);

  return {
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      try {
        const from = input.from?.trim() || defaultFrom;
        const html =
          input.html ??
          `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`;
        const attachmentItems = [
          ...(input.inlineAttachments?.map((a) => ({
            filename: a.filename,
            content: emailAttachmentContentBase64(a.content),
            contentId: a.contentId,
            contentType: a.contentType,
          })) ?? []),
          ...(input.attachments?.map((a) => ({
            filename: a.filename,
            content: emailAttachmentContentBase64(a.content),
          })) ?? []),
        ];
        const { data, error } = await resend.emails.send({
          from,
          to: input.to,
          cc: input.cc?.length ? input.cc : undefined,
          bcc: input.bcc?.length ? input.bcc : undefined,
          replyTo: input.replyTo?.trim() || undefined,
          subject: input.subject,
          text: input.text,
          html,
          attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
        });

        if (error) {
          return { ok: false, error: error.message };
        }
        return { ok: true, messageId: data?.id };
      } catch (e) {
        const message = e instanceof Error ? e.message : "resend_send_failed";
        return { ok: false, error: message };
      }
    },
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
