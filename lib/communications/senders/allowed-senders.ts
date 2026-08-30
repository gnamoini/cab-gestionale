import { CLIENT_PORTAL_CONTACT } from "@/lib/lavorazioni/client-portal-contact";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import {
  readCommunicationSettingsFromRows,
  type CommunicationSettings,
} from "@/lib/communications/settings/communication-settings";
import { readOfficinaDestinatarioOrdiniFromRows } from "@/lib/officina/officina-destinatario-ordini";
import { emailDomain, formatResendFromAddress, parseResendFromEnv } from "@/lib/env/resend-from";
import { isValidEmail } from "@/lib/validation/email";

export type AllowedSender = {
  email: string;
  displayName: string;
};

export const SUPPLIER_ORDER_DEFAULT_FROM_EMAIL = CLIENT_PORTAL_CONTACT.email;

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

function senderKey(s: AllowedSender): string {
  return `${s.displayName.trim().toLowerCase()}|${s.email.trim().toLowerCase()}`;
}

function pushUnique(list: AllowedSender[], sender: AllowedSender): void {
  const email = sender.email.trim();
  if (!isValidEmail(email)) return;
  const normalized: AllowedSender = {
    email,
    displayName: sender.displayName.trim() || email,
  };
  if (list.some((s) => senderKey(s) === senderKey(normalized))) return;
  list.push(normalized);
}

function resolveDisplayName(commSettings: CommunicationSettings, settingsRows?: AppSettingsRowLike[]): string {
  const officina = readOfficinaDestinatarioOrdiniFromRows(settingsRows);
  return (
    commSettings.supplierOrderSender.displayName.trim() ||
    commSettings.senderDisplayName.trim() ||
    officina.label.trim() ||
    parseResendFromEnv()?.displayName ||
    CAB_APP_PRODUCT_NAME
  );
}

function senderFromSettingsEmail(
  email: string,
  displayName: string,
  envFromEmail: string,
): AllowedSender | null {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) return null;
  const envDomain = emailDomain(envFromEmail);
  const customDomain = emailDomain(trimmed);
  if (envDomain && customDomain !== envDomain) return null;
  return { email: trimmed, displayName: displayName.trim() || trimmed };
}

/** Mittenti autorizzati per ordini fornitori (dominio Resend verificato). */
export function resolveSupplierOrderAllowedSenders(
  commSettings: CommunicationSettings,
  settingsRows?: AppSettingsRowLike[],
): AllowedSender[] {
  const envFrom = parseResendFromEnv();
  if (!envFrom) return [];

  const displayName = resolveDisplayName(commSettings, settingsRows);
  const out: AllowedSender[] = [];

  const dedicated = commSettings.supplierOrderSender;
  const dedicatedSender = senderFromSettingsEmail(
    dedicated.fromEmail.trim() || SUPPLIER_ORDER_DEFAULT_FROM_EMAIL,
    dedicated.displayName.trim() || displayName,
    envFrom.email,
  );
  if (dedicatedSender) pushUnique(out, dedicatedSender);

  const globalSender = senderFromSettingsEmail(
    commSettings.senderFromEmail.trim() || envFrom.email,
    commSettings.senderDisplayName.trim() || displayName,
    envFrom.email,
  );
  if (globalSender) pushUnique(out, globalSender);

  pushUnique(out, { email: envFrom.email, displayName: envFrom.displayName || displayName });

  return out;
}

export function resolveSupplierOrderDefaultSender(
  commSettings: CommunicationSettings,
  settingsRows?: AppSettingsRowLike[],
): AllowedSender | null {
  const allowed = resolveSupplierOrderAllowedSenders(commSettings, settingsRows);
  if (!allowed.length) return null;
  const preferred = allowed.find((s) => s.email.toLowerCase() === SUPPLIER_ORDER_DEFAULT_FROM_EMAIL.toLowerCase());
  return preferred ?? allowed[0]!;
}

export function assertAllowedSender(
  sender: Pick<AllowedSender, "email" | "displayName">,
  allowed: AllowedSender[],
): AllowedSender {
  const email = sender.email.trim().toLowerCase();
  const match = allowed.find((s) => s.email.toLowerCase() === email);
  if (!match) {
    throw new Error("Mittente non autorizzato.");
  }
  return {
    email: match.email,
    displayName: sender.displayName.trim() || match.displayName,
  };
}

export function formatAllowedSenderLabel(sender: AllowedSender): string {
  return `${sender.displayName} · ${sender.email}`;
}

export function allowedSenderToFromHeader(sender: AllowedSender): string {
  return formatResendFromAddress(sender.displayName, sender.email);
}

export function readSupplierOrderAllowedSendersFromRows(
  settingsRows?: AppSettingsRowLike[],
): AllowedSender[] {
  return resolveSupplierOrderAllowedSenders(readCommunicationSettingsFromRows(settingsRows), settingsRows);
}
