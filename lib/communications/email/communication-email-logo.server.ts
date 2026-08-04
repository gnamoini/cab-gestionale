import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  isBrandingCustomized,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import { fetchBrandingLogoBytes } from "@/lib/branding/get-branding-from-server";
import type {
  CommunicationEmailInlineLogo,
  CommunicationEmailLogoLayout,
} from "@/lib/communications/email/communication-email-branding-types";
import { COMM_EMAIL_LOGO_CID } from "@/lib/communications/email/communication-email-theme";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";

export type CommunicationEmailLogoAsset = {
  inline: CommunicationEmailInlineLogo;
  layout: CommunicationEmailLogoLayout;
};

async function readPwaIconBytes(): Promise<{ bytes: Buffer; contentType: string }> {
  const filePath = path.join(process.cwd(), "public", PWA_ICON_BASE_PATH, "icon-192x192.png");
  const bytes = await readFile(filePath);
  return { bytes, contentType: "image/png" };
}

/** Logo embedded CID — evita URL localhost / auth che i client email non caricano. */
export async function loadCommunicationEmailLogoAsset(
  settings: CabBrandingSettings,
): Promise<CommunicationEmailLogoAsset> {
  let bytes: Buffer;
  let contentType: string;
  let layout: CommunicationEmailLogoLayout;

  if (isBrandingCustomized(settings) && settings.logoStoragePath) {
    const loaded = await fetchBrandingLogoBytes(settings);
    bytes = loaded.bytes;
    contentType = loaded.contentType.includes("png") ? "image/png" : "image/png";
    layout = "wide";
  } else {
    const pwa = await readPwaIconBytes();
    bytes = pwa.bytes;
    contentType = pwa.contentType;
    layout = "square";
  }

  const ext = contentType.includes("png") ? "png" : "png";
  return {
    layout,
    inline: {
      contentId: COMM_EMAIL_LOGO_CID,
      filename: `cab-logo-${layout}.${ext}`,
      content: new Uint8Array(bytes),
      contentType,
    },
  };
}
