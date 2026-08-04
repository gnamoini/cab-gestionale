/** Resend email transport — solo server (Route Handlers, cron, server actions). */
export function readResendApiKey(): string | null {
  const k = process.env.RESEND_API_KEY?.trim() ?? "";
  return k || null;
}

export function readResendFrom(): string | null {
  const f = process.env.RESEND_FROM?.trim() ?? "";
  return f || null;
}

export function isResendConfigured(): boolean {
  return readResendApiKey() != null && readResendFrom() != null;
}
