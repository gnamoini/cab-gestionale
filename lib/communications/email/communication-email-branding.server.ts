import "server-only";

import {
  companyWebsiteDisplayHost,
  effectivePrimaryColor,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import { fetchBrandingSettingsFromDb } from "@/lib/branding/get-branding-from-server";
import type { CommunicationEmailBranding } from "@/lib/communications/email/communication-email-branding-types";
import { loadCommunicationEmailLogoAsset } from "@/lib/communications/email/communication-email-logo.server";
import { COMM_EMAIL_LOGO_CID } from "@/lib/communications/email/communication-email-theme";
import { canonicalSiteOriginString } from "@/lib/core/site-origin";

function originDisplayHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

export async function buildCommunicationEmailBrandingFromSettings(
  settings: CabBrandingSettings,
  request?: Request,
): Promise<CommunicationEmailBranding> {
  const logoAsset = await loadCommunicationEmailLogoAsset(settings);
  const websiteUrl = settings.companyWebsiteUrl;
  const gestionaleAppUrl = canonicalSiteOriginString(request);

  return {
    logoSrc: `cid:${COMM_EMAIL_LOGO_CID}`,
    logoLayout: logoAsset.layout,
    inlineLogo: logoAsset.inline,
    primaryColor: effectivePrimaryColor(settings),
    websiteUrl,
    websiteHost: companyWebsiteDisplayHost(websiteUrl),
    gestionaleAppUrl,
    gestionaleAppHost: originDisplayHost(gestionaleAppUrl),
  };
}

export async function loadCommunicationEmailBranding(): Promise<CommunicationEmailBranding> {
  const settings = await fetchBrandingSettingsFromDb();
  return buildCommunicationEmailBrandingFromSettings(settings);
}
