import { isValidEmail } from "@/lib/validation/email";
import { readResendFrom } from "@/lib/env/resend";

export type ParsedResendFrom = {
  email: string;
  displayName?: string;
};

/** Parse `RESEND_FROM` — supporta `nome@dominio.it` o `Nome <nome@dominio.it>`. */
export function parseResendFromEnv(): ParsedResendFrom | null {
  const raw = readResendFrom();
  if (!raw) return null;

  const bracket = /^(.+?)\s*<([^>]+)>\s*$/.exec(raw);
  if (bracket) {
    const email = bracket[2].trim();
    if (!isValidEmail(email)) return null;
    const displayName = bracket[1].trim().replace(/^["']|["']$/g, "");
    return { email, displayName: displayName || undefined };
  }

  if (!isValidEmail(raw)) return null;
  return { email: raw };
}

export function formatResendFromAddress(displayName: string, email: string): string {
  const safeName = displayName.trim().replace(/["<>]/g, "'").slice(0, 120);
  const safeEmail = email.trim();
  if (!safeName) return safeEmail;
  return `${safeName} <${safeEmail}>`;
}

export function emailDomain(addr: string): string | null {
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  return addr.slice(at + 1).trim().toLowerCase() || null;
}
