import assert from "node:assert/strict";
import { validateBrandingLogoFile, BRANDING_LOGO_MAX_BYTES } from "@/lib/branding/branding-logo-validation";

{
  const ok = validateBrandingLogoFile({
    type: "image/png",
    size: 1024,
  } as File);
  assert.equal(ok.ok, true);
}

{
  const bad = validateBrandingLogoFile({
    type: "application/pdf",
    size: 1024,
  } as File);
  assert.equal(bad.ok, false);
}

{
  const heavy = validateBrandingLogoFile({
    type: "image/png",
    size: BRANDING_LOGO_MAX_BYTES + 1,
  } as File);
  assert.equal(heavy.ok, false);
}

console.log("branding-logo-validation.test.ts: ok");
