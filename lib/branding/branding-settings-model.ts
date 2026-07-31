import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { CAB_DEFAULT_PRIMARY } from "@/lib/theme/cab-branding-defaults";

export const DEFAULT_COMPANY_WEBSITE_URL = "https://www.autocompattatori.it";

export type CabBrandingSettings = {
  primaryColor: string | null;
  logoStoragePath: string | null;
  companyWebsiteUrl: string;
  updatedAt?: string | null;
};

export const DEFAULT_CAB_BRANDING_SETTINGS: CabBrandingSettings = {
  primaryColor: null,
  logoStoragePath: null,
  companyWebsiteUrl: DEFAULT_COMPANY_WEBSITE_URL,
  updatedAt: null,
};

/** Normalizza URL sito aziendale per QR etichette cliente. */
export function normalizeCompanyWebsiteUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return DEFAULT_COMPANY_WEBSITE_URL;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^https?:\/\//i, "")}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname) return DEFAULT_COMPANY_WEBSITE_URL;
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_COMPANY_WEBSITE_URL;
  }
}

export function isValidCompanyWebsiteUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^https?:\/\//i, "")}`;
  try {
    const url = new URL(withScheme);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function resolveClienteLabelQrUrl(settings: CabBrandingSettings | null | undefined): string {
  return normalizeCompanyWebsiteUrl(settings?.companyWebsiteUrl);
}

/** Host sito per caption etichetta cliente (es. www.autocompattatori.it). */
export function companyWebsiteDisplayHost(url: string = DEFAULT_COMPANY_WEBSITE_URL): string {
  try {
    return new URL(url).host;
  } catch {
    return new URL(DEFAULT_COMPANY_WEBSITE_URL).host;
  }
}

export function parseBrandingSettingsPayload(raw: unknown): CabBrandingSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CAB_BRANDING_SETTINGS };
  const o = raw as Record<string, unknown>;
  const primaryRaw = typeof o.primaryColor === "string" ? o.primaryColor : null;
  const primaryColor = primaryRaw ? normalizeHex(primaryRaw) : null;
  const logoStoragePath =
    typeof o.logoStoragePath === "string" && o.logoStoragePath.trim()
      ? o.logoStoragePath.trim()
      : null;
  const updatedAt = typeof o.updatedAt === "string" && o.updatedAt.trim() ? o.updatedAt.trim() : null;
  const companyWebsiteUrl = normalizeCompanyWebsiteUrl(
    typeof o.companyWebsiteUrl === "string" ? o.companyWebsiteUrl : null,
  );
  return { primaryColor, logoStoragePath, companyWebsiteUrl, updatedAt };
}

export function isBrandingCustomized(settings: CabBrandingSettings | null | undefined): boolean {
  if (!settings) return false;
  return (
    settings.primaryColor != null ||
    settings.logoStoragePath != null ||
    normalizeCompanyWebsiteUrl(settings.companyWebsiteUrl) !== DEFAULT_COMPANY_WEBSITE_URL
  );
}

export function effectivePrimaryColor(settings: CabBrandingSettings | null | undefined): string {
  return settings?.primaryColor ?? CAB_DEFAULT_PRIMARY;
}

export function brandingSettingsToPayload(settings: CabBrandingSettings): Record<string, unknown> {
  return {
    primaryColor: settings.primaryColor,
    logoStoragePath: settings.logoStoragePath,
    companyWebsiteUrl: normalizeCompanyWebsiteUrl(settings.companyWebsiteUrl),
    updatedAt: settings.updatedAt ?? new Date().toISOString(),
  };
}

export function brandingCacheVersion(settings: CabBrandingSettings | null | undefined): string {
  if (!settings?.updatedAt) return "default";
  return settings.updatedAt;
}
