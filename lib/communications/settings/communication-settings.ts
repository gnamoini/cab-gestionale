export const COMMUNICATIONS_PREFS_MODULE = "communications" as const;
export const COMMUNICATIONS_PREFS_KEY = "prefs" as const;

export type CommunicationSettings = {
  testMode: boolean;
  clientEmailEnabled: boolean;
  testEmailAddress: string;
  dryRunEnabled: boolean;
  /** Nome mostrato nel client di posta (es. «Autocompattatori CAB»). */
  senderDisplayName: string;
  /** Email From sul dominio Resend verificato (opzionale, stesso dominio di RESEND_FROM). */
  senderFromEmail: string;
  /** Reply-To per le risposte dei clienti. */
  replyToEmail: string;
};

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  testMode: true,
  clientEmailEnabled: false,
  testEmailAddress: "",
  dryRunEnabled: false,
  senderDisplayName: "",
  senderFromEmail: "",
  replyToEmail: "",
};

function strField(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function parseCommunicationSettings(raw: unknown): CommunicationSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COMMUNICATION_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    testMode: o.testMode !== false,
    clientEmailEnabled: o.clientEmailEnabled === true,
    testEmailAddress: strField(o.testEmailAddress),
    dryRunEnabled: o.dryRunEnabled === true,
    senderDisplayName: strField(o.senderDisplayName),
    senderFromEmail: strField(o.senderFromEmail),
    replyToEmail: strField(o.replyToEmail),
  };
}

/** Payload completo per `app_settings.value` — tutte le chiavi esplicite al salvataggio. */
export function communicationSettingsToPayload(settings: CommunicationSettings): Record<string, unknown> {
  return {
    testMode: settings.testMode,
    clientEmailEnabled: settings.clientEmailEnabled,
    testEmailAddress: settings.testEmailAddress.trim(),
    dryRunEnabled: settings.dryRunEnabled,
    senderDisplayName: settings.senderDisplayName.trim(),
    senderFromEmail: settings.senderFromEmail.trim(),
    replyToEmail: settings.replyToEmail.trim(),
  };
}

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export function readCommunicationSettingsFromRows(rows: AppSettingsRowLike[] | undefined): CommunicationSettings {
  if (!rows?.length) return { ...DEFAULT_COMMUNICATION_SETTINGS };
  const row = rows.find((r) => r.module === COMMUNICATIONS_PREFS_MODULE && r.key === COMMUNICATIONS_PREFS_KEY);
  return parseCommunicationSettings(row?.value);
}
