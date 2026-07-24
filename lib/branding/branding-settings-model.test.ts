import assert from "node:assert/strict";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  DEFAULT_COMPANY_WEBSITE_URL,
  isBrandingCustomized,
  normalizeCompanyWebsiteUrl,
  parseBrandingSettingsPayload,
  resolveClienteLabelQrUrl,
} from "@/lib/branding/branding-settings-model";

{
  const parsed = parseBrandingSettingsPayload({
    primaryColor: "#2563eb",
    logoStoragePath: "branding/app-logo.png",
    companyWebsiteUrl: "https://www.example.it",
    updatedAt: "2026-06-07T12:00:00.000Z",
  });
  assert.equal(parsed.primaryColor, "#2563eb");
  assert.equal(parsed.logoStoragePath, "branding/app-logo.png");
  assert.equal(parsed.companyWebsiteUrl, "https://www.example.it");
  assert.ok(isBrandingCustomized(parsed));
}

{
  assert.equal(parseBrandingSettingsPayload(null).companyWebsiteUrl, DEFAULT_COMPANY_WEBSITE_URL);
  assert.equal(normalizeCompanyWebsiteUrl("www.example.it"), "https://www.example.it");
  assert.equal(resolveClienteLabelQrUrl(DEFAULT_CAB_BRANDING_SETTINGS), DEFAULT_COMPANY_WEBSITE_URL);
  assert.equal(isBrandingCustomized(DEFAULT_CAB_BRANDING_SETTINGS), false);
  assert.equal(parseBrandingSettingsPayload(null).primaryColor, null);
}

console.log("branding-settings-model.test.ts: ok");
