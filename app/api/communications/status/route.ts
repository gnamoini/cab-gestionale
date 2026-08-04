import { NextResponse } from "next/server";
import { isResendConfigured } from "@/lib/env/resend";
import { emailDomain, parseResendFromEnv } from "@/lib/env/resend-from";
import { loadAppSettingsRowsForCommunicationSend, resolveCommunicationEmailEnvelope } from "@/lib/communications/email/communication-email-envelope.server";
import { readCommunicationSettingsFromRows } from "@/lib/communications/settings/communication-settings";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const allowed = await verifyServerPageRead("impostazioni");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso richiesto." }, { status: 403 });
  }

  const envFrom = parseResendFromEnv();
  const settingsRows = await loadAppSettingsRowsForCommunicationSend();
  const commSettings = readCommunicationSettingsFromRows(settingsRows);
  const envelope = resolveCommunicationEmailEnvelope(commSettings, settingsRows);

  return NextResponse.json({
    resendConfigured: isResendConfigured(),
    defaultFromEmail: envFrom?.email ?? null,
    defaultFromDomain: envFrom ? emailDomain(envFrom.email) : null,
    senderPreview: envelope
      ? { displayName: envelope.displayName, fromEmail: envelope.fromEmail, replyTo: envelope.replyTo ?? null }
      : null,
  });
}
