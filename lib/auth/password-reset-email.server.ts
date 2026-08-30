import "server-only";

import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import {
  buildPasswordResetEmailText,
  PASSWORD_RESET_EMAIL_CTA_LABEL,
  PASSWORD_RESET_EMAIL_SUBJECT,
} from "@/lib/auth/password-reset-email-content";
import {
  sendPasswordResetEmail,
  type PasswordResetResult,
} from "@/lib/auth/password-reset";
import { emailChannelProvider } from "@/lib/communications/channels/email-channel-provider";
import {
  loadAppSettingsRowsForCommunicationSend,
  prepareCommunicationEmailSendInput,
} from "@/lib/communications/email/communication-email-envelope.server";
import {
  readCommunicationPrefsFromRows,
  resolveCommunicationEmailEnvelope,
} from "@/lib/communications/email/communication-email-envelope";
import { createResendEmailTransport } from "@/lib/communications/providers/resend-email-provider.server";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { isResendConfigured } from "@/lib/env/resend";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { isValidEmail } from "@/lib/validation/email";
import { createClient } from "@supabase/supabase-js";

const PASSWORD_RESET_LAYOUT = {
  headerTagline: "Sicurezza account",
  footerNote:
    "Se non hai richiesto il reset, ignora questa email. Il link scade automaticamente dopo 1 ora.",
} as const;

function isRecoveryUserMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("user not found") ||
    m.includes("not registered") ||
    m.includes("no user") ||
    m.includes("unable to find user")
  );
}

/** Reset password con layout CAB via Resend; fallback Supabase Auth se Resend assente. */
export async function sendBrandedPasswordResetEmail(input: {
  email: string;
  redirectTo: string;
}): Promise<PasswordResetResult> {
  const email = input.email.trim();
  if (!isValidEmail(email)) {
    return { ok: false, message: "Email non valida." };
  }

  if (!isResendConfigured()) {
    const env = assertSupabasePublicEnv();
    const anon = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return sendPasswordResetEmail(anon, email, input.redirectTo);
  }

  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }

  const env = assertSupabasePublicEnv();
  const admin = createServiceAdminClient(env.url, serviceKey);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: input.redirectTo },
  });

  if (error) {
    if (isRecoveryUserMissingError(error.message)) {
      return { ok: true };
    }
    console.warn("[auth] password reset generateLink failed:", error.message);
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }

  const resetUrl = data.properties?.action_link?.trim();
  if (!resetUrl) {
    console.warn("[auth] password reset generateLink: missing action_link");
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }

  const transport = createResendEmailTransport();
  if (!transport) {
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }

  const settingsRows = await loadAppSettingsRowsForCommunicationSend();
  const commSettings = readCommunicationPrefsFromRows(settingsRows);
  const envelope = resolveCommunicationEmailEnvelope(commSettings, settingsRows);
  const displayName = envelope?.displayName ?? "";

  const sendInput = await prepareCommunicationEmailSendInput({
    to: email,
    subject: PASSWORD_RESET_EMAIL_SUBJECT,
    text: buildPasswordResetEmailText({ displayName, resetUrl }),
    settingsRows,
    layout: {
      ...PASSWORD_RESET_LAYOUT,
      ctaButton: { label: PASSWORD_RESET_EMAIL_CTA_LABEL, href: resetUrl },
    },
  });

  if (!sendInput) {
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }

  const result = await emailChannelProvider.deliver({ transport, input: sendInput });
  if (!result.ok) {
    console.warn("[auth] password reset email send failed:", result.error);
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }

  return { ok: true };
}
