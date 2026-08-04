/** Resend `attachments[].content` richiede stringa base64. */
export function emailAttachmentContentBase64(content: Uint8Array | string): string {
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
}
