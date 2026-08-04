import "server-only";

import { createClient } from "@supabase/supabase-js";
import { APP_SETTINGS_COLUMNS } from "@/lib/db/table-select-columns";
import type { CommunicationEmailBranding } from "@/lib/communications/email/communication-email-branding-types";
import {
  buildCommunicationEmailBrandingFromSettings,
} from "@/lib/communications/email/communication-email-branding.server";
import {
  buildCommunicationSendEmailInput,
  readCommunicationPrefsFromRows,
  resolveCommunicationEmailEnvelope,
} from "@/lib/communications/email/communication-email-envelope";
import type { SendEmailInput } from "@/lib/communications/providers/email-transport";
import type { CommunicationSettings } from "@/lib/communications/settings/communication-settings";
import { fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

type AppSettingsRowLike = { module?: string | null; key?: string | null; value?: unknown };

export type { CommunicationEmailEnvelope } from "@/lib/communications/email/communication-email-envelope";
export {
  buildCommunicationSendEmailInput,
  resolveCommunicationEmailEnvelope,
} from "@/lib/communications/email/communication-email-envelope";

export async function loadAppSettingsRowsForCommunicationSend(): Promise<AppSettingsRowLike[]> {
  const env = assertSupabasePublicEnv();
  const serviceKey = readSupabaseServiceRoleKey();
  const client = serviceKey
    ? createClient(env.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : await createSupabaseServerUserClient();
  const { data } = await client.from("app_settings").select(APP_SETTINGS_COLUMNS);
  return (data ?? []) as AppSettingsRowLike[];
}

export async function prepareCommunicationEmailSendInput(input: {
  to: string;
  subject: string;
  text: string;
  settingsRows?: AppSettingsRowLike[];
  attachments?: SendEmailInput["attachments"];
}): Promise<SendEmailInput | null> {
  const commSettings = readCommunicationPrefsFromRows(input.settingsRows);
  const envelope = resolveCommunicationEmailEnvelope(commSettings, input.settingsRows);
  if (!envelope) return null;

  const brandingSettings = await fetchBrandingSettingsFromDb();
  const branding = await buildCommunicationEmailBrandingFromSettings(brandingSettings);

  return buildCommunicationSendEmailInput({
    to: input.to,
    subject: input.subject,
    text: input.text,
    commSettings,
    branding,
    envelope,
    attachments: input.attachments,
  });
}

export async function loadCommunicationSendBatchContext(
  settingsRows: AppSettingsRowLike[] | undefined,
): Promise<{
  branding: CommunicationEmailBranding;
  commSettings: CommunicationSettings;
}> {
  const brandingSettings = await fetchBrandingSettingsFromDb();
  return {
    branding: await buildCommunicationEmailBrandingFromSettings(brandingSettings),
    commSettings: readCommunicationPrefsFromRows(settingsRows),
  };
}
