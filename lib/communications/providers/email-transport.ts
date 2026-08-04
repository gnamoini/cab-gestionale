export type EmailInlineAttachment = {
  contentId: string;
  filename: string;
  content: Uint8Array | string;
  contentType?: string;
};

export type EmailAttachment = {
  filename: string;
  content: Uint8Array | string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
  inlineAttachments?: EmailInlineAttachment[];
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export interface EmailTransport {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
