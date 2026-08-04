import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { buildCommunicationEmailHtml } from "@/lib/communications/email/communication-email-layout";
import type { CommunicationEmailBranding } from "@/lib/communications/email/communication-email-branding-types";
import type { SendEmailInput } from "@/lib/communications/providers/email-transport";
import {
  readCommunicationSettingsFromRows,
  type CommunicationSettings,
} from "@/lib/communications/settings/communication-settings";
import { emailDomain, formatResendFromAddress, parseResendFromEnv } from "@/lib/env/resend-from";
import { isValidEmail } from "@/lib/validation/email";
import { readOfficinaDestinatarioOrdiniFromRows } from "@/lib/officina/officina-destinatario-ordini";

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export type CommunicationEmailEnvelope = {
  from: string;
  replyTo?: string;
  displayName: string;
  fromEmail: string;
};

export function resolveCommunicationEmailEnvelope(
  commSettings: CommunicationSettings,
  settingsRows?: AppSettingsRowLike[],
): CommunicationEmailEnvelope | null {
  const envFrom = parseResendFromEnv();
  if (!envFrom) return null;

  const officina = readOfficinaDestinatarioOrdiniFromRows(settingsRows);
  const displayName =
    commSettings.senderDisplayName.trim() ||
    officina.label.trim() ||
    envFrom.displayName ||
    CAB_APP_PRODUCT_NAME;

  let fromEmail = envFrom.email;
  const customFrom = commSettings.senderFromEmail.trim();
  if (customFrom && isValidEmail(customFrom)) {
    const envDomain = emailDomain(envFrom.email);
    const customDomain = emailDomain(customFrom);
    if (envDomain && customDomain === envDomain) {
      fromEmail = customFrom;
    }
  }

  const replyRaw = commSettings.replyToEmail.trim();
  const replyTo = isValidEmail(replyRaw) ? replyRaw : undefined;

  return {
    from: formatResendFromAddress(displayName, fromEmail),
    replyTo,
    displayName,
    fromEmail,
  };
}

export function buildCommunicationSendEmailInput(input: {
  to: string;
  subject: string;
  text: string;
  commSettings: CommunicationSettings;
  branding: CommunicationEmailBranding;
  envelope: CommunicationEmailEnvelope;
  attachments?: SendEmailInput["attachments"];
}): SendEmailInput {
  const html = buildCommunicationEmailHtml({
    displayName: input.envelope.displayName,
    bodyText: input.text,
    logoSrc: input.branding.logoSrc,
    logoLayout: input.branding.logoLayout,
    primaryColor: input.branding.primaryColor,
    websiteUrl: input.branding.websiteUrl,
    websiteHost: input.branding.websiteHost,
    gestionaleAppUrl: input.branding.gestionaleAppUrl,
    gestionaleAppHost: input.branding.gestionaleAppHost,
  });

  const inlineAttachments = input.branding.inlineLogo
    ? [
        {
          contentId: input.branding.inlineLogo.contentId,
          filename: input.branding.inlineLogo.filename,
          content: input.branding.inlineLogo.content,
          contentType: input.branding.inlineLogo.contentType,
        },
      ]
    : undefined;

  return {
    to: input.to,
    subject: input.subject,
    text: input.text,
    html,
    from: input.envelope.from,
    replyTo: input.envelope.replyTo,
    inlineAttachments,
    attachments: input.attachments,
  };
}

export function readCommunicationPrefsFromRows(settingsRows: AppSettingsRowLike[] | undefined): CommunicationSettings {
  return readCommunicationSettingsFromRows(settingsRows);
}
