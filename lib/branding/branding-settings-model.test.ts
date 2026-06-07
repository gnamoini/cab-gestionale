import assert from "node:assert/strict";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  isBrandingCustomized,
  parseBrandingSettingsPayload,
} from "@/lib/branding/branding-settings-model";

{
  const parsed = parseBrandingSettingsPayload({
    primaryColor: "#2563eb",
    logoStoragePath: "branding/app-logo.png",
    updatedAt: "2026-06-07T12:00:00.000Z",
  });
  assert.equal(parsed.primaryColor, "#2563eb");
  assert.equal(parsed.logoStoragePath, "branding/app-logo.png");
  assert.ok(isBrandingCustomized(parsed));
}

{
  assert.equal(isBrandingCustomized(DEFAULT_CAB_BRANDING_SETTINGS), false);
  assert.equal(parseBrandingSettingsPayload(null).primaryColor, null);
}

console.log("branding-settings-model.test.ts: ok");
